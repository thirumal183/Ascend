/**
 * ASCEND Frontend HTTP Client
 *
 * Provides centralized API dispatching, token refresh interceptors with queueing,
 * typed error parsing, and session lifecycle event hooks.
 */

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(status: number, message: string, code: string = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const LEGACY_ACCESS_TOKEN_KEY = 'ascend_access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'ascend_refresh_token';
const LIVE_SESSION_HINT_KEY = 'ascend_has_live_session';

const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';

// Access token is kept strictly in memory (never persisted in localStorage)
let inMemoryAccessToken: string | null = null;
// Refresh token is managed via HttpOnly cookie in browsers; only kept in-memory for non-browser CLI test scripts
let inMemoryCliRefreshToken: string | null = null;

export function resolveApiBaseUrl(options: {
  isBrowser?: boolean;
  isProd?: boolean;
  envBaseUrl?: string;
} = {}): string {
  const isBrowser = options.isBrowser ?? isBrowserRuntime;
  const isProd =
    options.isProd ?? (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD));
  const envBase =
    options.envBaseUrl ??
    (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined);

  if (envBase && envBase.trim()) {
    return envBase.trim();
  }
  if (isBrowser && isProd) {
    return '/api/v1';
  }
  return 'http://localhost:8000/api/v1';
}

export const API_BASE_URL: string = resolveApiBaseUrl();

// Token Storage
export function getStoredAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function getStoredRefreshToken(): string | null {
  return isBrowserRuntime ? null : inMemoryCliRefreshToken;
}

export function hasLiveSessionHint(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LIVE_SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setStoredTokens(accessToken: string, refreshToken?: string): void {
  inMemoryAccessToken = accessToken;
  if (!isBrowserRuntime && refreshToken) {
    inMemoryCliRefreshToken = refreshToken;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LIVE_SESSION_HINT_KEY, '1');
      // Wipe any legacy localStorage tokens from prior versions
      localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredTokens(): void {
  inMemoryAccessToken = null;
  inMemoryCliRefreshToken = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LIVE_SESSION_HINT_KEY);
      localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// Global Auth Failure Hook
type AuthFailureCallback = () => void;
let authFailureCallback: AuthFailureCallback | null = null;

export function onAuthFailure(callback: AuthFailureCallback): void {
  authFailureCallback = callback;
}

// Concurrent Refresh Queue
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  refreshQueue = [];
}

async function executeTokenRefresh(): Promise<string> {
  const currentRefreshToken = getStoredRefreshToken();
  if (!isBrowserRuntime && !currentRefreshToken) {
    throw new ApiError(401, 'No refresh token available', 'UNAUTHORIZED');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(currentRefreshToken ? { refreshToken: currentRefreshToken } : {}),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const code = errBody?.error?.code || 'REFRESH_FAILED';
      const msg = errBody?.error?.message || errBody?.detail || 'Refresh token invalid or expired';
      throw new ApiError(res.status, msg, code);
    }

    const data = await res.json();
    setStoredTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (err) {
    clearStoredTokens();
    if (authFailureCallback) {
      authFailureCallback();
    }
    throw err;
  }
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retried?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  if (!options.skipAuth) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      0,
      `Network connection to backend failed: ${netErr?.message || 'Server unreachable'}. Verify backend is running on ${API_BASE_URL}`,
      'NETWORK_ERROR'
    );
  }

  // Intercept 401 Unauthorized for Token Refresh
  if (
    response.status === 401 &&
    !options.skipAuth &&
    !options._retried &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/token')
  ) {
    if (isRefreshing) {
      // Wait for the active refresh to finish
      try {
        const newAccessToken = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        return apiClient<T>(endpoint, { ...options, headers, _retried: true });
      } catch (err) {
        throw err;
      }
    }

    isRefreshing = true;

    try {
      const newAccessToken = await executeTokenRefresh();
      processQueue(null, newAccessToken);
      headers.set('Authorization', `Bearer ${newAccessToken}`);
      return apiClient<T>(endpoint, { ...options, headers, _retried: true });
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Handle Non-OK Responses
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }

    const code = errorData?.error?.code || 'HTTP_ERROR';
    const message =
      errorData?.error?.message ||
      (typeof errorData?.detail === 'string'
        ? errorData.detail
        : Array.isArray(errorData?.detail)
        ? errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : `Request failed with status ${response.status}`);

    throw new ApiError(response.status, message, code, errorData?.error?.details || errorData?.detail);
  }

  return response.json() as Promise<T>;
}
