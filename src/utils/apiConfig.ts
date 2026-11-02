import {
  executeDirectChat,
  executeDirectChatStream,
  executeDirectScreenUnderstand,
  executeDirectValidateKey,
  hasUsableClientGeminiKey,
} from './clientGeminiEngine';

/**
 * Cross-Platform API Configuration & Native Fetch Router
 *
 * Ensures that all `/api/*` calls work identically across:
 * 1. Hosted Web / Dev Server (same-origin `/api/*`)
 * 2. Packaged Android APK / Capacitor WebView (`https://appassets.androidplatform.net`, `https://localhost`, `capacitor://localhost`, `file://`)
 * 3. Installed Desktop / Mobile PWA
 *
 * Security Note: No server secrets or GEMINI_API_KEY values are ever embedded here.
 */

const STORAGE_KEY_API_BASE = 'alya_custom_api_base_url_v1';

// Default hosted Cloud Run backend URLs for packaged Android APK builds when no custom URL is set.
// Note: DEFAULT_SHARED_BACKEND_URL (ais-pre-*) is tried before DEFAULT_DEV_BACKEND_URL (ais-dev-*)
// because ais-dev-* requires AI Studio browser login cookies (/__cookie_check.html).
const DEFAULT_SHARED_BACKEND_URL = 'https://ais-pre-y7i5w4adihz6rn7hgkovjj-893936621001.asia-east1.run.app';
const DEFAULT_DEV_BACKEND_URL = 'https://ais-dev-y7i5w4adihz6rn7hgkovjj-893936621001.asia-east1.run.app';
const DEFAULT_API_TIMEOUT_MS = 20000;
const UNREACHABLE_ORIGIN_TTL_MS = 60000;

export interface ApiDiagnosticFailure {
  origin: string;
  url: string;
  category: 'offline' | 'cors_or_network' | 'auth_cookie_redirect' | 'http_status' | 'timeout' | 'invalid_response';
  httpStatus?: number;
  detail: string;
}

interface UnreachableOriginRecord {
  timestamp: number;
  failure: ApiDiagnosticFailure;
}

let fetchInterceptorInstalled = false;
let nativeFetchRef: typeof fetch | null = null;
let lastVerifiedRemoteBaseUrl = '';
const unreachableOriginsCache = new Map<string, UnreachableOriginRecord>();

function getNativeFetch(): typeof fetch {
  if (nativeFetchRef) {
    return nativeFetchRef;
  }
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    nativeFetchRef = window.fetch.bind(window);
    return nativeFetchRef;
  }
  return fetch;
}

function isOriginCachedUnreachable(baseOrigin: string): UnreachableOriginRecord | null {
  if (!baseOrigin) return null;
  const record = unreachableOriginsCache.get(baseOrigin);
  if (!record) return null;
  if (Date.now() - record.timestamp > UNREACHABLE_ORIGIN_TTL_MS) {
    unreachableOriginsCache.delete(baseOrigin);
    return null;
  }
  return record;
}

function markOriginUnreachable(baseOrigin: string, failure: ApiDiagnosticFailure): void {
  if (!baseOrigin) return;
  unreachableOriginsCache.set(baseOrigin, {
    timestamp: Date.now(),
    failure,
  });
}

export function clearUnreachableOriginsCache(): void {
  unreachableOriginsCache.clear();
}

/**
 * Normalize a base URL by trimming whitespace and removing trailing slashes.
 */
export function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

/**
 * Validates that a candidate backend base URL is a well-formed HTTP/HTTPS origin
 * and does not point to localhost/loopback when running inside a packaged Android APK.
 */
export function isValidBackendUrl(rawUrl: string, disallowLocalhost = false): boolean {
  const normalized = normalizeBaseUrl(rawUrl);
  if (!normalized || normalized.includes('MY_APP_URL') || normalized.includes('YOUR_')) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'appassets.androidplatform.net') {
      return false;
    }

    if (
      disallowLocalhost &&
      (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '[::1]')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Detects whether the frontend is executing inside a packaged Capacitor/Android WebView
 * or local asset origin where Express is not running on the same origin.
 */
export function isPackagedNativeOrigin(): boolean {
  if (typeof window === 'undefined') return false;

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  const hasAndroidBridge = Boolean((window as any).AndroidBridge);
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());

  if (hasAndroidBridge || isCapacitorNative) {
    return true;
  }

  if (
    protocol === 'file:' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    hostname === 'appassets.androidplatform.net'
  ) {
    return true;
  }

  if (hostname === 'localhost' && !window.location.port && protocol === 'https:') {
    return true;
  }

  return false;
}

