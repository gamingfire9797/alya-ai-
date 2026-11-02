import {
  ChatMessage,
  MemoryItem,
  BackgroundItem,
  AppSettings,
  CompanionCharacter,
  AutoFeaturesSettings,
  CommunicationStyleProfile,
  UserProfile,
  OnboardingPreferences,
} from '../types';
import { BACKGROUNDS, INITIAL_SETTINGS, DEFAULT_AUTO_FEATURES } from '../data/initialData';
import { TimeEngine } from './time';

const GLOBAL_KEYS = {
  MIGRATION_V4_DONE: 'alya_multiuser_v4_migrated',
  ACTIVE_USER_ID: 'alya_active_user_id_v4',
  ACTIVE_SESSION: 'alya_active_session_v4',
  OFFLINE_ACCOUNTS_REGISTRY: 'alya_offline_accounts_v4',
  API_KEY_GLOBAL: 'alya_gemini_api_key_v1',
  KEY_SETUP_DONE: 'alya_key_setup_completed_v1',
};

const LEGACY_SHARED_KEYS = [
  'alya_chat_messages_v3_alya',
  'alya_chat_messages_v3_jarvis',
  'alya_chat_messages_v2',
  'alya_memories_v2',
  'alya_settings_v2',
  'alya_companion_choice_v2',
  'alya_user_profile_v1',
  'alya_user_session_v1',
  'alya_onboarding_completed_v1',
  'alya_comm_style_v1',
];

// Sensitive tokens that must NEVER be stored in memory bank
const SENSITIVE_PATTERNS = [
  /password/i,
  /api[_-]?key/i,
  /secret/i,
  /auth[_-]?token/i,
  /bearer\s+[a-z0-9_\-\.]+/i,
  /credentials/i,
  /session[_-]?token/i,
  /pin\s*:\s*\d+/i,
  /latitude|longitude|coords/i,
];

// In-memory active session token cache
let inMemorySessionToken: string | null = null;

