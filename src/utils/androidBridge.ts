/**
 * Android Native App Discovery, Intent Launcher & Settings Bridge
 * Respects Android 11+ (API 30+) package visibility (<queries>) restrictions.
 * Never collects or transmits unnecessary installed package lists.
 */

import { detectPlatform, openExternalBrowser } from './platformEnvironment';

export interface AndroidAppDefinition {
  id: string;
  name: string;
  packageName: string;
  category: 'Media' | 'Browser' | 'System' | 'Social' | 'Messaging' | 'Productivity' | 'Games' | 'Utilities';
  aliases: string[];
  androidScheme?: string;
  androidIntentAction?: string;
  webFallbackUrl: string;
  searchUrlTemplate?: string;
  androidSearchIntentTemplate?: string;
  isSystemApp?: boolean;
  isCustomUserApp?: boolean;
}

export interface AppMatchResult {
  status: 'exact' | 'ambiguous' | 'not_found';
  app?: AndroidAppDefinition;
  candidates?: AndroidAppDefinition[];
  rawQuery: string;
}

export interface AppLaunchResult {
  success: boolean;
  app: AndroidAppDefinition;
  method: 'native_bridge' | 'android_intent' | 'web_fallback';
  message: string;
  openedUrl?: string;
}

const CUSTOM_APPS_STORAGE_KEY = 'alya_user_installed_apps_v1';

/**
 * Curated Android application catalog with minimum required package visibility
 * and supported Android intent schemes.
 */