/**
 * Returns any user-configured custom backend server URL from localStorage,
 * automatically discarding corrupted or invalid values (such as localhost on Android).
 */
export function getCustomApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(STORAGE_KEY_API_BASE) || '';
    const normalized = normalizeBaseUrl(raw);
    if (!normalized) return '';

    const nativeOrigin = isPackagedNativeOrigin();
    if (!isValidBackendUrl(normalized, nativeOrigin)) {
      console.warn('[API Diagnostic] Ignoring invalid custom backend URL in storage:', normalized);
      localStorage.removeItem(STORAGE_KEY_API_BASE);
      return '';
    }

    // If running on Web and the stored custom URL matches the current web origin, use same-origin
    if (!nativeOrigin && normalized === window.location.origin) {
      localStorage.removeItem(STORAGE_KEY_API_BASE);
      return '';
    }

    return normalized;
  } catch {
    return '';
  }
}

/**
 * Saves or clears a custom backend server URL in localStorage.
 * Returns true if saved/cleared, or false if the non-empty URL was rejected as invalid.
 */
export function setCustomApiBaseUrl(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const normalized = normalizeBaseUrl(url);
    clearUnreachableOriginsCache();
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEY_API_BASE);
      lastVerifiedRemoteBaseUrl = '';
      return true;
    }

    const nativeOrigin = isPackagedNativeOrigin();
    if (!isValidBackendUrl(normalized, nativeOrigin)) {
      console.warn('[API Diagnostic] Rejected invalid custom backend URL:', normalized);
      return false;
    }

    localStorage.setItem(STORAGE_KEY_API_BASE, normalized);
    lastVerifiedRemoteBaseUrl = normalized;
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns an ordered list of valid remote backend URLs for packaged Android APK environments.
 */
export function getCandidateRemoteBaseUrls(): string[] {
  const candidates: string[] = [];
  const addCandidate = (url?: string) => {
    const norm = normalizeBaseUrl(url || '');
    if (norm && isValidBackendUrl(norm, true) && !candidates.includes(norm)) {
      candidates.push(norm);
    }
  };

  if (lastVerifiedRemoteBaseUrl) {
    addCandidate(lastVerifiedRemoteBaseUrl);
  }
  addCandidate(getCustomApiBaseUrl());
  addCandidate((import.meta as any).env?.VITE_API_BASE_URL);
  addCandidate(DEFAULT_SHARED_BACKEND_URL);
  addCandidate((import.meta as any).env?.VITE_APP_URL);
  addCandidate(DEFAULT_DEV_BACKEND_URL);

  return candidates;
}

/**
 * Resolves the active API base URL.
 */
export function getApiBaseUrl(): string {
  const customUrl = getCustomApiBaseUrl();
  if (customUrl) {
    return customUrl;
  }

  if (isPackagedNativeOrigin()) {
    const candidates = getCandidateRemoteBaseUrls();
    return candidates[0] || DEFAULT_SHARED_BACKEND_URL;
  }

  return '';
}

/**
 * Resolves a relative `/api/...` path into a full URL when needed.
 */
export function resolveApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('/api/') || pathOrUrl === '/api') {
    const base = getApiBaseUrl();
    return base ? `${base}${pathOrUrl}` : pathOrUrl;
  }
  return pathOrUrl;
}

/**
 * Creates a combined AbortSignal that enforces a default timeout while respecting any caller signal.
 */
function createTimedRequestSignal(callerSignal?: AbortSignal | null, timeoutMs = DEFAULT_API_TIMEOUT_MS): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch {}
  }, timeoutMs);

  const onCallerAbort = () => {
    try {
      controller.abort();
    } catch {}
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timer);
      try {
        controller.abort();
      } catch {}
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    },
  };
}

/**
 * Checks whether an `/api/*` response actually came from our Express API rather than an
 * HTML 404/502 error page or an unauthenticated HTML redirect page.
 */
