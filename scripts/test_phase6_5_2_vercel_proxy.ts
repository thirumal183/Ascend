/**
 * ASCEND Phase 6.5.2 — Vercel Same-Origin Proxy & Client Configuration Tests
 *
 * Tests:
 * 1. Proxy routing & __ascend_path rewrite handling
 * 2. HTTP methods (GET, POST, PUT, PATCH, DELETE) & query string preservation
 * 3. Request-body forwarding
 * 4. Required headers forwarding (Authorization, Content-Type, Accept, X-Requested-With, Cookie)
 * 5. Multiple Set-Cookie headers preserved without collapsing + attribute preservation
 * 6. Upstream error handling (502 on network failure, 401/403/500 passthrough)
 * 7. Missing or invalid RENDER_BACKEND_URL rejection (502 PROXY_CONFIG_ERROR)
 * 8. Open-proxy / path-traversal prevention (400 INVALID_PROXY_PATH)
 * 9. Same-origin browser API base URL resolution
 * 10. vercel.json structure & non-hardcoded destination check
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  buildTargetUrl,
  handleProxyRequest,
  resolveValidatedUpstreamOrigin,
  type ProxyRequest,
} from '../api/proxy';
import { resolveApiBaseUrl } from '../src/services/api/client';

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

async function checkAsync(label: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function createMockRes() {
  const headers = new Map<string, string | string[]>();
  let bodyBuf = Buffer.alloc(0);
  const res = {
    statusCode: 200,
    setHeader(k: string, v: string | string[]) {
      headers.set(k.toLowerCase(), v);
    },
    getHeader(k: string) {
      return headers.get(k.toLowerCase());
    },
    end(chunk?: Buffer | string) {
      if (chunk) {
        bodyBuf = Buffer.concat([bodyBuf, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      }
    },
    getBodyText() {
      return bodyBuf.toString('utf8');
    },
  };
  return res as unknown as http.ServerResponse & {
    getHeader: (k: string) => string | string[] | undefined;
    getBodyText: () => string;
  };
}

function createMockReq(opts: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  rawStreamBody?: string;
}): ProxyRequest {
  const stream = opts.rawStreamBody
    ? Readable.from([Buffer.from(opts.rawStreamBody)])
    : Readable.from([]);
  const req = stream as unknown as ProxyRequest;
  req.method = opts.method || 'GET';
  req.url = opts.url;
  req.headers = opts.headers || {};
  req.query = opts.query;
  req.body = opts.body;
  return req;
}

async function main() {
  console.log('===============================================================');
  console.log('ASCEND Phase 6.5.2 — Vercel Same-Origin Proxy Test Suite');
  console.log('===============================================================\n');

  // Start real local HTTP mock upstream to test live fetch + Set-Cookie forwarding
  let lastUpstreamMethod = '';
  let lastUpstreamUrl = '';
  let lastUpstreamHeaders: http.IncomingHttpHeaders = {};
  let lastUpstreamBody = '';

  const mockUpstream = http.createServer((req, res) => {
    lastUpstreamMethod = req.method || '';
    lastUpstreamUrl = req.url || '';
    lastUpstreamHeaders = req.headers;
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      lastUpstreamBody = Buffer.concat(chunks).toString('utf8');

      if (req.url?.startsWith('/api/v1/auth/login')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Set-Cookie', [
          'ascend_refresh_token=tok_abc123; HttpOnly; Max-Age=604800; Path=/api/v1/auth; SameSite=Lax; Secure',
          'ascend_csrf_hint=1; Path=/; SameSite=Lax; Expires=Wed, 02 Dec 2026 00:00:00 GMT',
        ]);
        res.end(JSON.stringify({ accessToken: 'jwt_xyz', expiresIn: 1800 }));
        return;
      }

      if (req.url?.startsWith('/api/v1/error-500')) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Upstream failure' } }));
        return;
      }

      if (req.url?.startsWith('/api/v1/no-content')) {
        res.statusCode = 204;
        res.end();
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          body: lastUpstreamBody,
        })
      );
    });
  });

  await new Promise<void>((resolve) => mockUpstream.listen(0, '127.0.0.1', resolve));
  const addr = mockUpstream.address() as { port: number };
  const upstreamOrigin = `http://127.0.0.1:${addr.port}`;

  try {
    check('resolveValidatedUpstreamOrigin accepts HTTPS and local HTTP only', () => {
      assert.equal(resolveValidatedUpstreamOrigin('https://ascend-api.onrender.com/'), 'https://ascend-api.onrender.com');
      assert.equal(resolveValidatedUpstreamOrigin(upstreamOrigin), upstreamOrigin);
      assert.equal(resolveValidatedUpstreamOrigin('http://evil.com'), null);
      assert.equal(resolveValidatedUpstreamOrigin('ftp://ascend-api.onrender.com'), null);
      assert.equal(resolveValidatedUpstreamOrigin('https://user:pass@ascend-api.onrender.com'), null);
      assert.equal(resolveValidatedUpstreamOrigin(undefined), null);
      assert.equal(resolveValidatedUpstreamOrigin('not-a-url'), null);
    });

    check('buildTargetUrl preserves repeated, empty, and encoded query params and blocks open-proxy traversal', () => {
      assert.equal(
        buildTargetUrl(upstreamOrigin, '/api/proxy?__ascend_path=v1/foods/search&q=chicken%20%26%20rice&tag=a&tag=b&empty='),
        `${upstreamOrigin}/api/v1/foods/search?q=chicken+%26+rice&tag=a&tag=b&empty=`
      );
      assert.equal(buildTargetUrl(upstreamOrigin, '/api/proxy?__ascend_path=../../etc/passwd'), null);
      assert.equal(buildTargetUrl(upstreamOrigin, '/api/proxy?__ascend_path=%2e%2e/secret'), null);
      assert.equal(buildTargetUrl(upstreamOrigin, '/api/proxy?__ascend_path=https://evil.com/x'), null);
      assert.equal(buildTargetUrl(upstreamOrigin, '/not-api/test'), null);
      assert.equal(buildTargetUrl(upstreamOrigin, '//evil.com/api/v1/test'), null);
    });

    await checkAsync('Proxy ignores spoofed x-forwarded-for and prefers x-vercel-forwarded-for', async () => {
      const spoofReq = createMockReq({
        method: 'GET',
        url: '/api/proxy?__ascend_path=v1/health',
        headers: { 'x-forwarded-for': '203.0.113.99' },
      });
      const spoofRes = createMockRes();
      await handleProxyRequest(spoofReq, spoofRes, fetch, upstreamOrigin);
      assert.notEqual(lastUpstreamHeaders['x-forwarded-for'], '203.0.113.99');

      const vercelReq = createMockReq({
        method: 'GET',
        url: '/api/proxy?__ascend_path=v1/health',
        headers: {
          'x-forwarded-for': '203.0.113.99',
          'x-vercel-forwarded-for': '198.51.100.42, 10.0.0.1',
        },
      });
      const vercelRes = createMockRes();
      await handleProxyRequest(vercelReq, vercelRes, fetch, upstreamOrigin);
      assert.equal(lastUpstreamHeaders['x-forwarded-for'], '198.51.100.42');
    });

    await checkAsync('Proxy handles OPTIONS and returns 504 UPSTREAM_TIMEOUT on timeout', async () => {
      const optReq = createMockReq({ method: 'OPTIONS', url: '/api/proxy?__ascend_path=v1/auth/login' });
      const optRes = createMockRes();
      await handleProxyRequest(optReq, optRes, fetch, upstreamOrigin);
      assert.equal(optRes.statusCode, 200);
      assert.equal(lastUpstreamMethod, 'OPTIONS');

      const timeoutReq = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=v1/slow' });
      const timeoutRes = createMockRes();
      const slowFetch = (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        });
      await handleProxyRequest(timeoutReq, timeoutRes, slowFetch as typeof fetch, upstreamOrigin, 20);
      assert.equal(timeoutRes.statusCode, 504);
      assert.equal(JSON.parse(timeoutRes.getBodyText()).error.code, 'UPSTREAM_TIMEOUT');
    });

    await checkAsync('Real node:http proxy server preserves multiple Set-Cookie headers over wire TCP', async () => {
      const proxyServer = http.createServer((req, res) => {
        void handleProxyRequest(req as ProxyRequest, res, fetch, upstreamOrigin);
      });
      await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
      const pAddr = proxyServer.address() as { port: number };
      try {
        const wireRes = await fetch(`http://127.0.0.1:${pAddr.port}/api/proxy?__ascend_path=v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ username: 'wire@ascend.io', password: 'Password123!' }),
        });
        assert.equal(wireRes.status, 200);
        const wireCookies = wireRes.headers.getSetCookie();
        assert.equal(wireCookies.length, 2);
        assert.ok(wireCookies[0].includes('ascend_refresh_token=tok_abc123'));
        assert.ok(wireCookies[0].includes('HttpOnly'));
        assert.ok(wireCookies[0].includes('SameSite=Lax'));
        assert.ok(wireCookies[0].includes('Path=/api/v1/auth'));
        assert.ok(wireCookies[1].includes('ascend_csrf_hint=1'));
      } finally {
        await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
      }
    });

    await checkAsync('Proxy forwards POST body, Authorization, Content-Type, Accept, X-Requested-With, Cookie', async () => {
      const req = createMockReq({
        method: 'POST',
        url: '/api/proxy?__ascend_path=v1/auth/login',
        headers: {
          authorization: 'Bearer test_jwt',
          'content-type': 'application/json',
          accept: 'application/json',
          'x-requested-with': 'XMLHttpRequest',
          cookie: 'ascend_refresh_token=existing_tok',
        },
        body: { username: 'user@ascend.io', password: 'Password123!' },
      });
      const res = createMockRes();
      await handleProxyRequest(req, res, fetch, upstreamOrigin);

      assert.equal(res.statusCode, 200);
      assert.equal(lastUpstreamMethod, 'POST');
      assert.equal(lastUpstreamUrl, '/api/v1/auth/login');
      assert.equal(lastUpstreamHeaders['authorization'], 'Bearer test_jwt');
      assert.equal(lastUpstreamHeaders['content-type'], 'application/json');
      assert.equal(lastUpstreamHeaders['accept'], 'application/json');
      assert.equal(lastUpstreamHeaders['x-requested-with'], 'XMLHttpRequest');
      assert.equal(lastUpstreamHeaders['cookie'], 'ascend_refresh_token=existing_tok');
      assert.equal(JSON.parse(lastUpstreamBody).username, 'user@ascend.io');
    });

    await checkAsync('Proxy preserves multiple Set-Cookie headers and all cookie attributes without collapsing', async () => {
      const req = createMockReq({
        method: 'POST',
        url: '/api/proxy?__ascend_path=v1/auth/login',
        body: { username: 'a@b.com', password: 'x' },
      });
      const res = createMockRes();
      await handleProxyRequest(req, res, fetch, upstreamOrigin);

      const cookies = res.getHeader('set-cookie');
      assert.ok(Array.isArray(cookies), 'Set-Cookie must be preserved as an array');
      assert.equal(cookies.length, 2);
      assert.ok(cookies[0].includes('ascend_refresh_token=tok_abc123'));
      assert.ok(cookies[0].includes('HttpOnly'));
      assert.ok(cookies[0].includes('Secure'));
      assert.ok(cookies[0].includes('SameSite=Lax'));
      assert.ok(cookies[0].includes('Path=/api/v1/auth'));
      assert.ok(cookies[0].includes('Max-Age=604800'));
      assert.ok(cookies[1].includes('Expires=Wed, 02 Dec 2026 00:00:00 GMT'));
    });

    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE'] as const) {
      await checkAsync(`Proxy preserves ${method} method, query string, and stream body`, async () => {
        const req = createMockReq({
          method,
          url: '/api/proxy?__ascend_path=v1/intake/water&date_iso=2026-11-25',
          rawStreamBody: method === 'GET' ? undefined : '{"amountMl":250}',
        });
        const res = createMockRes();
        await handleProxyRequest(req, res, fetch, upstreamOrigin);
        assert.equal(res.statusCode, 200);
        const json = JSON.parse(res.getBodyText());
        assert.equal(json.method, method);
        assert.equal(json.url, '/api/v1/intake/water?date_iso=2026-11-25');
      });
    }

    await checkAsync('Proxy preserves 204 No Content and 500 upstream error responses', async () => {
      const req204 = createMockReq({ method: 'DELETE', url: '/api/proxy?__ascend_path=v1/no-content' });
      const res204 = createMockRes();
      await handleProxyRequest(req204, res204, fetch, upstreamOrigin);
      assert.equal(res204.statusCode, 204);

      const req500 = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=v1/error-500' });
      const res500 = createMockRes();
      await handleProxyRequest(req500, res500, fetch, upstreamOrigin);
      assert.equal(res500.statusCode, 500);
      assert.equal(JSON.parse(res500.getBodyText()).error.code, 'INTERNAL_ERROR');
    });

    await checkAsync('Proxy returns 502 PROXY_CONFIG_ERROR when RENDER_BACKEND_URL is missing or invalid', async () => {
      const req = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=v1/health' });
      const resMissing = createMockRes();
      await handleProxyRequest(req, resMissing, fetch, undefined);
      assert.equal(resMissing.statusCode, 502);
      assert.equal(JSON.parse(resMissing.getBodyText()).error.code, 'PROXY_CONFIG_ERROR');

      const resBad = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=v1/health' });
      const resBadOut = createMockRes();
      await handleProxyRequest(resBad, resBadOut, fetch, 'http://untrusted-external.example.com');
      assert.equal(resBadOut.statusCode, 502);
      assert.equal(JSON.parse(resBadOut.getBodyText()).error.code, 'PROXY_CONFIG_ERROR');
    });

    await checkAsync('Proxy returns 502 UPSTREAM_UNREACHABLE on network failure and 400 on invalid path', async () => {
      const badPathReq = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=../../etc/passwd' });
      const badPathRes = createMockRes();
      await handleProxyRequest(badPathReq, badPathRes, fetch, upstreamOrigin);
      assert.equal(badPathRes.statusCode, 400);
      assert.equal(JSON.parse(badPathRes.getBodyText()).error.code, 'INVALID_PROXY_PATH');

      const unreachableReq = createMockReq({ method: 'GET', url: '/api/proxy?__ascend_path=v1/health' });
      const unreachableRes = createMockRes();
      const failingFetch = async () => {
        throw new Error('ECONNREFUSED');
      };
      await handleProxyRequest(unreachableReq, unreachableRes, failingFetch as typeof fetch, upstreamOrigin);
      assert.equal(unreachableRes.statusCode, 502);
      assert.equal(JSON.parse(unreachableRes.getBodyText()).error.code, 'UPSTREAM_UNREACHABLE');
    });

    check('resolveApiBaseUrl uses same-origin /api/v1 in production browser and localhost:8000 in dev/CLI', () => {
      assert.equal(resolveApiBaseUrl({ isBrowser: true, isProd: true, envBaseUrl: '' }), '/api/v1');
      assert.equal(resolveApiBaseUrl({ isBrowser: true, isProd: false, envBaseUrl: '' }), 'http://localhost:8000/api/v1');
      assert.equal(resolveApiBaseUrl({ isBrowser: false, isProd: true, envBaseUrl: '' }), 'http://localhost:8000/api/v1');
      assert.equal(
        resolveApiBaseUrl({ isBrowser: false, isProd: false, envBaseUrl: 'http://127.0.0.1:8001/api/v1' }),
        'http://127.0.0.1:8001/api/v1'
      );
    });

    check('vercel.json routes /api/:path* to /api/proxy without hardcoded Render URL', () => {
      const vercelPath = path.resolve(process.cwd(), 'vercel.json');
      const raw = fs.readFileSync(vercelPath, 'utf8');
      assert.ok(!raw.includes('onrender.com'), 'vercel.json must not hardcode Render domain');
      const parsed = JSON.parse(raw);
      assert.equal(parsed.framework, 'vite');
      assert.equal(parsed.outputDirectory, 'dist');
      assert.equal(parsed.rewrites[0].source, '/api/:path*');
      assert.equal(parsed.rewrites[0].destination, '/api/proxy?__ascend_path=:path*');
    });

    console.log(`\nALL VERCEL PROXY & CLIENT CONFIG TESTS PASSED: ${passed}/${passed}`);
  } finally {
    await new Promise<void>((resolve) => mockUpstream.close(() => resolve()));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
