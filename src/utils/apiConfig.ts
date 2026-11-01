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

// Default hosted Cloud Run backend URL for packaged Android APK builds when no custom URL is set
const DEFAULT_REMOTE_BACKEND_URL = 'https://ais-pre-y7i5w4adihz6rn7hgkovjj-893936621001.asia-east1.run.app';

let fetchInterceptorInstalled = false;
let nativeFetchRef: typeof fetch | null = null;

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
 * Returns any user-configured custom backend server URL from localStorage.
 */
export function getCustomApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeBaseUrl(localStorage.getItem(STORAGE_KEY_API_BASE) || '');
  } catch {
    return '';
  }
}

/**
 * Saves or clears a custom backend server URL in localStorage.
 */
export function setCustomApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeBaseUrl(url);
    if (normalized) {
      localStorage.setItem(STORAGE_KEY_API_BASE, normalized);
    } else {
      localStorage.removeItem(STORAGE_KEY_API_BASE);
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Resolves the active API base URL.
 * - On standard Web/PWA hosted together with the Express server, returns `""` (same-origin) unless overridden.
 * - On packaged Android APK / Capacitor origins, returns:
 *   1. User-configured custom backend URL (if set in Settings)
 *   2. Build-time `VITE_API_BASE_URL` or injected `APP_URL`
 *   3. Default production Cloud Run backend URL
 */
export function getApiBaseUrl(): string {
  const customUrl = getCustomApiBaseUrl();
  if (customUrl) {
    return customUrl;
  }

  const envApiBase = normalizeBaseUrl(
    (import.meta as any).env?.VITE_API_BASE_URL ||
      (import.meta as any).env?.VITE_APP_URL ||
      '',
  );

  if (isPackagedNativeOrigin()) {
    if (envApiBase && !envApiBase.includes('MY_APP_URL')) {
      return envApiBase;
    }
    return DEFAULT_REMOTE_BACKEND_URL;
  }

  // In web browser: if VITE_API_BASE_URL is explicitly configured to a remote host, respect it; otherwise same-origin
  if (envApiBase && !envApiBase.includes('MY_APP_URL') && typeof window !== 'undefined') {
    try {
      const parsed = new URL(envApiBase);
      if (parsed.origin !== window.location.origin) {
        return envApiBase;
      }
    } catch {
      // Fallback to same-origin
    }
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
 * Cross-platform fetch wrapper that resolves `/api/*` paths to the active backend origin
 * without relying on mutating `window.fetch`.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const originalFetch = getNativeFetch();

  if (typeof input === 'string') {
    if (input.startsWith('/api/') || input === '/api') {
      const resolved = resolveApiUrl(input);
      return originalFetch(resolved, init);
    }
    return originalFetch(input, init);
  }

  if (input instanceof URL) {
    if (
      typeof window !== 'undefined' &&
      (input.pathname.startsWith('/api/') || input.pathname === '/api') &&
      input.origin === window.location.origin
    ) {
      const base = getApiBaseUrl();
      if (base) {
        const rewritten = `${base}${input.pathname}${input.search}`;
        return originalFetch(rewritten, init);
      }
    }
    return originalFetch(input, init);
  }

  if (typeof Request !== 'undefined' && input instanceof Request && typeof window !== 'undefined') {
    try {
      const reqUrl = new URL(input.url, window.location.origin);
      if (
        (reqUrl.pathname.startsWith('/api/') || reqUrl.pathname === '/api') &&
        reqUrl.origin === window.location.origin
      ) {
        const base = getApiBaseUrl();
        if (base) {
          const rewrittenUrl = `${base}${reqUrl.pathname}${reqUrl.search}`;
          const clonedInit: RequestInit = {
            method: input.method,
            headers: input.headers,
            mode: 'cors',
            credentials: 'omit',
            signal: input.signal,
            ...init,
          };
          if (input.method !== 'GET' && input.method !== 'HEAD' && !clonedInit.body) {
            clonedInit.body = await input.clone().blob();
          }
          return originalFetch(rewrittenUrl, clonedInit);
        }
      }
    } catch {
      // Proceed with original request
    }
  }

  return originalFetch(input, init);
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