function sanitizeUserId(userId?: string | null): string {
  const raw = (userId || '').trim();
  if (!raw || raw === 'usr_default_gamingfire' || raw === 'usr_gamingfire_8091') {
    return '';
  }
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function getUserKey(userId: string, suffix: string): string {
  const cleanId = sanitizeUserId(userId) || 'unassigned';
  return `alya_u4_${cleanId}_${suffix}`;
}

export interface OfflineAccountRecord {
  user: UserProfile;
  passwordSalt?: string;
  passwordHash?: string;
}

async function hashPasswordClient(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic hash if SubtleCrypto is unavailable
  let h = 2166136261;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export const Storage = {
  /**
   * One-time cleanup that purges legacy un-scoped "Gamingfire" profiles,
   * shared chat history, and hardcoded memories so fresh installs or upgrades
   * never auto-assign the old "Gamingfire" identity.
   */
  ensureCleanMultiUserState(): void {
    try {
      const migrated = localStorage.getItem(GLOBAL_KEYS.MIGRATION_V4_DONE);
      if (migrated !== 'true') {
        for (const legacyKey of LEGACY_SHARED_KEYS) {
          localStorage.removeItem(legacyKey);
        }
        localStorage.setItem(GLOBAL_KEYS.MIGRATION_V4_DONE, 'true');
      }

      // Also guard against any lingering Gamingfire default ID in active profile
      const activeId = localStorage.getItem(GLOBAL_KEYS.ACTIVE_USER_ID);
      if (activeId === 'usr_default_gamingfire' || activeId === 'usr_gamingfire_8091') {
        this.clearAuthSession();
      }
    } catch (_) {}
  },

  getActiveUserId(): string {
    this.ensureCleanMultiUserState();
    try {
      const id = localStorage.getItem(GLOBAL_KEYS.ACTIVE_USER_ID) || '';
      return sanitizeUserId(id);
    } catch {
      return '';
    }
  },

  setActiveUserId(userId: string | null): void {
    try {
      const clean = sanitizeUserId(userId);
      if (clean) {
        localStorage.setItem(GLOBAL_KEYS.ACTIVE_USER_ID, clean);
      } else {
        localStorage.removeItem(GLOBAL_KEYS.ACTIVE_USER_ID);
      }
    } catch (_) {}
  },

  createGreetingMessages(companion: CompanionCharacter = 'alya', userName = 'Friend'): ChatMessage[] {
    const cleanName = (userName || '').trim() || 'Friend';
    const liveTime = TimeEngine.formatChatTimestamp();

    if (companion === 'jarvis') {
      return [
        {
          id: `welcome-jarvis-${Date.now()}`,
          role: 'jarvis',
          text: `Hello, ${cleanName}. Main Jarvis hoon. Bataiye, aaj main aapki kya madad kar sakta hoon?`,
          timestamp: liveTime,
          emotion: 'normal',
        },
      ];
    }

    return [
      {
        id: `welcome-alya-${Date.now()}`,
        role: 'alya',
        text: `Hi ${cleanName}! Hey, kaise ho? Aaj kya chal raha hai?`,
        timestamp: liveTime,
        emotion: 'happy',
      },
    ];
  },

  loadMessages(
    companion: CompanionCharacter = 'alya',
    userName = 'Friend',
    explicitUserId?: string,
  ): ChatMessage[] {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) {
      return this.createGreetingMessages(companion, userName);
    }
    const key = getUserKey(uid, companion === 'jarvis' ? 'messages_jarvis' : 'messages_alya');
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}

    return this.createGreetingMessages(companion, userName);
  },

  saveMessages(companion: CompanionCharacter, messages: ChatMessage[], explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    const key = getUserKey(uid, companion === 'jarvis' ? 'messages_jarvis' : 'messages_alya');
    try {
      localStorage.setItem(key, JSON.stringify((messages || []).slice(-80)));
    } catch (_) {}
  },

  clearMessages(
    companion: CompanionCharacter = 'alya',
    userName = 'Friend',
    explicitUserId?: string,
  ): ChatMessage[] {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (uid) {
      const key = getUserKey(uid, companion === 'jarvis' ? 'messages_jarvis' : 'messages_alya');
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }
    return this.createGreetingMessages(companion, userName);
  },

  clearAllUserChats(userName = 'Friend', explicitUserId?: string): {
    alya: ChatMessage[];
    jarvis: ChatMessage[];
  } {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (uid) {
      try {
        localStorage.removeItem(getUserKey(uid, 'messages_alya'));
        localStorage.removeItem(getUserKey(uid, 'messages_jarvis'));
      } catch (_) {}
    }
    return {
      alya: this.createGreetingMessages('alya', userName),
      jarvis: this.createGreetingMessages('jarvis', userName),
    };
  },

  loadApiKey(explicitUserId?: string): string {
    try {
      const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
      if (uid) {
        const scopedKey = localStorage.getItem(getUserKey(uid, 'gemini_api_key'));
        if (scopedKey) return scopedKey;
      }
      return localStorage.getItem(GLOBAL_KEYS.API_KEY_GLOBAL) || '';
    } catch {
      return '';
    }
  },

  saveApiKey(key: string, explicitUserId?: string) {
    try {
      const clean = (key || '').trim();
      const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
      if (uid) {
        if (clean) {
          localStorage.setItem(getUserKey(uid, 'gemini_api_key'), clean);
        } else {
          localStorage.removeItem(getUserKey(uid, 'gemini_api_key'));
        }
      }
      if (clean) {
        localStorage.setItem(GLOBAL_KEYS.API_KEY_GLOBAL, clean);
      } else {
        localStorage.removeItem(GLOBAL_KEYS.API_KEY_GLOBAL);
      }
    } catch (_) {}
  },

  removeApiKey(explicitUserId?: string) {
    try {
      const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
      if (uid) {
        localStorage.removeItem(getUserKey(uid, 'gemini_api_key'));
      }
      localStorage.removeItem(GLOBAL_KEYS.API_KEY_GLOBAL);
    } catch (_) {}
  },

  hasCompletedKeySetup(explicitUserId?: string): boolean {
    try {
      const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
      if (uid && localStorage.getItem(getUserKey(uid, 'key_setup_done')) === 'true') {
        return true;
      }
      return localStorage.getItem(GLOBAL_KEYS.KEY_SETUP_DONE) === 'true';
    } catch {
      return false;
    }
  },

  setCompletedKeySetup(done: boolean, explicitUserId?: string) {
    try {
      const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
      if (uid) {
        localStorage.setItem(getUserKey(uid, 'key_setup_done'), done ? 'true' : 'false');
      }
      localStorage.setItem(GLOBAL_KEYS.KEY_SETUP_DONE, done ? 'true' : 'false');
    } catch (_) {}
  },

  /**
   * Sanitizes memory items to strip passwords, tokens, API keys, or sensitive credentials
   */
  sanitizeMemoryText(text: string): string | null {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return null;
      }
    }
    return trimmed;
  },

  loadMemories(explicitUserId?: string): MemoryItem[] {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return [];
    try {
      const data = localStorage.getItem(getUserKey(uid, 'memories'));
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  saveMemories(memories: MemoryItem[], explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      const sanitized = (memories || [])
        .filter((m) => {
          const clean = this.sanitizeMemoryText(m.text);
          return !!clean;
        })
        .slice(0, 60);

      localStorage.setItem(getUserKey(uid, 'memories'), JSON.stringify(sanitized));
    } catch (_) {}
  },

  loadOnboardingPreferences(explicitUserId?: string): OnboardingPreferences | null {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return null;
    try {
      const raw = localStorage.getItem(getUserKey(uid, 'onboarding_prefs'));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  },

  saveOnboardingPreferences(prefs: OnboardingPreferences, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(
        getUserKey(uid, 'onboarding_prefs'),
        JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
      );
    } catch (_) {}
  },

  /**
   * Converts user-answered onboarding questions into structured personal MemoryItems
   * without overwriting non-onboarding memories.
   */
  preferencesToMemories(prefs: OnboardingPreferences): MemoryItem[] {
    const items: MemoryItem[] = [];
    const nowLabel = 'Saved from Profile Preferences';

    if (prefs.callsign && prefs.callsign.trim()) {
      items.push({
        id: 'pref_callsign',
        category: 'Preferences',
        text: `Preferred name / callsign: ${prefs.callsign.trim()}`,
        dateAdded: nowLabel,
        pinned: true,
      });
    }
    if (prefs.preferredTone) {
      const toneMap: Record<string, string> = {
        friendly: 'Warm, friendly, supportive companion tone',
        funny: 'Playful, witty, light-hearted tone with natural humor',
        calm: 'Calm, soothing, gentle, and reassuring tone',
        straightforward: 'Direct, clear, concise, and straightforward answers',
      };
      items.push({
        id: 'pref_tone',
        category: 'Preferences',
        text: `Preferred conversation tone: ${toneMap[prefs.preferredTone] || prefs.preferredTone}`,
        dateAdded: nowLabel,
        pinned: true,
      });
    }
    if (prefs.preferredLanguage && prefs.preferredLanguage !== 'auto') {
      items.push({
        id: 'pref_language',
        category: 'Preferences',
        text: `Preferred language: ${prefs.preferredLanguage}`,
        dateAdded: nowLabel,
        pinned: true,
      });
    }
    if (prefs.favouriteColours && prefs.favouriteColours.length > 0) {
      items.push({
        id: 'pref_colours',
        category: 'Preferences',
        text: `Favourite colours: ${prefs.favouriteColours.join(', ')}`,
        dateAdded: nowLabel,
        pinned: false,
      });
    }
    if (prefs.favouriteFoods && prefs.favouriteFoods.length > 0) {
      items.push({
        id: 'pref_foods',
        category: 'Preferences',
        text: `Favourite foods & drinks: ${prefs.favouriteFoods.join(', ')}`,
        dateAdded: nowLabel,
        pinned: false,
      });
    }
    if (prefs.favouriteGames && prefs.favouriteGames.length > 0) {
      items.push({
        id: 'pref_games',
        category: 'Notes',
        text: `Games played: ${prefs.favouriteGames.join(', ')}`,
        dateAdded: nowLabel,
        pinned: false,
      });
    }
    if (prefs.hobbies && prefs.hobbies.length > 0) {
      items.push({
        id: 'pref_hobbies',
        category: 'Notes',
        text: `Interests & hobbies: ${prefs.hobbies.join(', ')}`,
        dateAdded: nowLabel,
        pinned: true,
      });
    }
    if (prefs.workOrStudy && prefs.workOrStudy.trim()) {
      items.push({
        id: 'pref_work_study',
        category: 'Notes',
        text: `Work / study / daily activity: ${prefs.workOrStudy.trim()}`,
        dateAdded: nowLabel,
        pinned: true,
      });
    }
    if (prefs.customNotes && prefs.customNotes.trim()) {
      const cleanCustom = this.sanitizeMemoryText(prefs.customNotes.trim());
      if (cleanCustom) {
        items.push({
          id: 'pref_custom_notes',
          category: 'Notes',
          text: cleanCustom,
          dateAdded: nowLabel,
          pinned: false,
        });
      }
    }
    return items;
  },

  mergePreferencesIntoMemories(
    prefs: OnboardingPreferences,
    existingMemories: MemoryItem[],
  ): MemoryItem[] {
    const prefMemories = this.preferencesToMemories(prefs);
    const nonPrefMemories = (existingMemories || []).filter((m) => !m.id.startsWith('pref_'));
    return [...prefMemories, ...nonPrefMemories].slice(0, 60);
  },

  /**
   * Lightweight Relevant Memory Retrieval
   * Only retrieves from the current user's isolated memory array.
   */
  getLightweightRelevantMemories(message: string, memories: MemoryItem[]): string[] {
    if (!memories || memories.length === 0) return [];

    const clean = (message || '').toLowerCase().trim();
    const isShortTurn = clean.length <= 18;
    const isGreeting =
      isShortTurn &&
      /^(hi|hello|hey|yo|namaste|pranam|good\s+(morning|afternoon|evening|night)|kaise\s+ho|kya\s+haal|sup|what'?s\s+up)(\s+[a-z]+)?$/i.test(
        clean,
      );

    if (isGreeting) {
      const pinnedPrefs = memories.filter((m) => m.pinned || m.category === 'Preferences').slice(0, 2);
      return pinnedPrefs.map((m) => m.text);
    }

    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'you',
      'with',
      'this',
      'that',
      'have',
      'from',
      'what',
      'kya',
      'hai',
      'tha',
      'thi',
      'kar',
      'rahe',
    ]);
    const tokens = clean
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    if (tokens.length === 0) {
      return memories.slice(0, 4).map((m) => m.text);
    }

    const scored = memories.map((m) => {
      const memText = m.text.toLowerCase();
      let score = m.pinned ? 2 : 0;
      if (m.id.startsWith('pref_')) score += 1;
      for (const t of tokens) {
        if (memText.includes(t)) score += 3;
      }
      return { text: m.text, score };
    });

    const relevant = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.text);

    return relevant.length > 0 ? relevant : memories.slice(0, 3).map((m) => m.text);
  },

  loadBackground(explicitUserId?: string): BackgroundItem {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return BACKGROUNDS[0];
    try {
      const data = localStorage.getItem(getUserKey(uid, 'active_bg'));
      if (data) return JSON.parse(data);
    } catch (_) {}
    return BACKGROUNDS[0];
  },

  saveBackground(bg: BackgroundItem, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'active_bg'), JSON.stringify(bg));
    } catch (_) {}
  },

  loadCustomBackgrounds(explicitUserId?: string): BackgroundItem[] {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return [];
    try {
      const data = localStorage.getItem(getUserKey(uid, 'custom_bgs'));
      if (data) return JSON.parse(data);
    } catch (_) {}
    return [];
  },

  saveCustomBackgrounds(bgs: BackgroundItem[], explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'custom_bgs'), JSON.stringify(bgs));
    } catch (_) {}
  },

  loadAutoFeatures(explicitUserId?: string): AutoFeaturesSettings {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return DEFAULT_AUTO_FEATURES;
    try {
      const data = localStorage.getItem(getUserKey(uid, 'auto_features'));
      if (data) {
        return { ...DEFAULT_AUTO_FEATURES, ...JSON.parse(data) };
      }
    } catch (_) {}
    return DEFAULT_AUTO_FEATURES;
  },

  saveAutoFeatures(features: AutoFeaturesSettings, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'auto_features'), JSON.stringify(features));
    } catch (_) {}
  },

  loadSettings(explicitUserId?: string): AppSettings {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return { ...INITIAL_SETTINGS };
    try {
      const data = localStorage.getItem(getUserKey(uid, 'settings'));
      if (data) {
        const parsed = JSON.parse(data);
        const autoFeat = this.loadAutoFeatures(uid);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          autoFeatures: {
            ...DEFAULT_AUTO_FEATURES,
            ...(parsed.autoFeatures || {}),
            ...autoFeat,
          },
          permissions: {
            ...INITIAL_SETTINGS.permissions,
            ...(parsed.permissions || {}),
          },
        };
      }
    } catch (_) {}
    return { ...INITIAL_SETTINGS };
  },

  saveSettings(settings: AppSettings, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'settings'), JSON.stringify(settings));
      if (settings.autoFeatures) {
        this.saveAutoFeatures(settings.autoFeatures, uid);
      }
    } catch (_) {}
  },

  loadCommunicationStyle(explicitUserId?: string): CommunicationStyleProfile | null {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return null;
    try {
      const data = localStorage.getItem(getUserKey(uid, 'comm_style'));
      if (data) return JSON.parse(data);
    } catch (_) {}
    return null;
  },

  saveCommunicationStyle(style: CommunicationStyleProfile, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'comm_style'), JSON.stringify(style));
    } catch (_) {}
  },

  loadAuthSession(): { token: string; user: UserProfile; expiresAt: number } | null {
    this.ensureCleanMultiUserState();
    try {
      const rawSession =
        sessionStorage.getItem(GLOBAL_KEYS.ACTIVE_SESSION) ||
        localStorage.getItem(GLOBAL_KEYS.ACTIVE_SESSION);
      if (!rawSession) return null;

      const parsed = JSON.parse(rawSession);
      if (
        !parsed ||
        !parsed.user ||
        !parsed.user.id ||
        parsed.user.id === 'usr_default_gamingfire' ||
        parsed.user.id === 'usr_gamingfire_8091'
      ) {
        this.clearAuthSession();
        return null;
      }
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        inMemorySessionToken = parsed.token || null;
        this.setActiveUserId(parsed.user.id);
        return parsed;
      } else {
        this.clearAuthSession();
      }
    } catch (_) {}
    return null;
  },

  saveAuthSession(session: { token: string; user: UserProfile; expiresAt?: number }) {
    try {
      if (!session?.user?.id) return;
      const uid = sanitizeUserId(session.user.id);
      if (!uid) return;
      inMemorySessionToken = session.token;
      this.setActiveUserId(uid);

      const full = {
        token: session.token,
        user: session.user,
        expiresAt: session.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      try {
        sessionStorage.setItem(GLOBAL_KEYS.ACTIVE_SESSION, JSON.stringify(full));
      } catch (_) {}
      localStorage.setItem(GLOBAL_KEYS.ACTIVE_SESSION, JSON.stringify(full));
      localStorage.setItem(getUserKey(uid, 'profile'), JSON.stringify(session.user));
    } catch (_) {}
  },

  getSessionToken(): string | null {
    if (inMemorySessionToken) return inMemorySessionToken;
    const session = this.loadAuthSession();
    return session?.token || null;
  },

  /**
   * Logs out the current user by clearing the active session and active user pointer
   * WITHOUT deleting the user's saved data (unless the user explicitly deletes their account).
   */
  clearAuthSession() {
    inMemorySessionToken = null;
    try {
      sessionStorage.removeItem(GLOBAL_KEYS.ACTIVE_SESSION);
    } catch (_) {}
    try {
      localStorage.removeItem(GLOBAL_KEYS.ACTIVE_SESSION);
      localStorage.removeItem(GLOBAL_KEYS.ACTIVE_USER_ID);
    } catch (_) {}
  },

  hasCompletedOnboarding(explicitUserId?: string): boolean {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return false;
    try {
      return localStorage.getItem(getUserKey(uid, 'onboarding_completed')) === 'true';
    } catch {
      return false;
    }
  },

  setCompletedOnboarding(done: boolean, explicitUserId?: string) {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return;
    try {
      localStorage.setItem(getUserKey(uid, 'onboarding_completed'), String(done));
    } catch (_) {}
  },

  loadUserProfile(explicitUserId?: string): UserProfile | null {
    this.ensureCleanMultiUserState();
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    if (!uid) return null;
    try {
      const profileData = localStorage.getItem(getUserKey(uid, 'profile'));
      if (profileData) {
        const parsed = JSON.parse(profileData);
        if (parsed && parsed.id && parsed.displayName) {
          return {
            ...parsed,
            bannerUrl: parsed.bannerUrl || 'cyber_neon',
            avatarUrl: parsed.avatarUrl || 'alya_pink',
            username: parsed.username || 'guest',
          };
        }
      }
    } catch (_) {}
    return null;
  },

  saveUserProfile(profile: UserProfile) {
    if (!profile || !profile.id) return;
    const uid = sanitizeUserId(profile.id);
    if (!uid) return;
    try {
      this.setActiveUserId(uid);
      localStorage.setItem(getUserKey(uid, 'profile'), JSON.stringify(profile));
      const rawSession = localStorage.getItem(GLOBAL_KEYS.ACTIVE_SESSION);
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session.user?.id === profile.id) {
          session.user = profile;
          localStorage.setItem(GLOBAL_KEYS.ACTIVE_SESSION, JSON.stringify(session));
          try {
            sessionStorage.setItem(GLOBAL_KEYS.ACTIVE_SESSION, JSON.stringify(session));
          } catch (_) {}
        }
      }
      // Also update in offline accounts registry if present
      const registry = this.loadOfflineAccountsRegistry();
      const idx = registry.findIndex((r) => r.user.id === profile.id);
      if (idx !== -1) {
        registry[idx].user = profile;
        localStorage.setItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY, JSON.stringify(registry));
      }
    } catch (_) {}
  },

  /**
   * Permanently deletes all local data associated with a specific userId.
   */
  deleteUserAccountLocalData(userId: string) {
    const uid = sanitizeUserId(userId);
    if (!uid) return;
    const prefix = `alya_u4_${uid}_`;
    try {
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToDelete.push(k);
        }
      }
      for (const k of keysToDelete) {
        localStorage.removeItem(k);
      }

      // Remove from offline accounts registry
      const registry = this.loadOfflineAccountsRegistry().filter((r) => r.user.id !== userId);
      localStorage.setItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY, JSON.stringify(registry));

      if (this.getActiveUserId() === uid) {
        this.clearAuthSession();
      }
    } catch (_) {}
  },

  /**
   * Resets all local app data on this device (without deleting remote server accounts).
   */
  resetAllLocalAppData() {
    inMemorySessionToken = null;
    try {
      sessionStorage.clear();
    } catch (_) {}
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('alya_')) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
      localStorage.setItem(GLOBAL_KEYS.MIGRATION_V4_DONE, 'true');
    } catch (_) {}
  },

  /**
   * Migrates Guest data (chats, memories, preferences, settings) to a target authenticated userId
   * ONLY when explicitly confirmed by the user.
   */
  migrateGuestDataToAccount(guestUserId: string, targetUser: UserProfile): {
    alyaChats: ChatMessage[];
    jarvisChats: ChatMessage[];
    memories: MemoryItem[];
    preferences: OnboardingPreferences | null;
  } {
    const guestUid = sanitizeUserId(guestUserId);
    const targetUid = sanitizeUserId(targetUser.id);
    if (!guestUid || !targetUid || guestUid === targetUid) {
      return {
        alyaChats: this.loadMessages('alya', targetUser.displayName, targetUid),
        jarvisChats: this.loadMessages('jarvis', targetUser.displayName, targetUid),
        memories: this.loadMemories(targetUid),
        preferences: this.loadOnboardingPreferences(targetUid),
      };
    }

    const guestAlya = this.loadMessages('alya', targetUser.displayName, guestUid).filter(
      (m) => !m.id.startsWith('welcome-'),
    );
    const guestJarvis = this.loadMessages('jarvis', targetUser.displayName, guestUid).filter(
      (m) => !m.id.startsWith('welcome-'),
    );
    const guestMemories = this.loadMemories(guestUid);
    const guestPrefs = this.loadOnboardingPreferences(guestUid);

    const existingAlya = this.loadMessages('alya', targetUser.displayName, targetUid);
    const existingJarvis = this.loadMessages('jarvis', targetUser.displayName, targetUid);
    const existingMemories = this.loadMemories(targetUid);
    const existingPrefs = this.loadOnboardingPreferences(targetUid);

    const dedupMsgs = (list: ChatMessage[]): ChatMessage[] => {
      const seen = new Set<string>();
      const out: ChatMessage[] = [];
      for (const m of list) {
        if (!m || !m.text) continue;
        const sig = m.id
          ? `id:${m.id}`
          : `txt:${m.role}:${m.text.trim().toLowerCase()}:${m.timestamp || ''}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          out.push(m);
        }
      }
      return out.slice(-80);
    };

    const mergedAlya = dedupMsgs([...existingAlya, ...guestAlya]);
    const mergedJarvis = dedupMsgs([...existingJarvis, ...guestJarvis]);

    const memMap = new Map<string, MemoryItem>();
    for (const m of [...existingMemories, ...guestMemories]) {
      memMap.set(m.text.toLowerCase().trim(), m);
    }
    const mergedMemories = Array.from(memMap.values()).slice(0, 60);
    const mergedPrefs = existingPrefs || guestPrefs || null;

    this.saveMessages('alya', mergedAlya, targetUid);
    this.saveMessages('jarvis', mergedJarvis, targetUid);
    this.saveMemories(mergedMemories, targetUid);
    if (mergedPrefs) {
      this.saveOnboardingPreferences(mergedPrefs, targetUid);
    }

    // Clean up temporary guest storage after migration
    this.deleteUserAccountLocalData(guestUserId);

    return {
      alyaChats: mergedAlya,
      jarvisChats: mergedJarvis,
      memories: mergedMemories,
      preferences: mergedPrefs,
    };
  },

  exportLocalUserData(explicitUserId?: string): any {
    const uid = sanitizeUserId(explicitUserId || this.getActiveUserId());
    const profile = this.loadUserProfile(uid);
    const onboardingPreferences = this.loadOnboardingPreferences(uid);
    const memories = this.loadMemories(uid);
    const alyaChats = uid ? this.loadMessages('alya', profile?.displayName || 'Explorer', uid) : [];
    const jarvisChats = uid ? this.loadMessages('jarvis', profile?.displayName || 'Explorer', uid) : [];
    const settings = this.loadSettings(uid);

    return {
      exportedAt: new Date().toISOString(),
      app: 'Alya AI Companion',
      profile,
      onboardingPreferences,
      memories,
      chats: {
        alya: alyaChats,
        jarvis: jarvisChats,
      },
      settings: {
        selectedCompanion: settings.selectedCompanion,
        preferredLanguage: settings.preferredLanguage,
        voiceSpeed: settings.voiceSpeed,
        voicePitch: settings.voicePitch,
      },
    };
  },

  // =========================================================================
  // OFFLINE / ON-DEVICE MULTI-USER REGISTRY (for Android APK offline resilience)
  // =========================================================================
  loadOfflineAccountsRegistry(): OfflineAccountRecord[] {
    try {
      const raw = localStorage.getItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  },

  isOfflineUsernameAvailable(username: string, excludeUserId?: string): boolean {
    const clean = (username || '').trim().toLowerCase();
    if (!clean || clean.length < 3) return false;
    const registry = this.loadOfflineAccountsRegistry();
    return !registry.some(
      (r) => r.user.username.toLowerCase() === clean && r.user.id !== excludeUserId,
    );
  },

  async registerOfflineAccount(params: {
    user: UserProfile;
    password?: string;
  }): Promise<UserProfile> {
    const registry = this.loadOfflineAccountsRegistry().filter(
      (r) =>
        r.user.id !== params.user.id &&
        r.user.username.toLowerCase() !== params.user.username.toLowerCase(),
    );
    let passwordSalt: string | undefined;
    let passwordHash: string | undefined;
    if (params.password && params.password.trim()) {
      passwordSalt = `salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      passwordHash = await hashPasswordClient(params.password.trim(), passwordSalt);
    }
    registry.push({
      user: params.user,
      passwordSalt,
      passwordHash,
    });
    try {
      localStorage.setItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY, JSON.stringify(registry));
    } catch (_) {}
    return params.user;
  },

  async authenticateOfflineAccount(
    identifier: string,
    password?: string,
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const clean = (identifier || '').trim().toLowerCase().replace(/^@/, '');
    const registry = this.loadOfflineAccountsRegistry();
    const record = registry.find(
      (r) =>
        r.user.username.toLowerCase() === clean ||
        (r.user.email && r.user.email.toLowerCase() === clean),
    );
    if (!record) {
      return { success: false, error: 'Account not found on this device or server.' };
    }
    if (record.passwordHash && record.passwordSalt) {
      if (!password) {
        return { success: false, error: 'Password is required for this account.' };
      }
      const computed = await hashPasswordClient(password.trim(), record.passwordSalt);
      if (computed !== record.passwordHash) {
        return { success: false, error: 'Invalid username or password.' };
      }
    }
    return { success: true, user: record.user };
  },

  async changeOfflinePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    const cleanNew = (newPassword || '').trim();
    if (cleanNew.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    const registry = this.loadOfflineAccountsRegistry();
    const idx = registry.findIndex((r) => r.user.id === userId);
    if (idx === -1) {
      return { success: true };
    }
    const rec = registry[idx];
    if (rec.passwordHash && rec.passwordSalt && currentPassword) {
      const computed = await hashPasswordClient(currentPassword.trim(), rec.passwordSalt);
      if (computed !== rec.passwordHash) {
        return { success: false, error: 'Current password is incorrect.' };
      }
    }
    const newSalt = `salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    rec.passwordSalt = newSalt;
    rec.passwordHash = await hashPasswordClient(cleanNew, newSalt);
    try {
      localStorage.setItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY, JSON.stringify(registry));
    } catch (_) {}
    return { success: true };
  },

  async resetOfflinePassword(params: {
    identifier: string;
    email?: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    const cleanId = (params.identifier || '').trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = (params.email || '').trim().toLowerCase();
    const cleanNew = (params.newPassword || '').trim();
    if (cleanNew.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    const registry = this.loadOfflineAccountsRegistry();
    const idx = registry.findIndex(
      (r) =>
        r.user.username.toLowerCase() === cleanId ||
        (r.user.email && r.user.email.toLowerCase() === cleanId),
    );
    if (idx === -1) {
      return { success: false, error: 'Account not found on this device.' };
    }
    const rec = registry[idx];
    if (rec.user.email && rec.user.email.trim()) {
      if (!cleanEmail || rec.user.email.toLowerCase() !== cleanEmail) {
        return {
          success: false,
          error: 'The verification email does not match the email registered on this account.',
        };
      }
    }
    const newSalt = `salt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    rec.passwordSalt = newSalt;
    rec.passwordHash = await hashPasswordClient(cleanNew, newSalt);
    try {
      localStorage.setItem(GLOBAL_KEYS.OFFLINE_ACCOUNTS_REGISTRY, JSON.stringify(registry));
    } catch (_) {}
    return { success: true };
  },
};
