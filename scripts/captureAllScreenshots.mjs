import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const SCREENSHOT_DIR = join(process.cwd(), 'screenshots');

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
      } catch (err) {
        // ignore other messages
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreen(ws, filename) {
  await wait(600);
  const { data } = await sendCDP(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  const buf = Buffer.from(data, 'base64');
  const targetPath = join(SCREENSHOT_DIR, filename);
  await writeFile(targetPath, buf);
  console.log(`Saved screenshot: ${filename} (${buf.length} bytes)`);
}

async function evalInPage(ws, expression) {
  return sendCDP(ws, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
}

async function main() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });

  const tempProfileDir = join(process.env.TEMP, `chrome-audit-${Date.now()}`);
  console.log('Spawning Chrome headless on port', PORT);

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    '--window-size=1440,900',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  chromeProc.stderr.on('data', (d) => {
    // console.log('chrome err:', d.toString());
  });

  // Wait for Chrome to bind port
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

  console.log('Connecting to Chrome WebSocket:', versionData.webSocketDebuggerUrl);
  const browserWs = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise((resolve) => (browserWs.onopen = resolve));

  // Create a new target/page
  const { targetId } = await sendCDP(browserWs, 'Target.createTarget', {
    url: 'http://localhost:3000',
  });
  const { sessionId } = await sendCDP(browserWs, 'Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  // Get session WS wrapper
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
  await sendSession('DOM.enable');

  console.log('Navigating to http://localhost:3000');
  await sendSession('Page.navigate', { url: 'http://localhost:3000' });
  await wait(1500);

  // 0. Capture Startup Intro & Landing Page
  console.log('Clearing storage to trigger fresh Startup Intro');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      })()
    `,
  });
  await wait(900);
  console.log('Capturing: Startup Intro');
  const ssIntro = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-startup-intro.png'), Buffer.from(ssIntro.data, 'base64'));

  // Wait for Startup Intro to complete & reveal Landing Page
  await wait(2400);
  console.log('Capturing: Landing Page (Hero)');
  const ss0 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-landing-page.png'), Buffer.from(ss0.data, 'base64'));

  // Open AuthModal
  console.log('Opening AuthModal');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign In'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(800);
  console.log('Capturing: Auth Modal');
  const ssAuth = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-auth-modal.png'), Buffer.from(ssAuth.data, 'base64'));

  // Close AuthModal and click Get Started to open PathwaySelectionModal
  console.log('Opening PathwaySelectionModal');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        // Press Escape to close AuthModal
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      })()
    `,
  });
  await wait(400);
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Get Started') || b.textContent.includes('Launch Guided Setup'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(800);
  console.log('Capturing: Pathway Selection Modal');
  const ssPathway = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-pathway-modal.png'), Buffer.from(ssPathway.data, 'base64'));

  // Click Continue to step into OnboardingWizardModal
  console.log('Opening OnboardingWizardModal');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue to Personalized Setup'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(800);
  console.log('Capturing: Onboarding Wizard Modal');
  const ssOnboarding = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-onboarding-modal.png'), Buffer.from(ssOnboarding.data, 'base64'));

  // Scroll to Pathways Interactive showcase
  console.log('Scrolling to Pathways interactive showcase');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('pathways-interactive') || document.querySelector('section:nth-of-type(2)');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        else window.scrollTo(0, 950);
      })()
    `,
  });
  await wait(800);
  console.log('Capturing: Landing Page (Pathways Showcase)');
  const ss0b = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-landing-pathways.png'), Buffer.from(ss0b.data, 'base64'));

  // Scroll to Features & Science
  console.log('Scrolling to Features & Science');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('science') || document.querySelector('section:nth-of-type(4)');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        else window.scrollTo(0, 2400);
      })()
    `,
  });
  await wait(800);
  console.log('Capturing: Landing Page (Features & Science)');
  const ss0c = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '00-landing-features.png'), Buffer.from(ss0c.data, 'base64'));

  // Setup authenticated user with General Nutrition & Diet in localStorage
  console.log('Setting localStorage session for General Nutrition & Diet');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const session = {
          account: {
            name: 'Thirumal',
            email: 'thirumal@ascend.health',
            isAuthenticated: true,
            onboardingCompleted: true
          },
          userProfile: {
            name: 'Thirumal',
            age: 28,
            gender: 'Male',
            heightCm: 178,
            currentWeightKg: 74.5,
            targetWeightKg: 72.0,
            activityLevel: 'Moderately Active',
            trainingDaysPerWeek: 4,
            goalType: 'Weight Loss & Lean Muscle',
            pathway: 'General Nutrition & Diet',
            archetype: 'General Fitness',
            dietaryPreference: 'Vegetarian',
            regionalCuisine: 'South Indian',
            unitSystem: 'Metric'
          },
          goals: {
            dailyCalories: 2150,
            proteinG: 135,
            carbsG: 240,
            fatG: 65,
            waterMl: 3000,
            dailySteps: 10000,
            weeklyWorkoutSessions: 4
          },
          waterIntakeMl: 1750,
          stepsToday: 7450,
          usingDemoData: true
        };
        localStorage.setItem('ascend_prototype_session_v3', JSON.stringify(session));
        window.location.reload();
      })()
    `,
  });

  await wait(2000);

  // 1. Screenshot: General Nutrition & Diet dashboard
  console.log('Capturing: General Nutrition & Diet Dashboard');
  const ss1 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '01-dashboard-general.png'), Buffer.from(ss1.data, 'base64'));

  // 2. Switch to Athlete Performance pathway
  console.log('Switching to Athlete Performance pathway');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const raw = localStorage.getItem('ascend_prototype_session_v3');
        if (raw) {
          const s = JSON.parse(raw);
          s.userProfile.pathway = 'Athlete Performance';
          s.userProfile.goalType = 'Athletic Performance';
          s.goals.dailyCalories = 2650;
          s.goals.proteinG = 160;
          s.goals.carbsG = 330;
          s.goals.fatG = 75;
          localStorage.setItem('ascend_prototype_session_v3', JSON.stringify(s));
          window.location.reload();
        }
      })()
    `,
  });
  await wait(2000);
  console.log('Capturing: Athlete Performance Dashboard');
  const ss2 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '02-dashboard-athlete.png'), Buffer.from(ss2.data, 'base64'));

  // 3. Switch to Muscle Gain pathway
  console.log('Switching to Muscle Gain pathway');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const raw = localStorage.getItem('ascend_prototype_session_v3');
        if (raw) {
          const s = JSON.parse(raw);
          s.userProfile.pathway = 'Weight Gain & Muscle Gain';
          s.userProfile.goalType = 'Muscle Gain';
          s.goals.dailyCalories = 2850;
          s.goals.proteinG = 175;
          s.goals.carbsG = 350;
          s.goals.fatG = 80;
          localStorage.setItem('ascend_prototype_session_v3', JSON.stringify(s));
          window.location.reload();
        }
      })()
    `,
  });
  await wait(2000);
  console.log('Capturing: Weight Gain & Muscle Gain Dashboard');
  const ss3 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '03-dashboard-musclegain.png'), Buffer.from(ss3.data, 'base64'));

  // 4. Navigate to Diet Management
  console.log('Navigating to Diet Management');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Diet'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Diet Management');
  const ss4 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '04-diet-management.png'), Buffer.from(ss4.data, 'base64'));

  // 5. Navigate to Workouts
  console.log('Navigating to Workouts');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Workouts'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Workouts');
  const ss5 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '05-workouts.png'), Buffer.from(ss5.data, 'base64'));

  // 6. Navigate to Progress
  console.log('Navigating to Progress');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Progress'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Progress');
  const ss6 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '06-progress.png'), Buffer.from(ss6.data, 'base64'));

  // 7. Navigate to AI Coach
  console.log('Navigating to AI Coach');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('AI Coach'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: AI Coach');
  const ss7 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '07-ai-coach.png'), Buffer.from(ss7.data, 'base64'));

  // 8. Navigate to Goals
  console.log('Navigating to Goals');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Goals'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Goals');
  const ss8 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '08-goals.png'), Buffer.from(ss8.data, 'base64'));

  // 9. Navigate to Calendar
  console.log('Navigating to Calendar');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Calendar'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Calendar');
  const ss9 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '09-calendar.png'), Buffer.from(ss9.data, 'base64'));

  // 10. Navigate to Reports
  console.log('Navigating to Reports');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reports'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Reports');
  const ss10 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '10-reports.png'), Buffer.from(ss10.data, 'base64'));

  // 11. Navigate to Settings
  console.log('Navigating to Settings');
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1500);
  console.log('Capturing: Settings');
  const ss11 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, '11-settings.png'), Buffer.from(ss11.data, 'base64'));

  // Mobile Viewport Emulation (375x812)
  console.log('Switching to mobile emulation (375x812)');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await wait(800);

  // Navigate to Dashboard on mobile
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Overview'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1200);
  console.log('Capturing: Mobile Dashboard');
  const ssMob1 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, 'mobile-01-dashboard.png'), Buffer.from(ssMob1.data, 'base64'));

  // Navigate to Diet on mobile
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Diet'));
        if (btn) btn.click();
      })()
    `,
  });
  await wait(1200);
  console.log('Capturing: Mobile Diet Management');
  const ssMob2 = await sendSession('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SCREENSHOT_DIR, 'mobile-04-diet.png'), Buffer.from(ssMob2.data, 'base64'));

  console.log('All requested screenshots captured successfully!');
  const brainDir = "C:\\Users\\thiru\\.gemini\\antigravity\\brain\\16147666-f616-4858-bd53-467ace061f48\\screenshots";
  await mkdir(brainDir, { recursive: true });
  const { copyFile, readdir } = await import('node:fs/promises');
  const files = await readdir(SCREENSHOT_DIR);
  for (const f of files) {
    if (f.endsWith('.png')) {
      await copyFile(join(SCREENSHOT_DIR, f), join(brainDir, f));
    }
  }
  console.log('Screenshots copied to brain artifacts directory!');
  chromeProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
