import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ProxyRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

const ALLOWED_FORWARD_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'x-requested-with',
  'cookie',
  'user-agent',
] as const;

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
]);

export function resolveValidatedUpstreamOrigin(rawOrigin: string | undefined): string | null {
  if (!rawOrigin || !rawOrigin.trim()) {
    return null;
  }
  try {
    const parsed = new URL(rawOrigin.trim());
    const isHttps = parsed.protocol === 'https:';
    const isLocalHttp =
      parsed.protocol === 'http:' &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
    if (!isHttps && !isLocalHttp) {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildTargetUrl(
  upstreamOrigin: string,
  reqUrl: string | undefined,
  query?: Record<string, string | string[] | undefined>
): string | null {
  if (reqUrl && reqUrl.trim().startsWith('//')) {
    return null;
  }
  const parsedIncoming = new URL(reqUrl || '/api', 'http://localhost');
  const rawProxyParam =
    query?.__ascend_path ?? parsedIncoming.searchParams.get('__ascend_path');
  const proxySegment = Array.isArray(rawProxyParam)
    ? rawProxyParam.join('/')
    : rawProxyParam || '';

  let targetPath: string;
  if (proxySegment) {
    targetPath = `/api/${proxySegment.replace(/^\/+/, '')}`;
  } else {
    targetPath = parsedIncoming.pathname;
  }

  // Block path traversal, encoded traversal, or protocol-relative open-proxy tricks
  const decodedPath = decodeURIComponent(targetPath);
  if (
    !targetPath.startsWith('/api/') &&
    targetPath !== '/api'
  ) {
    return null;
  }
  if (
    decodedPath.includes('..') ||
    decodedPath.includes('\\') ||
    decodedPath.includes('://') ||
    targetPath.startsWith('//')
  ) {
    return null;
  }

  const outParams = new URLSearchParams(parsedIncoming.searchParams);
  outParams.delete('__ascend_path');
  const qs = outParams.toString();
  return `${upstreamOrigin}${targetPath}${qs ? `?${qs}` : ''}`;
}

async function readRequestBody(req: ProxyRequest): Promise<BodyInit | undefined> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return new Uint8Array(req.body);
  }
  if (typeof req.body === 'string') {
    return req.body;
  }
  if (req.body !== undefined && req.body !== null) {
    return JSON.stringify(req.body);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function sendJsonError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string
): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      error: {
        code,
        message,
        details: null,
      },
    })
  );
}

export async function handleProxyRequest(
  req: ProxyRequest,
  res: ServerResponse,
  fetchImpl: typeof fetch = fetch,
  upstreamEnv: string | undefined = process.env.RENDER_BACKEND_URL,
  timeoutMs: number = 25_000
): Promise<void> {
  const upstreamOrigin = resolveValidatedUpstreamOrigin(upstreamEnv);
  if (!upstreamOrigin) {
    sendJsonError(
      res,
      502,
      'PROXY_CONFIG_ERROR',
      'Upstream backend origin is not configured or invalid.'
    );
    return;
  }

  let targetUrl: string | null = null;
  try {
    targetUrl = buildTargetUrl(upstreamOrigin, req.url, req.query);
  } catch {
    targetUrl = null;
  }

  if (!targetUrl) {
    sendJsonError(res, 400, 'INVALID_PROXY_PATH', 'Invalid API proxy path.');
    return;
  }

  const forwardHeaders = new Headers();
  for (const headerName of ALLOWED_FORWARD_HEADERS) {
    const rawVal = req.headers[headerName];
    if (typeof rawVal === 'string' && rawVal.length > 0) {
      forwardHeaders.set(headerName, rawVal);
    } else if (Array.isArray(rawVal) && rawVal.length > 0) {
      forwardHeaders.set(headerName, rawVal.join(', '));
    }
  }

  // Only forward platform-verified client IP (Vercel sets x-vercel-forwarded-for) or socket peer IP;
  // never trust raw client-supplied x-forwarded-for.
  const vercelForwardedFor = req.headers['x-vercel-forwarded-for'];
  const trustedClientIp =
    typeof vercelForwardedFor === 'string' && vercelForwardedFor.length > 0
      ? vercelForwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress;
  if (trustedClientIp) {
    forwardHeaders.set('x-forwarded-for', trustedClientIp);
  }

  let body: BodyInit | undefined;
  try {
    body = await readRequestBody(req);
  } catch {
    sendJsonError(res, 400, 'INVALID_REQUEST_BODY', 'Failed to read request body.');
    return;
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetchImpl(targetUrl, {
      method: (req.method || 'GET').toUpperCase(),
      headers: forwardHeaders,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    sendJsonError(
      res,
      isTimeout ? 504 : 502,
      isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE',
      isTimeout ? 'Upstream API service timed out.' : 'Unable to reach upstream API service.'
    );
    return;
  }

  res.statusCode = upstreamRes.status;

  // Preserve multiple Set-Cookie headers without collapsing
  const setCookies =
    typeof upstreamRes.headers.getSetCookie === 'function'
      ? upstreamRes.headers.getSetCookie()
      : [];

  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || HOP_BY_HOP_RESPONSE_HEADERS.has(lower)) {
      return;
    }
    res.setHeader(key, value);
  });

  if (setCookies.length > 0) {
    res.setHeader('Set-Cookie', setCookies);
  } else {
    const fallbackCookie = upstreamRes.headers.get('set-cookie');
    if (fallbackCookie) {
      res.setHeader('Set-Cookie', fallbackCookie);
    }
  }

  if (upstreamRes.status === 204 || upstreamRes.status === 304) {
    res.end();
    return;
  }

  const payload = Buffer.from(await upstreamRes.arrayBuffer());
  res.end(payload);
}

export default async function handler(req: ProxyRequest, res: ServerResponse): Promise<void> {
  await handleProxyRequest(req, res);
}
