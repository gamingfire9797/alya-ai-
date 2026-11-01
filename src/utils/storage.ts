import {
  ChatMessage,
  MemoryItem,
  BackgroundItem,
  AppSettings,
  CompanionCharacter,
  AutoFeaturesSettings,
  CommunicationStyleProfile,
} from '../types';
import { INITIAL_MEMORIES, BACKGROUNDS, INITIAL_SETTINGS, DEFAULT_AUTO_FEATURES } from '../data/initialData';
import { TimeEngine } from './time';

const KEYS = {
  MESSAGES_ALYA: 'alya_chat_messages_v3_alya',
  MESSAGES_JARVIS: 'alya_chat_messages_v3_jarvis',
  LEGACY_MESSAGES: 'alya_chat_messages_v2',
  MEMORIES: 'alya_memories_v2',
  BACKGROUND: 'alya_active_bg_v2',
  CUSTOM_BGS: 'alya_custom_bgs_v2',
  SETTINGS: 'alya_settings_v2',
  COMPANION: 'alya_companion_choice_v2',
  API_KEY: 'alya_gemini_api_key_v1',
  KEY_SETUP_DONE: 'alya_key_setup_completed_v1',
  AUTO_FEATURES: 'alya_auto_features_v1',
  COMM_STYLE: 'alya_comm_style_v1',
};

// Sensitive tokens that must NEVER be stored in memory
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

