/**
 * Platform Environment Detection & Browser Engine Bridge
 * Cleanly distinguishes between:
 * - Android WebView / Capacitor / Cordova (Native App containers)
 * - Chrome Custom Tabs / PWA standalone
 * - Standard Web Preview (Google AI Studio iFrame & modern desktop/mobile browsers)
 */

export interface PlatformCapabilities {
  isAndroid: boolean;
  isAndroidWebView: boolean;
  isCapacitor: boolean;
  isCordova: boolean;
  isPWA: boolean;
  isWebPreview: boolean;
  hasNativeBrowserBridge: boolean;
  platformName: string;
  supportsPersistentStorage: boolean;
  supportsFullCookies: boolean;
  engineDescription: string;
}

export function detectPlatform(): PlatformCapabilities {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isAndroidWebView: false,
      isCapacitor: false,
      isCordova: false,
      isPWA: false,
      isWebPreview: true,
      hasNativeBrowserBridge: false,
      platformName: 'Server / Node Environment',
      supportsPersistentStorage: false,
      supportsFullCookies: false,
      engineDescription: 'Server Side',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isAndroidWebView =
    Boolean((window as any).AndroidBridge) ||
    Boolean((window as any).alyaNativeBrowser) ||
    Boolean((window as any).Android) ||
    /wv|WebView|Version\/[\d\.]+ Chrome/i.test(ua);

  const isCapacitor = Boolean((window as any).Capacitor);
  const isCordova = Boolean((window as any).cordova);
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const hasNativeBrowserBridge =
    Boolean((window as any).AndroidBridge?.openUrl) ||
    Boolean((window as any).alyaNativeBrowser?.openTab) ||
    Boolean((window as any).Capacitor?.Plugins?.Browser?.open);

  let platformName = 'Web Preview Engine';
  let engineDescription = 'Standard Web Sandbox (Iframe + Direct Navigation)';

  if (isCapacitor) {
    platformName = 'Capacitor Android/iOS Container';
    engineDescription = 'Capacitor Native InAppBrowser / Chrome Custom Tabs';
  } else if (isCordova) {
    platformName = 'Apache Cordova Container';
    engineDescription = 'Cordova InAppBrowser System Engine';
  } else if (isAndroidWebView) {
    platformName = 'Android Native WebView';
    engineDescription = 'Android WebKit System Engine';
  } else if (isPWA) {
    platformName = 'Progressive Web App (PWA)';
    engineDescription = 'Standalone PWA Engine';
  }

  const isWebPreview = !isCapacitor && !isCordova && !isAndroidWebView;

  return {
    isAndroid,
    isAndroidWebView,
    isCapacitor,
    isCordova,
    isPWA,
    isWebPreview,
    hasNativeBrowserBridge,
    platformName,
    supportsPersistentStorage: typeof localStorage !== 'undefined',
    supportsFullCookies: !isWebPreview || isPWA || isAndroidWebView,
    engineDescription,
  };
}

/**
 * Open requested URL in native browser container or new browser context
 */
export function openExternalBrowser(url: string): boolean {
  if (!url || typeof window === 'undefined') return false;
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    // 1. Android Native Bridge / Custom Tabs
    if ((window as any).AndroidBridge?.openUrl) {
      (window as any).AndroidBridge.openUrl(targetUrl);
      return true;
    }
    if ((window as any).Android?.openUrl) {
      (window as any).Android.openUrl(targetUrl);
      return true;
    }
    if ((window as any).alyaNativeBrowser?.openTab) {
      (window as any).alyaNativeBrowser.openTab(targetUrl);
      return true;
    }

    // 2. Capacitor InAppBrowser / Chrome Custom Tabs
    if ((window as any).Capacitor?.Plugins?.Browser?.open) {
      (window as any).Capacitor.Plugins.Browser.open({ url: targetUrl });
      return true;
    }

    // 3. Cordova InAppBrowser
    if ((window as any).cordova?.InAppBrowser?.open) {
      (window as any).cordova.InAppBrowser.open(targetUrl, '_system');
      return true;
    }

    // 4. Standard Web Environment
    // Use window.open directly during user click
    const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (win && !win.closed && typeof win.closed !== 'undefined') {
      try {
        win.focus();
      } catch (_) {}
      return true;
    }
  } catch (err) {
    console.warn('Direct browser launch failed:', err);
  }

  // 5. Secondary fallback: DOM Anchor click
  try {
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      } catch (_) {}
    }, 150);
    return true;
  } catch (_) {}

  return false;
}

/**
 * Parse YouTube URLs and extract video ID for official player embed
 */
export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // Pattern 1: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = clean.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Pattern 2: youtube.com/shorts/VIDEO_ID
  const shortsMatch = clean.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  return null;
}

/**
 * Generate official compliant YouTube player embed URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
    origin
  )}&rel=0`;
}

/**
 * Check if domain is known to strictly prohibit third-party framing
 */
export const KNOWN_XFO_RESTRICTED_DOMAINS = [
  'google.com',
  'accounts.google.com',
  'github.com',
  'youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  'netflix.com',
  'amazon.com',
  'apple.com',
  'microsoft.com',
  'login.live.com',
  'developer.mozilla.org',
  'stackoverflow.com',
];

export function isDomainRestricted(url: string): boolean {
  if (!url || url.startsWith('alya://') || url.startsWith('search://')) return false;
  // YouTube videos have official embeds
  if (parseYouTubeVideoId(url)) return false;

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    return KNOWN_XFO_RESTRICTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
