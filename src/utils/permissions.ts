export type PermissionKind = 'microphone' | 'location' | 'notifications';

export interface PermissionStatusResult {
  state: 'granted' | 'denied' | 'prompt' | 'unsupported';
  reason?: string;
}

const STORAGE_KEYS = {
  LOCATION_DENIED_EXPLICITLY: 'alya_perm_location_denied_explicitly',
  LOCATION_PROMPTED_COUNT: 'alya_perm_location_prompted_count',
};

/**
 * Privacy-First Permission Manager
 * Strictly guards user privacy:
 * - Timezone defaults to device/browser without requesting geolocation
 * - Location is strictly opt-in and optional
 * - Never badgers user if previously denied
 * - Never silently tracks background coordinates
 */
export class PermissionManager {
  /**
   * Check browser permission state using Permission API if supported
   */
  static async queryPermission(kind: PermissionKind): Promise<PermissionStatusResult> {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      return { state: 'prompt' };
    }

    try {
      let queryName: PermissionName | undefined;
      if (kind === 'microphone') {
        queryName = 'microphone' as PermissionName;
      } else if (kind === 'location') {
        queryName = 'geolocation' as PermissionName;
      } else if (kind === 'notifications') {
        queryName = 'notifications' as PermissionName;
      }

      if (!queryName) return { state: 'prompt' };

      const status = await navigator.permissions.query({ name: queryName });
      return { state: status.state as any };
    } catch (_) {
      // Some browsers (like Safari/Firefox) don't support querying certain permissions
      return { state: 'prompt' };
    }
  }

  /**
   * Check if user explicitly denied location in the app before
   */
  static hasUserDeniedLocation(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.LOCATION_DENIED_EXPLICITLY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Record that the user chose "Deny" or "Not Now" for location
   */
  static markLocationDenied(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATION_DENIED_EXPLICITLY, 'true');
    } catch (_) {}
  }

  /**
   * Request microphone access only when user activates voice/STT
   */
  static async requestMicrophone(): Promise<{ success: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return {
        success: false,
        error: 'Microphone is not supported in this browser. Please use Chrome, Edge, or Safari.',
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop temporary test tracks to release mic hardware
      stream.getTracks().forEach((track) => track.stop());
      return { success: true };
    } catch (err: any) {
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('denied');
      return {
        success: false,
        error: isDenied
          ? 'Microphone permission was not granted. Please allow microphone in browser address bar.'
          : err?.message || 'Failed to initialize microphone.',
      };
    }
  }

  /**
   * Request approximate location strictly with user consent.
   * If denied, resolves with null without erroring or breaking the app.
   */
  static async requestOptionalLocation(): Promise<{
    allowed: boolean;
    timezoneRegion?: string;
    error?: string;
  }> {
    if (this.hasUserDeniedLocation()) {
      return { allowed: false, error: 'Location previously declined. Using system timezone.' };
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { allowed: false, error: 'Geolocation not supported by device.' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Privacy protection: Do NOT store latitude/longitude in memory or storage.
          // Only use coordinates to detect timezone / general region if needed.
          resolve({
            allowed: true,
            timezoneRegion: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        },
        (error) => {
          // If user clicked block or cancel, respect it and mark as denied
          if (error.code === error.PERMISSION_DENIED) {
            this.markLocationDenied();
          }
          resolve({
            allowed: false,
            error: error.message || 'Location permission declined.',
          });
        },
        {
          enableHighAccuracy: false, // Low power, privacy-friendly approximate
          timeout: 8000,
          maximumAge: 600000, // 10 minute cache
        }
      );
    });
  }
}