export const Storage = {
  loadMessages(companion: CompanionCharacter = 'alya', userName = 'Gamingfire'): ChatMessage[] {
    const key = companion === 'jarvis' ? KEYS.MESSAGES_JARVIS : KEYS.MESSAGES_ALYA;
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);

      const legacyData = localStorage.getItem(KEYS.LEGACY_MESSAGES);
      if (legacyData) {
        const parsed: ChatMessage[] = JSON.parse(legacyData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter((m) =>
            companion === 'jarvis' ? m.role === 'jarvis' : m.role === 'alya' || m.role === 'user'
          );
          if (filtered.length > 0) {
            localStorage.setItem(key, JSON.stringify(filtered));
            return filtered;
          }
        }
      }
    } catch (_) {}

    const liveTime = TimeEngine.formatChatTimestamp();

    if (companion === 'jarvis') {
      const greeting: ChatMessage = {
        id: 'welcome-jarvis',
        role: 'jarvis',
        text: `Hello, ${userName}. Main Jarvis hoon. Bataiye, aaj main aapki kya madad kar sakta hoon?`,
        timestamp: liveTime,
        emotion: 'normal',
      };
      return [greeting];
    }

    const greeting: ChatMessage = {
      id: 'welcome-alya',
      role: 'alya',
      text: `Hi ${userName}! Hey, kaise ho? Aaj kya chal raha hai?`,
      timestamp: liveTime,
      emotion: 'happy',
    };
    return [greeting];
  },

  saveMessages(companion: CompanionCharacter, messages: ChatMessage[]) {
    const key = companion === 'jarvis' ? KEYS.MESSAGES_JARVIS : KEYS.MESSAGES_ALYA;
    try {
      localStorage.setItem(key, JSON.stringify(messages.slice(-60)));
    } catch (_) {}
  },

  clearMessages(companion: CompanionCharacter = 'alya', userName = 'Gamingfire'): ChatMessage[] {
    const key = companion === 'jarvis' ? KEYS.MESSAGES_JARVIS : KEYS.MESSAGES_ALYA;
    try {
      localStorage.removeItem(key);
      if (companion === 'alya') {
        localStorage.removeItem(KEYS.LEGACY_MESSAGES);
      }
    } catch (_) {}
    return this.loadMessages(companion, userName);
  },

  loadApiKey(): string {
    try {
      return localStorage.getItem(KEYS.API_KEY) || '';
    } catch {
      return '';
    }
  },

  saveApiKey(key: string) {
    try {
      if (key) {
        localStorage.setItem(KEYS.API_KEY, key.trim());
      } else {
        localStorage.removeItem(KEYS.API_KEY);
      }
    } catch (_) {}
  },

  removeApiKey() {
    try {
      localStorage.removeItem(KEYS.API_KEY);
    } catch (_) {}
  },

  hasCompletedKeySetup(): boolean {
    try {
      return localStorage.getItem(KEYS.KEY_SETUP_DONE) === 'true';
    } catch {
      return false;
    }
  },

  setCompletedKeySetup(done: boolean) {
    try {
      localStorage.setItem(KEYS.KEY_SETUP_DONE, done ? 'true' : 'false');
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
        return null; // Reject storing sensitive information
      }
    }
    return trimmed;
  },

  loadMemories(): MemoryItem[] {
    try {
      const data = localStorage.getItem(KEYS.MEMORIES);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return INITIAL_MEMORIES;
  },

  /**
   * Lightweight Relevant Memory Retrieval
   * Ensures short conversation turns ("Hello Alya", "Good morning", "Kaise ho")
   * don't suffer latency from sending massive memory contexts.
   */
  getLightweightRelevantMemories(message: string, memories: MemoryItem[]): string[] {
    if (!memories || memories.length === 0) return [];

    const clean = (message || '').toLowerCase().trim();
    // Common greetings and short pleasantries
    const isShortTurn = clean.length <= 18;
    const isGreeting =
      isShortTurn &&
      /^(hi|hello|hey|yo|namaste|pranam|good\s+(morning|afternoon|evening|night)|kaise\s+ho|kya\s+haal|sup|what'?s\s+up)(\s+[a-z]+)?$/i.test(
        clean
      );

    if (isGreeting) {
      // Greetings only need name/companion preference if any, or none
      const pref = memories.find((m) => m.category === 'Preferences');
      return pref ? [pref.text] : [];
    }

    // Tokenize query words (>2 chars, non-stopwords)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'you', 'with', 'this', 'that', 'have', 'from', 'what', 'kya', 'hai', 'tha', 'thi', 'kar', 'rahe']);
    const tokens = clean
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    if (tokens.length === 0) {
      return memories.slice(0, 2).map((m) => m.text);
    }

    // Score memories based on keyword overlap
    const scored = memories.map((m) => {
      const memText = m.text.toLowerCase();
      let score = m.pinned ? 1 : 0;
      for (const t of tokens) {
        if (memText.includes(t)) score += 2;
      }
      return { text: m.text, score };
    });

    const relevant = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.text);

    return relevant.length > 0 ? relevant : memories.slice(0, 2).map((m) => m.text);
  },

  saveMemories(memories: MemoryItem[]) {
    try {
      // Filter out sensitive data and limit to maximum 50 memories to prevent endless growth
      const sanitized = memories
        .filter((m) => {
          const clean = this.sanitizeMemoryText(m.text);
          return !!clean;
        })
        .slice(0, 50);

      localStorage.setItem(KEYS.MEMORIES, JSON.stringify(sanitized));
    } catch (_) {}
  },

  loadBackground(): BackgroundItem {
    try {
      const data = localStorage.getItem(KEYS.BACKGROUND);
      if (data) return JSON.parse(data);
    } catch (_) {}
    return BACKGROUNDS[0];
  },

  saveBackground(bg: BackgroundItem) {
    try {
      localStorage.setItem(KEYS.BACKGROUND, JSON.stringify(bg));
    } catch (_) {}
  },

  loadCustomBackgrounds(): BackgroundItem[] {
    try {
      const data = localStorage.getItem(KEYS.CUSTOM_BGS);
      if (data) return JSON.parse(data);
    } catch (_) {}
    return [];
  },

  saveCustomBackgrounds(bgs: BackgroundItem[]) {
    try {
      localStorage.setItem(KEYS.CUSTOM_BGS, JSON.stringify(bgs));
    } catch (_) {}
  },

  loadAutoFeatures(): AutoFeaturesSettings {
    try {
      const data = localStorage.getItem(KEYS.AUTO_FEATURES);
      if (data) {
        return { ...DEFAULT_AUTO_FEATURES, ...JSON.parse(data) };
      }
    } catch (_) {}
    return DEFAULT_AUTO_FEATURES;
  },

  saveAutoFeatures(features: AutoFeaturesSettings) {
    try {
      localStorage.setItem(KEYS.AUTO_FEATURES, JSON.stringify(features));
    } catch (_) {}
  },

  loadSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        const autoFeat = this.loadAutoFeatures();
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
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: AppSettings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      if (settings.autoFeatures) {
        this.saveAutoFeatures(settings.autoFeatures);
      }
    } catch (_) {}
  },

  loadCommunicationStyle(): CommunicationStyleProfile | null {
    try {
      const data = localStorage.getItem(KEYS.COMM_STYLE);
      if (data) return JSON.parse(data);
    } catch (_) {}
    return null;
  },

  saveCommunicationStyle(style: CommunicationStyleProfile) {
    try {
      localStorage.setItem(KEYS.COMM_STYLE, JSON.stringify(style));
    } catch (_) {}
  },

  loadAuthSession(): { token: string; user: any; expiresAt: number } | null {
    try {
      const data = localStorage.getItem('alya_user_session_v1');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  },

  saveAuthSession(session: { token: string; user: any; expiresAt?: number }) {
    try {
      const full = {
        ...session,
        expiresAt: session.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem('alya_user_session_v1', JSON.stringify(full));
    } catch (_) {}
  },

  clearAuthSession() {
    try {
      localStorage.removeItem('alya_user_session_v1');
    } catch (_) {}
  },

  hasCompletedOnboarding(): boolean {
    try {
      return localStorage.getItem('alya_onboarding_completed_v1') === 'true';
    } catch {
      return false;
    }
  },

  setCompletedOnboarding(done: boolean) {
    try {
      localStorage.setItem('alya_onboarding_completed_v1', String(done));
    } catch (_) {}
  },

  loadUserProfile(): any | null {
    try {
      const profileData = localStorage.getItem('alya_user_profile_v1');
      if (profileData) {
        const parsed = JSON.parse(profileData);
        if (parsed && parsed.displayName) {
          return {
            ...parsed,
            bannerUrl: parsed.bannerUrl || 'cyber_neon',
            avatarUrl: parsed.avatarUrl || 'alya_pink',
            username: parsed.username || 'explorer',
          };
        }
      }
    } catch (_) {}
    return null;
  },

  saveUserProfile(profile: any) {
    try {
      localStorage.setItem('alya_user_profile_v1', JSON.stringify(profile));
      const sessionData = localStorage.getItem('alya_user_session_v1');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.user = profile;
        localStorage.setItem('alya_user_session_v1', JSON.stringify(session));
      }
    } catch (_) {}
  },
};
