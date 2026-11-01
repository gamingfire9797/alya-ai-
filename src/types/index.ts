export type CompanionCharacter = 'alya' | 'jarvis';
export type JarvisVoiceOption = 'jarvis_deep' | 'jarvis_normal';
export type ScreenType =
  | 'splash'
  | 'welcome'
  | 'auth'
  | 'profile_setup'
  | 'api_setup'
  | 'onboarding'
  | 'home'
  | 'chat'
  | 'voice'
  | 'memory'
  | 'phone_control'
  | 'screen_tools'
  | 'settings'
  | 'about'
  | 'backgrounds'
  | 'admin'
  | 'help'
  | 'studio'
  | 'personality'
  | 'slides'
  | 'work';

export * from './work';

export type AlyaAnimationStyle =
  | 'default_orbit'
  | 'lotus_bloom'
  | 'heart_core'
  | 'wave_flow'
  | 'particle_ring'
  | 'cosmic_swirl'
  | 'petal_flow';

export type JarvisAnimationStyle =
  | 'default_reactor'
  | 'hexagon_core'
  | 'planetary_orbit'
  | 'hud_circle'
  | 'wave_core'
  | 'tech_rings'
  | 'hologram_core';

export type CoreParticleStyle = 'default' | 'hearts' | 'petals' | 'stars' | 'sparks' | 'cosmic_swirl';

export type AnimationState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'processing'
  | 'responding'
  | 'offline';

export interface CoreCustomization {
  alyaColor: string;
  jarvisColor: string;
  alyaStyle: AlyaAnimationStyle;
  jarvisStyle: JarvisAnimationStyle;
  alyaParticleStyle: CoreParticleStyle;
  jarvisParticleStyle: CoreParticleStyle;
  brightness: number;
  saturation: number;
  hueOffset: number;
}

export type ExpressionType =
  | 'normal'
  | 'happy'
  | 'laughing'
  | 'shy'
  | 'curious'
  | 'thinking'
  | 'surprised'
  | 'calm'
  | 'concerned';

export type ExpressionMode = 'auto' | 'manual' | 'off';

export type RecognitionState = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';
export type MicPermissionState = 'not_requested' | 'allowed' | 'denied' | 'unavailable';

export interface AutoFeaturesSettings {
  autoMic: boolean;                 // Keep mic ready for continuous talk
  autoListen: boolean;              // Automatically listen when AI finishes speaking (Hands-free flow)
  autoReply: boolean;               // Automatically process speech and reply
  autoTTS: boolean;                 // Automatically speak AI responses
  autoRetry: boolean;               // Automatically retry on high-demand or transient glitches
  smartInterruption: boolean;       // Interrupt AI speaking immediately when user speaks or taps mic
  conversationContinuation: boolean;// Keep natural conversation turn-taking loop active
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'alya' | 'jarvis' | 'companion';
  text: string;
  timestamp: string;
  emotion?: ExpressionType;
  imageAttachment?: string;
  isStreaming?: boolean;
  isError?: boolean;
  isHighDemand?: boolean;
  language?: 'english' | 'hinglish' | 'hindi' | 'other';
}

export interface MemoryItem {
  id: string;
  category: 'Chats' | 'Notes' | 'People' | 'Preferences';
  text: string;
  dateAdded: string;
  pinned?: boolean;
}

export interface BackgroundItem {
  id: string;
  name: string;
  theme: string;
  description: string;
  gradient: string;
  ambientSound?: 'rain' | 'lofi' | 'cafe' | 'nature' | 'none';
  customUrl?: string;
}

export interface VoiceStyle {
  id: string;
  name: string;
  character: CompanionCharacter;
  gender: 'female' | 'male';
  tag: string;
  pitch: number;
  rate: number;
  description: string;
  voiceName: string;
  preferredLocale?: string;
}

export type LanguageMode = 'english' | 'hinglish' | 'hindi' | 'other';

export interface CommunicationStyleProfile {
  dominantLanguage: LanguageMode;
  hinglishAffinity: number; // 0 to 1
  hindiAffinity: number;    // 0 to 1
  englishAffinity: number;  // 0 to 1
  formality: 'casual' | 'balanced' | 'formal';
  preferredPacing: 'rapid' | 'natural' | 'gentle';
  lastUpdated: string;
}

export interface TimeContext {
  year: number;
  month: string;
  monthNumber: number;
  date: number;
  dayOfWeek: string;
  time12: string;
  time24: string;
  timezone: string;
  timezoneShort: string;
  utcOffset: string;
  isDST: boolean;
  greetingTime: 'morning' | 'afternoon' | 'evening' | 'night';
  isoString: string;
}

export interface AppSettings {
  selectedCompanion: CompanionCharacter;
  jarvisVoice: JarvisVoiceOption;
  alyaVoiceId?: string;
  selectedVoiceId: string;
  userApiKey?: string;
  hasCompletedKeySetup?: boolean;
  voiceVolume: number;
  voiceSpeed: number;
  voicePitch: number;
  autoSpeakResponse: boolean;
  avatarSize: 'sm' | 'md' | 'lg';
  soundEffects: boolean;
  ambientMusic: boolean;
  ambientVolume: number;
  floatingMiniEnabled: boolean;
  dynamicIslandEnabled: boolean;
  backgroundServiceMode: boolean;
  wakeWordEnabled: boolean;
  wakeWord: string;
  userName: string;
  hasCompletedOnboarding: boolean;
  expressionMode?: ExpressionMode;
  coreCustomization?: CoreCustomization;
  autoFeatures?: AutoFeaturesSettings;
  preferredLanguage?: 'auto' | 'hinglish' | 'english' | 'hindi';
  locationPermissionPrompted?: boolean;
  locationPermissionGranted?: boolean;
  permissions: {
    microphone: boolean;
    camera: boolean;
    screenAccess: boolean;
    notifications: boolean;
    appControl: boolean;
    location: boolean;
  };
}

export interface AdminUserRecord {
  id: string;
  displayName: string;
  createdAt: string;
  lastActive: string;
  appVersion: string;
  platform: string;
  devicesCount: number;
  companion: CompanionCharacter;
  status: 'active' | 'deactivated';
  chatCount: number;
  voiceSessions: number;
  memoriesCount: number;
  supportTicketsCount: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d?: number;
  activeUsers30d: number;
  verifiedInstallations: number;
  versionDistribution: Record<string, number>;
  registrationsOverTime: Array<{ date: string; count: number }>;
  alyaUsage: number;
  jarvisUsage: number;
  chatMessagesCount: number;
  voiceSessionsCount: number;
  voiceCallsSucceeded?: number;
  voiceCallsFailed?: number;
  speechErrorsCount?: number;
  memoriesSavedCount: number;
  phoneToolsCount: number;
  screenToolsCount: number;
  recentErrorsCount: number;
  recentErrors: Array<{ id: string; timestamp: string; type: string; message: string; count: number }>;
  openSupportTickets: number;
}

export interface AdminAuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  target: string;
  ip: string;
  status: 'success' | 'failure';
  details: string;
}

export interface AdminSupportTicket {
  id: string;
  userId: string;
  userName: string;
  companion: CompanionCharacter;
  submittedAt: string;
  reason: string;
  messages: Array<{ role: string; text: string; timestamp: string }>;
  status: 'open' | 'reviewed' | 'resolved';
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bannerUrl?: string;
  companionPreference: CompanionCharacter;
  hasCompletedProfile: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedKeySetup: boolean;
  createdAt: string;
  communicationStyle?: CommunicationStyleProfile;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt?: number;
}
