/**
 * Background Companion & Android Foreground Service Manager
 * Respects Android 10–14+ foregroundServiceType="microphone|mediaProjection" restrictions.
 * Provides explicit user-visible controls: Start, Pause, Stop.
 * Minimizes battery usage and handles permission revocation gracefully.
 */

export type BackgroundServiceState = 'stopped' | 'running' | 'paused' | 'permission_revoked';

export interface BackgroundServiceStatus {
  state: BackgroundServiceState;
  startedAt: number | null;
  notificationActive: boolean;
  wakeLockActive: boolean;
  nativeForegroundService: boolean;
  statusMessage: string;
}

type StatusListener = (status: BackgroundServiceStatus) => void;

class BackgroundCompanionManager {
  private state: BackgroundServiceState = 'stopped';
  private startedAt: number | null = null;
  private wakeLockSentinel: any = null;
  private activeNotification: Notification | null = null;
  private listeners = new Set<StatusListener>();
  private statusMessage = 'Background companion is stopped.';
  private actionHandlers: {
    onResumeListening?: () => void;
    onPauseCompanion?: () => void;
    onStopCompanion?: () => void;
  } = {};

  public setActionHandlers(handlers: {
    onResumeListening?: () => void;
    onPauseCompanion?: () => void;
    onStopCompanion?: () => void;
  }) {
    this.actionHandlers = handlers;
    this.setupMediaSessionHandlers();
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): BackgroundServiceStatus {
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    return {
      state: this.state,
      startedAt: this.startedAt,
      notificationActive: Boolean(this.activeNotification) || Boolean(nativeBridge?.isForegroundServiceRunning?.()),
      wakeLockActive: Boolean(this.wakeLockSentinel),
      nativeForegroundService: Boolean(nativeBridge?.startForegroundService),
      statusMessage: this.statusMessage,
    };
  }

  private notify() {
    const snapshot = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (_) {}
    });
  }

  /**
   * Start user-visible background companion service
   */
  public async startService(companionName = 'Alya'): Promise<BackgroundServiceStatus> {
    this.state = 'running';
    this.startedAt = Date.now();
    this.statusMessage = `${companionName} Foreground Service Active — Ready in background`;

    // 1. Native Android Foreground Service Bridge (if inside APK)
    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    if (nativeBridge && typeof nativeBridge.startForegroundService === 'function') {
      try {
        nativeBridge.startForegroundService(
          `${companionName} AI Companion Active`,
          'Tap to open or use Pause/Stop controls'
        );
      } catch (err) {
        console.warn('Native foreground service start warning:', err);
      }
    }

    // 2. Request battery-friendly WakeLock so Android screen doesn't kill voice loop mid-turn
    await this.acquireWakeLock();

    // 3. Configure MediaSession controls for Android lock-screen / notification shade
    this.setupMediaSessionHandlers(companionName, 'Listening & Ready');

    // 4. Show persistent user-visible notification if Web Notifications are permitted
    await this.showPersistentNotification(
      `${companionName} Companion Active`,
      'Continuous voice companion is running. Use Pause or Stop anytime.'
    );

    this.notify();
    return this.getStatus();
  }

  /**
   * Pause background operation (releases microphone & wake lock immediately to save battery)
   */
  public async pauseService(companionName = 'Alya'): Promise<BackgroundServiceStatus> {
    if (this.state === 'stopped') return this.getStatus();
    this.state = 'paused';
    this.statusMessage = `${companionName} Background Service Paused (Battery Saver Active)`;

    await this.releaseWakeLock();

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    if (nativeBridge && typeof nativeBridge.updateForegroundNotification === 'function') {
      try {
        nativeBridge.updateForegroundNotification(
          `${companionName} Companion (Paused)`,
          'Microphone is paused. Tap to resume.'
        );
      } catch (_) {}
    }

    this.setupMediaSessionHandlers(companionName, 'Paused');
    this.actionHandlers.onPauseCompanion?.();
    this.notify();
    return this.getStatus();
  }

  /**
   * Stop background service completely and clean up all resources
   */
  public async stopService(): Promise<BackgroundServiceStatus> {
    this.state = 'stopped';
    this.startedAt = null;
    this.statusMessage = 'Background companion service stopped.';

    await this.releaseWakeLock();
    this.closeNotification();

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    if (nativeBridge && typeof nativeBridge.stopForegroundService === 'function') {
      try {
        nativeBridge.stopForegroundService();
      } catch (_) {}
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (_) {}
    }

    this.actionHandlers.onStopCompanion?.();
    this.notify();
    return this.getStatus();
  }

  /**
   * Handle permission revocation gracefully
   */
  public handlePermissionRevoked(reason = 'Microphone or notification permission was revoked.') {
    this.state = 'permission_revoked';
    this.statusMessage = reason;
    this.releaseWakeLock();
    this.closeNotification();
    this.notify();
  }

  /**
   * Update live activity state in notification / MediaSession without draining battery
   */
  public updateLiveActivityState(
    companionName: string,
    activity: 'Listening' | 'Thinking' | 'Speaking' | 'Ready' | 'Paused'
  ) {
    if (this.state !== 'running') return;
    this.statusMessage = `${companionName} • ${activity}`;
    this.setupMediaSessionHandlers(companionName, activity);

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidBridge : null;
    if (nativeBridge && typeof nativeBridge.updateForegroundNotification === 'function') {
      try {
        nativeBridge.updateForegroundNotification(
          `${companionName} AI Companion • ${activity}`,
          'Tap to open compact controls or stop service'
        );
      } catch (_) {}
    }
    this.notify();
  }

  private async acquireWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLockSentinel) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
          this.notify();
        });
      }
    } catch (_) {
      // Ignore if browser/OS declines WakeLock in background tab
    }
  }

  private async releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (_) {}
      this.wakeLockSentinel = null;
    }
  }

  private async showPersistentNotification(title: string, body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        this.closeNotification();
        this.activeNotification = new Notification(title, {
          body,
          icon: '/icon-192.svg',
          tag: 'alya-companion-foreground-service',
          silent: true,
        });
        this.activeNotification.onclick = () => {
          window.focus();
        };
      }
    } catch (_) {}
  }

  private closeNotification() {
    if (this.activeNotification) {
      try {
        this.activeNotification.close();
      } catch (_) {}
      this.activeNotification = null;
    }
  }

  private setupMediaSessionHandlers(companionName = 'Alya', stateLabel = 'Ready') {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${companionName} AI Companion`,
        artist: `Status: ${stateLabel}`,
        album: 'Alya Continuous Voice Service',
      });
      navigator.mediaSession.playbackState = this.state === 'running' ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        this.state = 'running';
        this.actionHandlers.onResumeListening?.();
        this.notify();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pauseService(companionName);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.stopService();
      });
    } catch (_) {}
  }
}

export const backgroundCompanionService = new BackgroundCompanionManager();
