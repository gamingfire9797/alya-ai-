import React, { useState } from 'react';
import {
  Volume2,
  Shield,
  Clock,
  Globe,
  Languages,
  Check,
  Eye,
  EyeOff,
  Mic,
  MapPin,
  Key,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  LogOut,
  BookOpen,
  Sliders,
  Cpu,
} from 'lucide-react';
import { AppSettings, UserProfile } from '../../types';
import { UserProfileCard } from '../profile/UserProfileCard';
import { EditProfileModal } from '../profile/EditProfileModal';
import { TimeEngine } from '../../utils/time';
import { PermissionManager } from '../../utils/permissions';
import { usePWAInstall } from '../../utils/usePWAInstall';
import {
  apiFetch,
  getApiBaseUrl,
  getCustomApiBaseUrl,
  setCustomApiBaseUrl,
  isPackagedNativeOrigin,
} from '../../utils/apiConfig';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  hasGeminiKey: boolean;
  userApiKey?: string;
  onSaveApiKey?: (key: string) => void;
  onRemoveApiKey?: () => void;
  currentUser?: UserProfile | null;
  sessionToken?: string | null;
  onUpdateProfile?: (updated: UserProfile) => void;
  onLogoutUser?: () => void;
  onOpenGuide?: () => void;
  onOpenAutoFeatures?: () => void;
  onRequestLocationPermission?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
  hasGeminiKey,
  userApiKey = '',
  onSaveApiKey,
  onRemoveApiKey,
  currentUser,
  sessionToken,
  onUpdateProfile,
  onLogoutUser,
  onOpenGuide,
  onOpenAutoFeatures,
  onRequestLocationPermission,
}) => {
  const [keyInput, setKeyInput] = useState(userApiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [backendUrlInput, setBackendUrlInput] = useState(() => getCustomApiBaseUrl());
  const [backendSaveStatus, setBackendSaveStatus] = useState<string>('');
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const isNativeContainer = isPackagedNativeOrigin();
  const activeBackendOrigin = getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');

  // Time & Timezone data
  const timeContext = TimeEngine.getFullContext();
  const hasDeniedLocation = PermissionManager.hasUserDeniedLocation();

  const handleTestKey = async () => {
    const keyToTest = keyInput.trim();
    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });
    try {
      const res = await apiFetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest || undefined }),
      });
      const data = await res.json();
      if (data.valid) {
        setTestResult({ status: 'success', message: 'API key is valid and connected!' });
      } else {
        setTestResult({ status: 'error', message: data.message || 'Key validation failed.' });
      }
    } catch {
      setTestResult({ status: 'error', message: 'Connection error while validating key.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = () => {
    if (onSaveApiKey) {
      onSaveApiKey(keyInput.trim());
      setTestResult({ status: 'success', message: 'API key updated in device storage.' });
    }
  };

  const handleRemoveKey = () => {
    if (onRemoveApiKey) {
      onRemoveApiKey();
      setKeyInput('');
      setTestResult({ status: 'idle', message: 'API key removed.' });
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md p-4 space-y-3">
      <div>
        <h2 className="text-xl font-bold font-comfortaa text-white flex items-center gap-1.5">
          Settings <span className="text-slate-400 text-xs">• Preferences & Time</span>
        </h2>
        <p className="text-[11px] text-pink-300/80">
          Personalize system time, language adaptation, voice delivery, and AI engine
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* User Account & Profile Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
            <div className="flex items-center gap-2">
              <User size={14} className={settings.selectedCompanion === 'jarvis' ? 'text-amber-400' : 'text-pink-400'} />
              <span>User Profile & Identity</span>
            </div>
            {onLogoutUser && (
              <button
                type="button"
                onClick={onLogoutUser}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                title="Reset or switch profile"
              >
                <LogOut size={12} />
                <span>Reset Profile</span>
              </button>
            )}
          </div>
          <UserProfileCard
            profile={
              currentUser || {
                displayName: settings.userName || 'Explorer',
                username: 'explorer',
                avatarUrl: 'alya_pink',
                bannerUrl: 'cyber_neon',
              }
            }
            companion={settings.selectedCompanion}
            onEditProfile={() => setIsEditModalOpen(true)}
            showEditButton={true}
          />
          {isEditModalOpen && (
            <EditProfileModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              currentUser={
                currentUser || {
                  id: 'usr_local',
                  displayName: settings.userName || 'Explorer',
                  username: 'explorer',
                  avatarUrl: 'alya_pink',
                  bannerUrl: 'cyber_neon',
                  companionPreference: settings.selectedCompanion,
                  hasCompletedProfile: true,
                  hasCompletedOnboarding: true,
                  hasCompletedKeySetup: false,
                  createdAt: new Date().toISOString(),
                }
              }
              sessionToken={sessionToken}
              companion={settings.selectedCompanion}
              onProfileUpdated={(updated) => {
                if (onUpdateProfile) onUpdateProfile(updated);
                onUpdateSettings({ userName: updated.displayName });
              }}
            />
          )}
        </div>

        {/* Dynamic System Time & Date Engine Card */}
        <div className="glass-card rounded-2xl p-3.5 border border-cyan-500/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Clock size={15} />
              <span>System Date & Time Context</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
              Year {timeContext.year}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400">Current Date</span>
              <div className="font-bold text-white text-xs">
                {timeContext.dayOfWeek}, {timeContext.month} {timeContext.date}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400">Current Time</span>
              <div className="font-bold text-white text-xs font-mono">
                {timeContext.time12} ({timeContext.time24})
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400">Timezone</span>
              <div className="font-bold text-cyan-200 text-xs truncate" title={timeContext.timezone}>
                {timeContext.timezone} ({timeContext.timezoneShort})
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
              <span className="text-[10px] text-slate-400">UTC Offset & DST</span>
              <div className="font-bold text-slate-200 text-xs font-mono">
                {timeContext.utcOffset} • {timeContext.isDST ? 'DST Active' : 'Standard'}
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Alya retrieves date & time dynamically from your device clock on every turn. Outdated years (such as 2024) are completely replaced.
          </p>
        </div>

        {/* Automatic Language Adaptation Mode */}
        <div className="glass-card rounded-2xl p-3.5 border border-pink-500/25 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-pink-300">
            <div className="flex items-center gap-2">
              <Languages size={15} />
              <span>Language & Tone Adaptation</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
              {settings.preferredLanguage === 'hinglish'
                ? 'Hinglish Mode'
                : settings.preferredLanguage === 'hindi'
                ? 'Hindi Mode'
                : settings.preferredLanguage === 'english'
                ? 'English Mode'
                : 'Auto Dynamic'}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-normal">
            Choose how Alya responds to you. In <strong>Auto Dynamic</strong>, Alya mirrors your style: respond in Hinglish when you speak Hinglish, or English when you switch to English.
          </p>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'auto', label: 'Auto' },
              { id: 'hinglish', label: 'Hinglish' },
              { id: 'english', label: 'English' },
              { id: 'hindi', label: 'Hindi' },
            ].map((opt) => {
              const currentChoice = settings.preferredLanguage || 'auto';
              const isSelected = currentChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ preferredLanguage: opt.id as any })}
                  className={`py-2 px-1 rounded-xl text-xs font-bold text-center border transition-all ${
                    isSelected
                      ? 'bg-pink-500/20 border-pink-400 text-pink-200 shadow-md ring-1 ring-pink-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto Features Quick Launcher */}
        {onOpenAutoFeatures && (
          <div className="glass-card rounded-2xl p-3 border border-pink-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                <Sliders size={14} />
                <span>Auto Features & Hands-Free Flow</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                Configured
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Manage Auto Mic, Auto Listen, Auto Reply, Auto TTS, and Smart Interruption.
            </p>
            <button
              type="button"
              onClick={onOpenAutoFeatures}
              className="w-full py-2 px-3 rounded-xl bg-pink-600/30 hover:bg-pink-600/40 border border-pink-500/40 text-pink-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <Sliders size={13} />
              <span>Open Auto Features Controls</span>
            </button>
          </div>
        )}

        {/* API Configuration */}
        <div className="glass-card rounded-2xl p-3 border border-pink-500/25 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-pink-300">
            <div className="flex items-center gap-2">
              <Key size={14} />
              <span>Google Gemini API Configuration</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                userApiKey || hasGeminiKey
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
              }`}
            >
              {userApiKey ? 'User Key Active' : hasGeminiKey ? 'Server Key Active' : 'Fallback Engine'}
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter your Gemini API key (AIza...)"
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 text-slate-400 hover:text-white transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {testResult.status !== 'idle' && (
              <div
                className={`p-2 rounded-xl text-[11px] flex items-center gap-1.5 ${
                  testResult.status === 'success'
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                }`}
              >
                {testResult.status === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="flex-1 py-1.5 px-3 rounded-xl glass-panel border border-white/10 hover:bg-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isTesting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                <span>Test Key</span>
              </button>
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={!keyInput.trim() || keyInput === userApiKey}
                className="flex-1 py-1.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Check size={12} />
                <span>Save Key</span>
              </button>
              {userApiKey && (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="py-1.5 px-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center justify-center transition-colors"
                  title="Remove API Key"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
              <span>Securely stored on device</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
              >
                <span>Get Gemini Key</span>
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>

        {/* Active AI Companion */}
        <div className="glass-card rounded-2xl p-3 border border-pink-500/20 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
            <Cpu size={14} />
            <span>Active AI Companion</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  selectedCompanion: 'alya',
                  selectedVoiceId: 'alya_natural',
                })
              }
              className={`p-2.5 rounded-xl border text-left transition-all ${
                settings.selectedCompanion !== 'jarvis'
                  ? 'bg-pink-500/20 border-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.3)] ring-1 ring-pink-400'
                  : 'glass-panel-subtle border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <span>🌸</span>
                <span>Alya</span>
              </div>
              <p className="text-[10px] text-pink-200/80 mt-0.5">Anime Female Companion</p>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  selectedCompanion: 'jarvis',
                  selectedVoiceId: settings.jarvisVoice || 'jarvis_deep',
                })
              }
              className={`p-2.5 rounded-xl border text-left transition-all ${
                settings.selectedCompanion === 'jarvis'
                  ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                  : 'glass-panel-subtle border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <span>⚡</span>
                <span>Jarvis</span>
              </div>
              <p className="text-[10px] text-amber-200/80 mt-0.5">Futuristic Tactical AI</p>
            </button>
          </div>
        </div>

        {/* Voice & Audio Playback */}
        <div className="glass-card rounded-2xl p-3 border border-purple-500/20 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
            <Volume2 size={14} />
            <span>Voice & Speech Delivery</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
            <div>
              <div className="font-semibold text-white">Auto-Speak Responses</div>
              <div className="text-[10px] text-slate-400">Read companion replies out loud</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoSpeakResponse: !settings.autoSpeakResponse })}
              className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.autoSpeakResponse ? 'bg-pink-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoSpeakResponse ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-1 py-1 border-b border-white/5">
            <div className="flex justify-between text-xs">
              <span className="text-white font-semibold">Voice Volume</span>
              <span className="text-pink-300 font-semibold">{Math.round((settings.voiceVolume ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.voiceVolume ?? 1}
              onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
              className="w-full accent-pink-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-1 py-1 border-b border-white/5">
            <div className="flex justify-between text-xs">
              <span className="text-white font-semibold">Speaking Speed</span>
              <span className="text-purple-300 font-semibold">{settings.voiceSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.voiceSpeed}
              onChange={(e) => onUpdateSettings({ voiceSpeed: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
            <div>
              <div className="font-semibold text-white">Floating Alya Avatar</div>
              <div className="text-[10px] text-slate-400">Compact draggable anime widget with voice controls</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ floatingMiniEnabled: !settings.floatingMiniEnabled })}
              className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.floatingMiniEnabled ? 'bg-pink-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.floatingMiniEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div>
              <div className="font-semibold text-white">Background Companion Service</div>
              <div className="text-[10px] text-slate-400">Keep Alya ready when app is minimized (User controlled)</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ backgroundServiceMode: !settings.backgroundServiceMode })}
              className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.backgroundServiceMode ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.backgroundServiceMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Privacy-First Permissions */}
        <div className="glass-card rounded-2xl p-3 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <div className="flex items-center gap-1.5">
              <Shield size={14} />
              <span>Privacy & Permissions Manager</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <Mic size={15} className="text-pink-400" />
                <div>
                  <div className="font-medium text-slate-100">Microphone</div>
                  <div className="text-[10px] text-slate-400">Only requested when you tap voice or talk</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
                Ready on Demand
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white/5">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-cyan-400" />
                <div>
                  <div className="font-medium text-slate-100">Optional Location</div>
                  <div className="text-[10px] text-slate-400">
                    {hasDeniedLocation ? 'Declined • Using browser timezone' : 'Optional enhancement only'}
                  </div>
                </div>
              </div>
              {onRequestLocationPermission && !hasDeniedLocation && (
                <button
                  type="button"
                  onClick={onRequestLocationPermission}
                  className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-colors"
                >
                  Configure
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cross-Platform App & Backend Connection */}
        <div className="glass-card rounded-2xl p-3.5 border border-purple-500/25 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300">
            <div className="flex items-center gap-1.5">
              <Globe size={14} />
              <span>Cross-Platform & Server Connection</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-semibold">
              {isNativeContainer ? 'Android APK Mode' : isInstalled ? 'Installed App' : 'Web / PWA'}
            </span>
          </div>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => promptInstall()}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md active:scale-98"
            >
              <span>Install Alya App on Device</span>
            </button>
          )}

          {!isInstalled && isIOS && (
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300">
              On iPhone/iPad: tap <span className="text-pink-300 font-semibold">Share</span> in Safari and choose{' '}
              <span className="text-pink-300 font-semibold">Add to Home Screen</span> for full-screen app mode.
            </div>
          )}

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Active API Server</span>
              <span className="font-mono text-[10px] text-cyan-300 truncate max-w-[190px]" title={activeBackendOrigin}>
                {activeBackendOrigin}
              </span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="url"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="Custom Backend HTTPS URL (optional for APK)"
                className="flex-1 bg-black/50 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => {
                  const savedOk = setCustomApiBaseUrl(backendUrlInput);
                  if (!savedOk) {
                    setBackendSaveStatus(
                      'Invalid backend URL. Enter a valid http:// or https:// server URL (localhost is not supported on Android APK).',
                    );
                    return;
                  }
                  setBackendUrlInput(getCustomApiBaseUrl());
                  setBackendSaveStatus(
                    backendUrlInput.trim()
                      ? 'Custom backend server URL saved.'
                      : 'Reset to default cloud backend server.',
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
              >
                Save
              </button>
            </div>
            {backendSaveStatus && (
              <p
                className={`text-[10px] ${
                  backendSaveStatus.startsWith('Invalid') ? 'text-rose-400' : 'text-emerald-300'
                }`}
              >
                {backendSaveStatus}
              </p>
            )}
          </div>
        </div>

        {/* Help Center */}
        {onOpenGuide && (
          <div className="glass-card rounded-2xl p-3.5 border border-pink-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-pink-300">
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} />
                <span>Help & Guides</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenGuide}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600/80 to-purple-600/80 text-white transition-all shadow-md active:scale-98"
            >
              <BookOpen size={14} />
              <span>Open Getting Started Guide</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