function inspectUnexpectedApiResponse(res: Response): {
  isUnexpected: boolean;
  category?: 'auth_cookie_redirect' | 'http_status' | 'invalid_response';
  reason?: string;
} {
  if (
    res.redirected &&
    res.url &&
    (res.url.includes('__cookie_check.html') || res.url.includes('applet-auth-bridge'))
  ) {
    return {
      isUnexpected: true,
      category: 'auth_cookie_redirect',
      reason: 'Redirected to AI Studio browser cookie authentication gate (/__cookie_check.html)',
    };
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    if (res.status === 404) {
      return {
        isUnexpected: true,
        category: 'http_status',
        reason: 'Endpoint returned HTTP 404 HTML page (cloud service not published or route missing)',
      };
    }
    return {
      isUnexpected: true,
      category: 'invalid_response',
      reason: `Endpoint returned unexpected HTML page (HTTP ${res.status}) instead of API JSON`,
    };
  }

  return { isUnexpected: false };
}

function parseJsonBodySafely(init?: RequestInit): any {
  if (!init?.body || typeof init.body !== 'string') return {};
  try {
    return JSON.parse(init.body);
  } catch {
    return {};
  }
}

/**
 * Provides clean local fallback responses on packaged Android APK for non-AI utility routes
 * when no remote Express backend server is reachable.
 */