export const DEFAULT_ANDROID_APPS: AndroidAppDefinition[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    category: 'Media',
    aliases: ['youtube', 'yt', 'you tube', 'यूट्यूब', 'युवाट्यूब'],
    androidScheme: 'vnd.youtube://',
    webFallbackUrl: 'https://www.youtube.com',
    searchUrlTemplate: 'https://www.youtube.com/results?search_query={query}',
    androidSearchIntentTemplate:
      'intent://results?search_query={query}#Intent;scheme=vnd.youtube;package=com.google.android.youtube;S.browser_fallback_url=https%3A%2F%2Fwww.youtube.com%2Fresults%3Fsearch_query%3D{query};end',
  },
  {
    id: 'youtube_music',
    name: 'YouTube Music',
    packageName: 'com.google.android.apps.youtube.music',
    category: 'Media',
    aliases: ['youtube music', 'yt music', 'यूट्यूब म्यूजिक'],
    androidScheme: 'youtubemusic://',
    webFallbackUrl: 'https://music.youtube.com',
    searchUrlTemplate: 'https://music.youtube.com/search?q={query}',
  },
  {
    id: 'google',
    name: 'Google',
    packageName: 'com.google.android.googlequicksearchbox',
    category: 'Browser',
    aliases: ['google', 'google app', 'google search', 'गूगल', 'गुगल'],
    androidScheme: 'googleapp://',
    webFallbackUrl: 'https://www.google.com',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
    androidSearchIntentTemplate:
      'intent://www.google.com/search?q={query}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;S.browser_fallback_url=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3D{query};end',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    packageName: 'com.android.chrome',
    category: 'Browser',
    aliases: ['chrome', 'google chrome', 'chrome browser', 'क्रोम'],
    androidScheme: 'googlechrome://navigate?url=https://www.google.com',
    webFallbackUrl: 'https://www.google.com',
    searchUrlTemplate: 'https://www.google.com/search?q={query}',
  },
  {
    id: 'settings',
    name: 'Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['settings', 'setting', 'phone settings', 'system settings', 'सेटिंग्स', 'सेटिंग'],
    androidIntentAction: 'android.settings.SETTINGS',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'wifi_settings',
    name: 'Wi-Fi Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['wifi settings', 'wi-fi settings', 'wifi setting', 'वाईफाई सेटिंग्स'],
    androidIntentAction: 'android.settings.WIFI_SETTINGS',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'bluetooth_settings',
    name: 'Bluetooth Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['bluetooth settings', 'bluetooth setting', 'ब्लूटूथ सेटिंग्स'],
    androidIntentAction: 'android.settings.BLUETOOTH_SETTINGS',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'display_settings',
    name: 'Display Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['display settings', 'brightness settings', 'screen settings', 'डिस्प्ले सेटिंग्स'],
    androidIntentAction: 'android.settings.DISPLAY_SETTINGS',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'sound_settings',
    name: 'Sound Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['sound settings', 'volume settings', 'audio settings', 'साउंड सेटिंग्स'],
    androidIntentAction: 'android.settings.SOUND_SETTINGS',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'battery_settings',
    name: 'Battery Settings',
    packageName: 'com.android.settings',
    category: 'System',
    aliases: ['battery settings', 'power settings', 'बैटरी सेटिंग्स'],
    androidIntentAction: 'android.intent.action.POWER_USAGE_SUMMARY',
    webFallbackUrl: 'alya://settings',
    isSystemApp: true,
  },
  {
    id: 'gallery',
    name: 'Gallery',
    packageName: 'com.google.android.apps.photos',
    category: 'Media',
    aliases: ['gallery', 'photos', 'google photos', 'photo gallery', 'album', 'गैलरी', 'फोटो'],
    androidIntentAction: 'android.intent.action.VIEW',
    webFallbackUrl: 'https://photos.google.com',
    isSystemApp: true,
  },
  {
    id: 'camera',
    name: 'Camera',
    packageName: 'com.android.camera',
    category: 'Media',
    aliases: ['camera', 'photo camera', 'कैमरा'],
    androidIntentAction: 'android.media.action.IMAGE_CAPTURE',
    webFallbackUrl: 'alya://screen_tools',
    isSystemApp: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    category: 'Messaging',
    aliases: ['whatsapp', 'whats app', 'wa', 'व्हाट्सएप', 'व्हाट्सऐप'],
    androidScheme: 'whatsapp://app',
    webFallbackUrl: 'https://web.whatsapp.com',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    category: 'Social',
    aliases: ['instagram', 'insta', 'ig', 'इंस्टाग्राम'],
    androidScheme: 'instagram://app',
    webFallbackUrl: 'https://www.instagram.com',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    category: 'Productivity',
    aliases: ['gmail', 'email', 'google mail', 'जीमेल', 'ईमेल'],
    androidScheme: 'googlegmail://',
    webFallbackUrl: 'https://mail.google.com',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    packageName: 'com.google.android.apps.maps',
    category: 'Utilities',
    aliases: ['maps', 'google maps', 'map', 'navigation', 'मैप्स', 'गूगल मैप्स'],
    androidScheme: 'geo:0,0?q=',
    webFallbackUrl: 'https://maps.google.com',
    searchUrlTemplate: 'https://www.google.com/maps/search/{query}',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    packageName: 'com.spotify.music',
    category: 'Media',
    aliases: ['spotify', 'स्पॉटिफाई'],
    androidScheme: 'spotify://',
    webFallbackUrl: 'https://open.spotify.com',
    searchUrlTemplate: 'https://open.spotify.com/search/{query}',
  },
  {
    id: 'play_store',
    name: 'Google Play Store',
    packageName: 'com.android.vending',
    category: 'System',
    aliases: ['play store', 'google play', 'playstore', 'app store', 'प्ले स्टोर'],
    androidScheme: 'market://search?q=',
    webFallbackUrl: 'https://play.google.com/store',
    searchUrlTemplate: 'https://play.google.com/store/search?q={query}&c=apps',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    packageName: 'com.google.android.calculator',
    category: 'Utilities',
    aliases: ['calculator', 'calc', 'कैलकुलेटर'],
    androidIntentAction: 'android.intent.action.MAIN',
    webFallbackUrl: 'https://www.google.com/search?q=calculator',
    isSystemApp: true,
  },
  {
    id: 'clock',
    name: 'Clock & Alarm',
    packageName: 'com.google.android.deskclock',
    category: 'Utilities',
    aliases: ['clock', 'alarm', 'timer', 'stopwatch', 'घड़ी', 'अलार्म'],
    androidIntentAction: 'android.intent.action.SHOW_ALARMS',
    webFallbackUrl: 'https://www.google.com/search?q=timer',
    isSystemApp: true,
  },
  {
    id: 'files',
    name: 'Files',
    packageName: 'com.google.android.apps.nbu.files',
    category: 'Utilities',
    aliases: ['files', 'file manager', 'my files', 'फाइल्स', 'फाइल मैनेजर'],
    androidIntentAction: 'android.intent.action.GET_CONTENT',
    webFallbackUrl: 'https://drive.google.com',
    isSystemApp: true,
  },
  {
    id: 'phone_dialer',
    name: 'Phone Dialer',
    packageName: 'com.google.android.dialer',
    category: 'System',
    aliases: ['dialer', 'phone dialer', 'call app', 'डायलर'],
    androidScheme: 'tel:',
    webFallbackUrl: 'tel:',
    isSystemApp: true,
  },
  {
    id: 'contacts',
    name: 'Contacts',
    packageName: 'com.google.android.contacts',
    category: 'Utilities',
    aliases: ['contacts', 'contact list', 'address book', 'कॉन्टैक्ट्स'],
    androidIntentAction: 'android.intent.action.VIEW',
    webFallbackUrl: 'https://contacts.google.com',
    isSystemApp: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    packageName: 'org.telegram.messenger',
    category: 'Messaging',
    aliases: ['telegram', 'tg', 'टेलीग्राम'],
    androidScheme: 'tg://',
    webFallbackUrl: 'https://web.telegram.org',
  },
  {
    id: 'discord',
    name: 'Discord',
    packageName: 'com.discord',
    category: 'Social',
    aliases: ['discord', 'डिस्कॉर्ड'],
    androidScheme: 'discord://',
    webFallbackUrl: 'https://discord.com/app',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    packageName: 'com.netflix.mediaclient',
    category: 'Media',
    aliases: ['netflix', 'नेटफ्लिक्स'],
    androidScheme: 'nflx://',
    webFallbackUrl: 'https://www.netflix.com',
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    packageName: 'com.mojang.minecraftpe',
    category: 'Games',
    aliases: ['minecraft', 'mcpe', 'माइनक्राफ्ट'],
    androidScheme: 'minecraft://',
    webFallbackUrl: 'https://www.minecraft.net',
  },
  {
    id: 'bgmi',
    name: 'Battlegrounds Mobile India (BGMI)',
    packageName: 'com.pubg.imobile',
    category: 'Games',
    aliases: ['bgmi', 'battlegrounds mobile', 'pubg', 'बीजीएमआई'],
    webFallbackUrl: 'https://www.battlegroundsmobileindia.com',
  },
];

