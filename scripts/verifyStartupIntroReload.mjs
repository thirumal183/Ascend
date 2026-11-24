import { spawn } from 'node:child_process';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9225;
const SCREENSHOT_DIR = join(process.cwd(), 'screenshots');
const BRAIN_DIR = "C:\\Users\\thiru\\.gemini\\antigravity\\brain\\16147666-f616-4858-bd53-467ace061f48\\screenshots";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(new Error(JSON.stringify(data.error)));
          else resolve(data.result);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await mkdir(BRAIN_DIR, { recursive: true });

  const tempProfileDir = join(process.env.TEMP, `chrome-reload-verify-${Date.now()}`);
  console.log('Spawning Chrome on port', PORT);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  let versionData = null;
  for (let i = 0; i < 20; i++) {
    await wait(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionData) {
    chromeProc.kill();
    throw new Error('Chrome did not start or port not reachable');
  }

  const browserWs = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((resolve) => (browserWs.onopen = resolve));

  const { targetId } = await sendCDP(browserWs, 'Target.createTarget', {
    url: 'http://localhost:3000',
  });
  const { sessionId } = await sendCDP(browserWs, 'Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.id === id) {
            browserWs.removeEventListener('message', handler);
            if (data.error) reject(new Error(JSON.stringify(data.error)));
            else resolve(data.result);
          }
        } catch {}
      };
      browserWs.addEventListener('message', handler);
      browserWs.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');

  const reloadResults = [];

  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Test Cycle ${i}: Loading / Reloading http://localhost:3000 ---`);
    if (i === 1) {
      await sendSession('Page.navigate', { url: 'http://localhost:3000' });
    } else {
      await sendSession('Page.reload');
    }

    // Wait 900ms into the animation (Stage 2: Logo + Wordmark visible)
    await wait(900);

    const checkIntro = await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          const introEl = document.querySelector('[aria-label="ASCEND Startup Intro"]');
          const isFading = introEl ? introEl.classList.contains('opacity-0') : false;
          const wordmark = document.querySelector('h1')?.textContent || '';
          const hasWordmark = wordmark.includes('ASCEND');
          return {
            hasIntroElement: Boolean(introEl),
            isFadingOut: isFading,
            wordmarkText: wordmark,
            hasAscendWordmark: hasWordmark,
          };
        })()
      `,
      returnByValue: true,
    });

    console.log(`Cycle ${i} Animation Inspection:`, checkIntro.result.value);

    // Capture screenshot of the playing intro
    const filename = `reload-${i}-intro.png`;
    const ss = await sendSession('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(ss.data, 'base64');
    await writeFile(join(SCREENSHOT_DIR, filename), buf);
    await copyFile(join(SCREENSHOT_DIR, filename), join(BRAIN_DIR, filename));
    console.log(`Cycle ${i} Screenshot saved to ${filename} (${buf.length} bytes)`);

    reloadResults.push({
      cycle: i,
      played: checkIntro.result.value.hasIntroElement,
      hasAscend: checkIntro.result.value.hasAscendWordmark,
    });

    // Wait for animation to finish before next cycle
    await wait(2400);
  }

  console.log('\n=== All 3 Reload Verification Cycles Completed Successfully ===');
  console.table(reloadResults);

  chromeProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error during reload verification:', err);
  process.exit(1);
});