function createStandaloneAndroidUtilityResponse(apiPath: string, init?: RequestInit): Response | null {
  const cleanPath = apiPath.split('?')[0];

  if (cleanPath === '/api/time') {
    const now = new Date();
    return new Response(
      JSON.stringify({
        timestamp: now.getTime(),
        iso: now.toISOString(),
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (cleanPath === '/api/status' || cleanPath === '/api/health') {
    const hasLocalKey = hasUsableClientGeminiKey();
    return new Response(
      JSON.stringify({
        status: 'online',
        mode: 'standalone_android',
        character: 'Alya & Jarvis Dual Engine',
        hasGeminiKey: hasLocalKey,
        backendReachable: false,
        models: ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'],
        serverYear: new Date().getFullYear(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (cleanPath === '/api/device/register' || cleanPath === '/api/analytics/event') {
    return new Response(JSON.stringify({ success: true, standalone: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (cleanPath === '/api/tts') {
    return new Response(
      JSON.stringify({
        fallback: true,
        message: 'Standalone Android mode: using native device speech synthesis.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (cleanPath === '/api/profile/check-username' || cleanPath === '/api/auth/check-username') {
    return new Response(JSON.stringify({ available: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (cleanPath === '/api/profile/create' || cleanPath === '/api/auth/register-local') {
    const body = parseJsonBodySafely(init);
    const nowIso = new Date().toISOString();
    const userId = body.existingUserId || `usr_${Date.now().toString(36)}`;
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          token: `local_tok_${Date.now().toString(36)}`,
          userId,
          expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
        },
        user: {
          id: userId,
          username: String(body.username || 'explorer')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, ''),
          displayName: String(body.displayName || 'Explorer'),
          avatarUrl: body.avatarUrl || 'alya_pink',
          bannerUrl: body.bannerUrl || 'cyber_neon',
          companionPreference: body.companionPreference === 'jarvis' ? 'jarvis' : 'alya',
          hasCompletedProfile: true,
          hasCompletedOnboarding: true,
          hasCompletedKeySetup: hasUsableClientGeminiKey(),
          createdAt: nowIso,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (cleanPath === '/api/profile/update' || cleanPath === '/api/auth/update-profile') {
    const body = parseJsonBodySafely(init);
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: 'usr_local',
          username: body.username || 'explorer',
          displayName: body.displayName || 'Explorer',
          avatarUrl: body.avatarUrl || 'alya_pink',
          bannerUrl: body.bannerUrl || 'cyber_neon',
          companionPreference: body.companion || 'alya',
          hasCompletedProfile: true,
          hasCompletedOnboarding: true,
          hasCompletedKeySetup: hasUsableClientGeminiKey(),
          createdAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return null;
}

/**
 * Builds a detailed, user-friendly diagnostic Error when all candidate backend origins fail.
 */
function buildDiagnosticConnectionError(
  apiPath: string,
  failures: ApiDiagnosticFailure[],
  nativeOrigin: boolean,
): Error {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    const offlineErr: any = new Error(
      'Network Connection Error (Offline): Your device has no active internet connection. Please check Wi-Fi or mobile data and try again.',
    );
    offlineErr.errorType = 'offline';
    offlineErr.retryable = false;
    return offlineErr;
  }

  const customUrl = getCustomApiBaseUrl();
  const hasTimeout = failures.some((f) => f.category === 'timeout');
  if (hasTimeout && failures.every((f) => f.category === 'timeout')) {
    const timeoutErr: any = new Error(
      `Backend Timeout Error: Request to ${apiPath} timed out after ${Math.round(
        DEFAULT_API_TIMEOUT_MS / 1000,
      )}s (${failures.map((f) => f.origin || 'same-origin').join(', ')}).`,
    );
    timeoutErr.errorType = 'timeout';
    timeoutErr.retryable = true;
    return timeoutErr;
  }

  if (nativeOrigin) {
    if (customUrl) {
      const customFail = failures.find((f) => f.origin === customUrl) || failures[0];
      const err: any = new Error(
        `Backend Connection Error (${customFail?.category || 'unreachable'}): Could not reach custom backend URL "${customUrl}" (${
          customFail?.detail || 'CORS or network failure'
        }). Verify the HTTPS URL in Settings or enter your Gemini API Key (AIza...) in Settings for direct on-device AI.`,
      );
      err.errorType = 'backend_unreachable';
      err.retryable = false;
      return err;
    }

    const err: any = new Error(
      'Android Backend Connection Error (CORS / Unauthenticated Preview Server): The mobile app could not reach the cloud backend because AI Studio Dev URLs (ais-dev-*) require browser login cookies (/__cookie_check.html) and block cross-origin APK requests, and the public shared server (ais-pre-*) returned HTTP 404 (not yet published). To fix this immediately: open Menu → Settings and enter your Gemini API Key (AIza...) for direct on-device Gemini connection, or set a deployed public HTTPS Backend Server URL.',
    );
    err.errorType = 'backend_unreachable';
    err.retryable = false;
    return err;
  }

  const primary = failures[0];
  const err: any = new Error(
    `Backend Connection Error: Request to ${apiPath} failed (${
      primary?.detail || 'Server unreachable'
    }). Please verify the backend server status or check your Gemini API configuration in Settings.`,
  );
  err.errorType = 'backend_unreachable';
  err.retryable = false;
  return err;
}

/**
 * Tests connectivity to a specific or current backend URL (`/api/status`) and returns a structured diagnostic report.
 */
export async function testBackendServerConnection(candidateUrl?: string): Promise<{
  ok: boolean;
  status?: number;
  latencyMs: number;
  origin: string;
  hasServerGeminiKey?: boolean;
  diagnosticMessage: string;
}> {
  const originalFetch = getNativeFetch();
  const norm = candidateUrl !== undefined ? normalizeBaseUrl(candidateUrl) : getApiBaseUrl();
  const targetOrigin = norm || (typeof window !== 'undefined' ? window.location.origin : '');
  const statusUrl = norm ? `${norm}/api/status` : '/api/status';
  const start = Date.now();
  const { signal, didTimeout, cleanup } = createTimedRequestSignal(null, 8000);

  try {
    const res = await originalFetch(statusUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    cleanup();
    const latencyMs = Date.now() - start;

    const unexpected = inspectUnexpectedApiResponse(res);
    if (unexpected.isUnexpected) {
      return {
        ok: false,
        status: res.status,
        latencyMs,
        origin: targetOrigin,
        diagnosticMessage: `${unexpected.reason} at ${targetOrigin}.`,
      };
    }

    const data = await res.json();
    return {
      ok: res.ok && data?.status === 'online',
      status: res.status,
      latencyMs,
      origin: targetOrigin,
      hasServerGeminiKey: Boolean(data?.hasGeminiKey),
      diagnosticMessage: res.ok
        ? `Connected to ${targetOrigin} in ${latencyMs}ms (${
            data?.hasGeminiKey ? 'Server Gemini Key Active' : 'No Valid Server Key — Use Client Key in Settings'
          }).`
        : `Server at ${targetOrigin} returned HTTP ${res.status}.`,
    };
  } catch (err: any) {
    cleanup();
    const latencyMs = Date.now() - start;
    if (didTimeout()) {
      return {
        ok: false,
        latencyMs,
        origin: targetOrigin,
        diagnosticMessage: `Connection to ${targetOrigin} timed out after 8s.`,
      };
    }
    const isDevUrl = targetOrigin.includes('ais-dev-');
    const isPreUrl = targetOrigin.includes('ais-pre-');
    const hint = isDevUrl
      ? 'AI Studio Dev URLs (ais-dev-*) require browser login cookies and block cross-origin mobile APK requests via CORS.'
      : isPreUrl
      ? 'Shared Cloud Run URL (ais-pre-*) is either not published yet (HTTP 404) or blocked by CORS.'
      : 'Verify the server is online, uses HTTPS, and sends Access-Control-Allow-Origin headers.';
    return {
      ok: false,
      latencyMs,
      origin: targetOrigin,
      diagnosticMessage: `Failed to fetch ${targetOrigin}/api/status (${err?.message || 'CORS / Network Error'}). ${hint}`,
    };
  }
}

/**
 * Cross-platform fetch wrapper that resolves `/api/*` paths to the active backend origin,
 * caches unreachable remote origins to prevent retry storms, supports direct `@google/genai`
 * execution when a user API key is configured, and produces clear diagnostic errors.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const originalFetch = getNativeFetch();
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

  let apiPath: string | null = null;
  if (typeof input === 'string' && (input.startsWith('/api/') || input === '/api')) {
    apiPath = input;
  } else if (
    input instanceof URL &&
    typeof window !== 'undefined' &&
    input.origin === window.location.origin &&
    (input.pathname.startsWith('/api/') || input.pathname === '/api')
  ) {
    apiPath = `${input.pathname}${input.search}`;
  } else if (typeof Request !== 'undefined' && input instanceof Request && typeof window !== 'undefined') {
    try {
      const reqUrl = new URL(input.url, window.location.origin);
      if (reqUrl.origin === window.location.origin && (reqUrl.pathname.startsWith('/api/') || reqUrl.pathname === '/api')) {
        apiPath = `${reqUrl.pathname}${reqUrl.search}`;
      }
    } catch {
      apiPath = null;
    }
  }

  if (!apiPath) {
    return originalFetch(input, init);
  }

  const cleanPath = apiPath.split('?')[0];
  const parsedBody = parseJsonBodySafely(init);
  const explicitKey = parsedBody?.userApiKey || parsedBody?.apiKey;
  const nativeOrigin = isPackagedNativeOrigin();
  const customUrl = getCustomApiBaseUrl();

  // Build candidate backend base URLs. On Web, always prioritize same-origin ('') first unless customUrl is set.
  const allBaseCandidates = nativeOrigin
    ? getCandidateRemoteBaseUrls()
    : customUrl
    ? [customUrl, '']
    : [''];

  // Filter out remote origins that were recently confirmed unreachable (within 60s TTL)
  const activeCandidates = allBaseCandidates.filter((base) => !base || !isOriginCachedUnreachable(base));
  const failures: ApiDiagnosticFailure[] = [];

  // Record cached failures so diagnostics still know why skipped origins were skipped
  for (const base of allBaseCandidates) {
    if (base) {
      const cached = isOriginCachedUnreachable(base);
      if (cached) {
        failures.push(cached.failure);
      }
    }
  }

  for (let i = 0; i < activeCandidates.length; i++) {
    const base = activeCandidates[i];
    const targetUrl = base ? `${base}${apiPath}` : apiPath;
    const startTime = Date.now();
    const { signal, didTimeout, cleanup } = createTimedRequestSignal(init?.signal, DEFAULT_API_TIMEOUT_MS);

    try {
      const res = await originalFetch(targetUrl, {
        ...init,
        signal,
      });
      cleanup();

      const elapsedMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || 'unknown';

      const unexpected = inspectUnexpectedApiResponse(res);
      if (unexpected.isUnexpected) {
        const failure: ApiDiagnosticFailure = {
          origin: base || 'same-origin',
          url: targetUrl,
          category: unexpected.category || 'invalid_response',
          httpStatus: res.status,
          detail: unexpected.reason || `Unexpected HTML response (HTTP ${res.status})`,
        };
        failures.push(failure);
        if (base) {
          markOriginUnreachable(base, failure);
        }
        console.warn(
          `[API Diagnostic] ${method} ${apiPath} via ${base || 'same-origin'} rejected: ${failure.detail} (${elapsedMs}ms)`,
        );
        continue;
      }

      if ((res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) && i < activeCandidates.length - 1) {
        const failure: ApiDiagnosticFailure = {
          origin: base || 'same-origin',
          url: targetUrl,
          category: 'http_status',
          httpStatus: res.status,
          detail: `Server returned HTTP ${res.status}`,
        };
        failures.push(failure);
        if (base && res.status === 404) {
          markOriginUnreachable(base, failure);
        }
        console.warn(
          `[API Diagnostic] ${method} ${apiPath} via ${base || 'same-origin'} returned ${res.status} in ${elapsedMs}ms; trying next candidate`,
        );
        continue;
      }

      // If the backend server returned 401/503 (missing/invalid server key) AND the user has a valid client key,
      // allow direct client Gemini engine to fulfill the request.
      if (
        (res.status === 401 || res.status === 503) &&
        hasUsableClientGeminiKey(explicitKey) &&
        (cleanPath === '/api/chat' || cleanPath === '/api/chat/stream' || cleanPath === '/api/validate-key')
      ) {
        console.info(
          `[API Diagnostic] Backend returned HTTP ${res.status} on ${cleanPath}; switching to direct client Gemini key.`,
        );
        if (cleanPath === '/api/validate-key') return executeDirectValidateKey(parsedBody);
        if (cleanPath === '/api/chat/stream') return executeDirectChatStream(parsedBody);
        if (cleanPath === '/api/chat') return executeDirectChat(parsedBody);
      }

      if (base && res.ok) {
        lastVerifiedRemoteBaseUrl = base;
      }

      console.info(
        `[API Diagnostic] ${method} ${apiPath} -> ${res.status} (${contentType.split(';')[0]}) in ${elapsedMs}ms [origin: ${
          base || 'same-origin'
        }]`,
      );
      return res;
    } catch (err: any) {
      cleanup();
      const elapsedMs = Date.now() - startTime;

      // If the caller explicitly aborted the request (e.g. user interrupted speech), rethrow immediately
      if (init?.signal?.aborted) {
        throw err;
      }

      const timedOut = didTimeout();
      const isDevUrl = base.includes('ais-dev-');
      const isPreUrl = base.includes('ais-pre-');
      const detail = timedOut
        ? `Request timed out after ${elapsedMs}ms`
        : isDevUrl
        ? 'Blocked by CORS / AI Studio dev cookie check (/__cookie_check.html)'
        : isPreUrl
        ? 'Blocked by CORS or shared Cloud Run service not published (HTTP 404)'
        : err?.message || 'Network or CORS connection failure';

      const failure: ApiDiagnosticFailure = {
        origin: base || 'same-origin',
        url: targetUrl,
        category: timedOut ? 'timeout' : 'cors_or_network',
        detail,
      };
      failures.push(failure);

      if (base && !timedOut) {
        markOriginUnreachable(base, failure);
      }

      console.warn(
        `[API Diagnostic] ${method} ${apiPath} failed via ${base || 'same-origin'} after ${elapsedMs}ms: ${detail}`,
      );
    }
  }

  // All backend server candidates failed or were unreachable.
  // 1. Check if this is an AI endpoint that can be fulfilled directly via @google/genai on the client
  if (cleanPath === '/api/validate-key') {
    return executeDirectValidateKey(parsedBody);
  }

  if (hasUsableClientGeminiKey(explicitKey)) {
    if (cleanPath === '/api/chat/stream') {
      console.info('[API Diagnostic] Backend unreachable; executing /api/chat/stream directly via client Gemini key.');
      return executeDirectChatStream(parsedBody);
    }
    if (cleanPath === '/api/chat') {
      console.info('[API Diagnostic] Backend unreachable; executing /api/chat directly via client Gemini key.');
      return executeDirectChat(parsedBody);
    }
    if (cleanPath === '/api/screen-understand') {
      return executeDirectScreenUnderstand(parsedBody);
    }
  }

  // 2. Check if this is a non-AI utility endpoint on standalone Android APK
  if (nativeOrigin) {
    const utilityFallback = createStandaloneAndroidUtilityResponse(apiPath, init);
    if (utilityFallback) {
      return utilityFallback;
    }
  }

  // 3. Otherwise throw a structured, non-retryable diagnostic error explaining the exact root cause
  throw buildDiagnosticConnectionError(apiPath, failures, nativeOrigin);
}

/**
 * Installs a transparent `window.fetch` interceptor when the host environment permits it.
 * Safely guards against getter-only / non-configurable `window.fetch` descriptors
 * (such as inside preview iframes).
 */
export function installApiFetchInterceptor(): void {
  if (typeof window === 'undefined' || fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;

  getNativeFetch();
  getCustomApiBaseUrl();

  window.addEventListener('online', () => {
    clearUnreachableOriginsCache();
  });

  try {
    const ownDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    const protoDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window) || {}, 'fetch');
    const desc = ownDesc || protoDesc;

    if (desc && !desc.writable && !desc.set && !desc.configurable) {
      return;
    }

    if (desc && desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        value: apiFetch,
        configurable: true,
        writable: true,
      });
    } else if (!desc || desc.writable || typeof desc.set === 'function') {
      window.fetch = apiFetch as typeof fetch;
    }
  } catch {
    // Environment restricts overriding window.fetch; apiFetch() handles routing directly.
  }
}
