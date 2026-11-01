/**
 * Cross-Platform API Configuration & Native Fetch Interceptor
 *
 * Ensures that all `/api/*` calls work identically across:
 * 1. Hosted Web / Dev Server (same-origin `/api/*`)
 * 2. Packaged Android APK / Capacitor WebView (`https://appassets.androidplatform.net`, `https://localhost`, `capacitor://localhost`, `file://`)
 * 3. Installed Desktop / Mobile PWA
 *
 * Security Note: No server secrets or GEMINI_API_KEY values are ever embedded here.
 */

const STORAGE_KEY_API_BASE = 'alya_custom_api_base_url_v1';

// Default hosted Cloud Run backend URLs for packaged Android APK builds when no custom URL is set
const DEFAULT_DEV_BACKEND_URL = 'https://ais-dev-y7i5w4adihz6rn7hgkovjj-893936621001.asia-east1.run.app';
const DEFAULT_SHARED_BACKEND_URL = 'https://ais-pre-y7i5w4adihz6rn7hgkovjj-893936621001.asia-east1.run.app';
const DEFAULT_API_TIMEOUT_MS = 25000;

let fetchInterceptorInstalled = false;
let nativeFetchRef: typeof fetch | null = null;
let lastVerifiedRemoteBaseUrl = '';

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

  // Native AndroidBridge or Capacitor native platform
  const hasAndroidBridge = Boolean((window as any).AndroidBridge);
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());

  if (hasAndroidBridge || isCapacitorNative) {
    return true;
  }

  // File protocol, Capacitor scheme, or Android WebViewAssetLoader domain
  if (
    protocol === 'file:' ||
    protocol === 'capacitor:' ||
    protocol === 'ionic:' ||
    hostname === 'appassets.androidplatform.net'
  ) {
    return true;
  }

  // Capacitor Android default scheme uses https://localhost (with no port)
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
  addCandidate((import.meta as any).env?.VITE_APP_URL);
  addCandidate(DEFAULT_DEV_BACKEND_URL);
  addCandidate(DEFAULT_SHARED_BACKEND_URL);

  return candidates;
}

/**
 * Resolves the active API base URL.
 * - On standard Web/PWA hosted together with the Express server, returns `""` (same-origin) unless
 *   the user explicitly saved a valid custom backend URL in Settings.
 * - On packaged Android APK / Capacitor origins, returns the highest-priority valid remote HTTPS origin
 *   (never localhost or non-URL strings).
 */
export function getApiBaseUrl(): string {
  const customUrl = getCustomApiBaseUrl();
  if (customUrl) {
    return customUrl;
  }

  if (isPackagedNativeOrigin()) {
    const candidates = getCandidateRemoteBaseUrls();
    return candidates[0] || DEFAULT_DEV_BACKEND_URL;
  }

  // On hosted Web/PWA, always use same-origin so cookies, SSE streams, and CORS work seamlessly
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
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`API request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  const onCallerAbort = () => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timer);
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
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
function isUnexpectedHtmlApiResponse(res: Response): boolean {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    return true;
  }
  if (res.redirected && res.url && (res.url.includes('__cookie_check.html') || res.url.includes('applet-auth-bridge'))) {
    return true;
  }
  return false;
}

/**
 * Cross-platform fetch wrapper that resolves `/api/*` paths to the active backend origin,
 * enforces safe request timeouts, logs safe diagnostics, and automatically fails over across
 * candidate remote URLs when running in a packaged Android APK.
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

  const nativeOrigin = isPackagedNativeOrigin();
  const customUrl = getCustomApiBaseUrl();
  const baseCandidates = nativeOrigin
    ? getCandidateRemoteBaseUrls()
    : customUrl
    ? [customUrl, '']
    : [''];

  let lastError: any = null;
  let lastBadResponse: Response | null = null;

  for (let i = 0; i < baseCandidates.length; i++) {
    const base = baseCandidates[i];
    const targetUrl = base ? `${base}${apiPath}` : apiPath;
    const startTime = Date.now();
    const { signal, cleanup } = createTimedRequestSignal(init?.signal, DEFAULT_API_TIMEOUT_MS);

    try {
      const res = await originalFetch(targetUrl, {
        ...init,
        signal,
      });
      cleanup();

      const elapsedMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || 'unknown';

      if (isUnexpectedHtmlApiResponse(res)) {
        console.warn(
          `[API Diagnostic] ${method} ${apiPath} via ${base || 'same-origin'} returned unexpected HTML (${res.status}) in ${elapsedMs}ms`,
        );
        lastBadResponse = res;
        if (i < baseCandidates.length - 1) {
          continue;
        }
        return res;
      }

      if ((res.status === 404 || res.status === 502 || res.status === 503 || res.status === 504) && i < baseCandidates.length - 1) {
        console.warn(
          `[API Diagnostic] ${method} ${apiPath} via ${base || 'same-origin'} returned ${res.status} in ${elapsedMs}ms; trying fallback origin`,
        );
        lastBadResponse = res;
        continue;
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
      lastError = err;

      // If the caller explicitly aborted the request (e.g. user interrupted speech), do not fail over
      if (init?.signal?.aborted) {
        throw err;
      }

      console.warn(
        `[API Diagnostic] ${method} ${apiPath} network error via ${base || 'same-origin'} after ${elapsedMs}ms: ${
          err?.message || 'Request failed'
        }`,
      );

      if (i < baseCandidates.length - 1) {
        continue;
      }
    }
  }

  if (lastBadResponse) {
    return lastBadResponse;
  }

  throw lastError || new Error(`Network connection failed for ${apiPath}`);
}

/**
 * Installs a transparent `window.fetch` interceptor when the host environment permits it.
 * Safely guards against getter-only / non-configurable `window.fetch` descriptors
 * (such as inside preview iframes).
 */
export function installApiFetchInterceptor(): void {
  if (typeof window === 'undefined' || fetchInterceptorInstalled) return;
  fetchInterceptorInstalled = true;

  // Capture the underlying native fetch before any potential override
  getNativeFetch();

  // Proactively validate any stored custom backend URL on startup
  getCustomApiBaseUrl();

  try {
    const ownDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    const protoDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window) || {}, 'fetch');
    const desc = ownDesc || protoDesc;

    // If fetch is a non-configurable getter without a setter, do not attempt to overwrite it
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