/**
 * Ambiguous category terms that should prompt clarification when spoken generically
 */
const AMBIGUOUS_CATEGORY_GROUPS: Record<string, string[]> = {
  music: ['youtube_music', 'spotify'],
  'music app': ['youtube_music', 'spotify'],
  'गाना': ['youtube_music', 'spotify'],
  browser: ['chrome', 'google'],
  'वेब ब्राउज़र': ['chrome', 'google'],
  chat: ['whatsapp', 'telegram', 'discord'],
  'चैट ऐप': ['whatsapp', 'telegram'],
  video: ['youtube', 'netflix'],
};

export class AndroidBridgeService {
  /**
   * Load any user-registered custom apps from local device storage (privacy-preserving, never transmitted)
   */
  static getUserRegisteredApps(): AndroidAppDefinition[] {
    try {
      const raw = localStorage.getItem(CUSTOM_APPS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveUserRegisteredApp(app: {
    name: string;
    packageName: string;
    webFallbackUrl?: string;
    category?: AndroidAppDefinition['category'];
  }): AndroidAppDefinition {
    const cleanName = app.name.trim();
    const cleanPkg = app.packageName.trim() || `com.custom.${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const id = `custom_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const newEntry: AndroidAppDefinition = {
      id,
      name: cleanName,
      packageName: cleanPkg,
      category: app.category || 'Utilities',
      aliases: [cleanName.toLowerCase()],
      webFallbackUrl: app.webFallbackUrl?.trim() || `https://play.google.com/store/apps/details?id=${encodeURIComponent(cleanPkg)}`,
      isCustomUserApp: true,
    };

    const existing = this.getUserRegisteredApps().filter((a) => a.id !== id);
    const updated = [newEntry, ...existing];
    try {
      localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
    return newEntry;
  }

  static removeUserRegisteredApp(id: string): void {
    const existing = this.getUserRegisteredApps().filter((a) => a.id !== id);
    try {
      localStorage.setItem(CUSTOM_APPS_STORAGE_KEY, JSON.stringify(existing));
    } catch (_) {}
  }

  static getAllKnownApps(): AndroidAppDefinition[] {
    return [...this.getUserRegisteredApps(), ...DEFAULT_ANDROID_APPS];
  }

  /**
   * Match spoken or typed app name against installed/supported Android apps.
   * Handles exact matches, partial/ambiguous matches, and unknown apps accurately.
   */
  static matchApp(rawAppName: string): AppMatchResult {
    const normalized = (rawAppName || '')
      .toLowerCase()
      .replace(/\b(the|mera|meri|apna|phone|mein|me|installed|app|application|vala|wala|ko|zara|please|plz)\b/gi, ' ')
      .replace(/[.,!?'"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) {
      return { status: 'not_found', rawQuery: rawAppName };
    }

    const allApps = this.getAllKnownApps();

    // 1. Check native Android bridge first if running inside Android APK container
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    if (nativeBridge && typeof nativeBridge.findMatchingApps === 'function') {
      try {
        const nativeResultJson = nativeBridge.findMatchingApps(normalized);
        const nativeMatches = JSON.parse(nativeResultJson);
        if (Array.isArray(nativeMatches)) {
          if (nativeMatches.length === 1) {
            const m = nativeMatches[0];
            return {
              status: 'exact',
              rawQuery: rawAppName,
              app: {
                id: m.packageName,
                name: m.label || rawAppName,
                packageName: m.packageName,
                category: 'Utilities',
                aliases: [normalized],
                webFallbackUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(m.packageName)}`,
              },
            };
          } else if (nativeMatches.length > 1) {
            return {
              status: 'ambiguous',
              rawQuery: rawAppName,
              candidates: nativeMatches.slice(0, 4).map((m: any) => ({
                id: m.packageName,
                name: m.label,
                packageName: m.packageName,
                category: 'Utilities',
                aliases: [m.label.toLowerCase()],
                webFallbackUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(m.packageName)}`,
              })),
            };
          }
        }
      } catch (_) {}
    }

    // 2. Check explicit ambiguous category keywords (e.g., "music app", "browser")
    if (AMBIGUOUS_CATEGORY_GROUPS[normalized]) {
      const candidateIds = AMBIGUOUS_CATEGORY_GROUPS[normalized];
      const candidates = allApps.filter((a) => candidateIds.includes(a.id));
      if (candidates.length > 1) {
        return {
          status: 'ambiguous',
          candidates,
          rawQuery: rawAppName,
        };
      }
    }

    // 3. Check exact alias or name match
    const exactMatch = allApps.find(
      (app) =>
        app.name.toLowerCase() === normalized ||
        app.id.toLowerCase() === normalized ||
        app.packageName.toLowerCase() === normalized ||
        app.aliases.some((alias) => alias.toLowerCase() === normalized)
    );
    if (exactMatch) {
      return { status: 'exact', app: exactMatch, rawQuery: rawAppName };
    }

    // 4. Check prefix or substring matches across known apps
    const partialMatches = allApps.filter(
      (app) =>
        app.name.toLowerCase().includes(normalized) ||
        normalized.includes(app.name.toLowerCase()) ||
        app.aliases.some((alias) => alias.includes(normalized) || (alias.length >= 4 && normalized.includes(alias)))
    );

    if (partialMatches.length === 1) {
      return { status: 'exact', app: partialMatches[0], rawQuery: rawAppName };
    }

    if (partialMatches.length > 1) {
      return {
        status: 'ambiguous',
        candidates: partialMatches.slice(0, 3),
        rawQuery: rawAppName,
      };
    }

    return {
      status: 'not_found',
      rawQuery: rawAppName.trim(),
    };
  }

  /**
   * Launch an Android app or search intent using the best supported mechanism:
   * 1. Native AndroidBridge (if inside APK WebView / Capacitor)
   * 2. Android intent:// URI (if on Android mobile browser)
   * 3. Web fallback / internal screen navigation
   */
  static launchApp(
    app: AndroidAppDefinition,
    options?: {
      searchQuery?: string;
      onInternalNavigate?: (screen: 'settings' | 'screen_tools') => void;
    }
  ): AppLaunchResult {
    const platform = detectPlatform();
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    const cleanQuery = options?.searchQuery?.trim();

    // Handle internal settings/camera fallback when in web preview
    if (!platform.isAndroid && !nativeBridge) {
      if (app.webFallbackUrl === 'alya://settings' && options?.onInternalNavigate) {
        options.onInternalNavigate('settings');
        return {
          success: true,
          app,
          method: 'web_fallback',
          message: `Opened ${app.name} panel`,
          openedUrl: 'alya://settings',
        };
      }
      if (app.webFallbackUrl === 'alya://screen_tools' && options?.onInternalNavigate) {
        options.onInternalNavigate('screen_tools');
        return {
          success: true,
          app,
          method: 'web_fallback',
          message: `Opened ${app.name} / Screen Tools`,
          openedUrl: 'alya://screen_tools',
        };
      }
    }

    // 1. Native Android Bridge (Capacitor / Android WebView JavascriptInterface)
    if (nativeBridge) {
      try {
        if (cleanQuery && typeof nativeBridge.launchAppSearch === 'function') {
          const launched = nativeBridge.launchAppSearch(app.packageName, cleanQuery);
          if (launched) {
            return {
              success: true,
              app,
              method: 'native_bridge',
              message: `Launched ${app.name} with search "${cleanQuery}" on Android`,
            };
          }
        }
        if (app.androidIntentAction && typeof nativeBridge.openSystemIntent === 'function') {
          const launched = nativeBridge.openSystemIntent(app.androidIntentAction);
          if (launched) {
            return {
              success: true,
              app,
              method: 'native_bridge',
              message: `Opened Android system screen: ${app.name}`,
            };
          }
        }
        if (typeof nativeBridge.launchPackage === 'function') {
          const launched = nativeBridge.launchPackage(app.packageName);
          if (launched) {
            return {
              success: true,
              app,
              method: 'native_bridge',
              message: `Launched ${app.name} (${app.packageName})`,
            };
          }
        }
      } catch (err) {
        console.warn('Native bridge launch error, falling back to intent/web:', err);
      }
    }

    // 2. Android Browser Intent URI (when running in Chrome on an Android phone)
    if (platform.isAndroid) {
      try {
        if (cleanQuery && app.androidSearchIntentTemplate) {
          const intentUrl = app.androidSearchIntentTemplate.replace(
            /\{query\}/g,
            encodeURIComponent(cleanQuery)
          );
          window.location.href = intentUrl;
          return {
            success: true,
            app,
            method: 'android_intent',
            message: `Triggered Android intent for ${app.name} ("${cleanQuery}")`,
            openedUrl: intentUrl,
          };
        }

        if (app.androidIntentAction) {
          const fallbackEncoded = encodeURIComponent(window.location.href);
          const intentUri = `intent:#Intent;action=${app.androidIntentAction};S.browser_fallback_url=${fallbackEncoded};end`;
          window.location.href = intentUri;
          return {
            success: true,
            app,
            method: 'android_intent',
            message: `Triggered Android system intent: ${app.name}`,
            openedUrl: intentUri,
          };
        }

        const fallbackUrl =
          cleanQuery && app.searchUrlTemplate
            ? app.searchUrlTemplate.replace('{query}', encodeURIComponent(cleanQuery))
            : app.webFallbackUrl;

        const intentUri = `intent:#Intent;package=${app.packageName};S.browser_fallback_url=${encodeURIComponent(
          fallbackUrl
        )};end`;
        window.location.href = intentUri;
        return {
          success: true,
          app,
          method: 'android_intent',
          message: `Triggered Android package launch for ${app.name}`,
          openedUrl: intentUri,
        };
      } catch (_) {}
    }

    // 3. Standard Web / Desktop Preview Fallback
    const targetUrl =
      cleanQuery && app.searchUrlTemplate
        ? app.searchUrlTemplate.replace('{query}', encodeURIComponent(cleanQuery))
        : app.webFallbackUrl;

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      openExternalBrowser(targetUrl);
    }

    return {
      success: true,
      app,
      method: 'web_fallback',
      message: cleanQuery
        ? `Opened ${app.name} search for "${cleanQuery}"`
        : `Opened ${app.name}`,
      openedUrl: targetUrl,
    };
  }
}
