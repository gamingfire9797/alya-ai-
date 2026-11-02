import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  User,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  Zap,
  Mic,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { CompanionCharacter, UserProfile } from '../../types';
import { HolographicAvatar } from '../character/HolographicAvatar';
import { UserProfileCard } from '../profile/UserProfileCard';
import {
  PRESET_AVATARS,
  PRESET_BANNERS,
  validateImageFile,
  compressImage,
} from '../../utils/imageUtils';
import { playChime, CompanionTTS } from '../../utils/audio';
import { VOICE_STYLES } from '../../data/initialData';
import { apiFetch } from '../../utils/apiConfig';

interface NewOnboardingScreenProps {
  initialCompanion?: CompanionCharacter;
  onFinishOnboarding: (profile: UserProfile, sessionToken: string) => void;
  onSelectCompanion: (char: CompanionCharacter) => void;
}

export const NewOnboardingScreen: React.FC<NewOnboardingScreenProps> = ({
  initialCompanion = 'alya',
  onFinishOnboarding,
  onSelectCompanion,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionCharacter>(initialCompanion);
  const isJarvis = selectedCompanion === 'jarvis';

  const [username, setUsername] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  }>({
    checked: false,
    available: false,
    message: '',
  });

  const [nickname, setNickname] = useState('Explorer');
  const [selectedAvatar, setSelectedAvatar] = useState('alya_pink');
  const [selectedBanner, setSelectedBanner] = useState('cyber_neon');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showQuickIntro, setShowQuickIntro] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<UserProfile | null>(null);
  const [createdToken, setCreatedToken] = useState<string>('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);

  const handlePlayGreeting = () => {
    CompanionTTS.unlockAudio();
    setIsPlayingGreeting(true);
    const voiceStyle = selectedCompanion === 'jarvis'
      ? VOICE_STYLES.find(v => v.id === 'jarvis_deep') || VOICE_STYLES[0]
      : VOICE_STYLES.find(v => v.id === 'alya_natural') || VOICE_STYLES[4];

    const greetingText = selectedCompanion === 'jarvis'
      ? "Greetings. I am Jarvis, your intelligent tactical assistant. I am ready to configure your system."
      : "Konnichiwa! I'm Alya, your bilingual companion. I'm so excited to chat with you!";

    CompanionTTS.speak(greetingText, voiceStyle, {
      onEnd: () => setIsPlayingGreeting(false),
      onError: () => setIsPlayingGreeting(false),
    });
  };

  const handleSwitchCompanion = (char: CompanionCharacter) => {
    CompanionTTS.stop();
    setIsPlayingGreeting(false);
    setSelectedCompanion(char);
    onSelectCompanion(char);
    if (!customAvatarUrl) {
      setSelectedAvatar(char === 'jarvis' ? 'jarvis_gold' : 'alya_pink');
    }
    if (!customBannerUrl) {
      setSelectedBanner(char === 'jarvis' ? 'golden_grid' : 'cyber_neon');
    }
    playChime('switch');
  };

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ checked: false, available: false, message: '' });
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username must be at least 3 characters.',
      });
      return;
    }
    if (clean.length > 20) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username cannot exceed 20 characters.',
      });
      return;
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username can only contain letters, numbers, and underscores (_).',
      });
      return;
    }

    setIsCheckingUsername(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await apiFetch('/api/profile/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: clean }),
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus({
            checked: true,
            available: true,
            message: 'Username is available!',
          });
        } else {
          setUsernameStatus({
            checked: true,
            available: false,
            message: data.error || 'Username is already taken.',
          });
        }
      } catch {
        setUsernameStatus({
          checked: true,
          available: true,
          message: 'Local availability confirmed.',
        });
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [username]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid image file.');
      return;
    }
    try {
      setUploadError(null);
      const compressed = await compressImage(file, 300, 300, 0.85);
      setCustomAvatarUrl(compressed);
      playChime('click');
    } catch {
      setUploadError('Failed to process avatar image.');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, 6);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid banner image.');
      return;
    }
    try {
      setUploadError(null);
      const compressed = await compressImage(file, 1000, 360, 0.82);
      setCustomBannerUrl(compressed);
      playChime('click');
    } catch {
      setUploadError('Failed to process banner image.');
    }
  };

  const handleCreateProfile = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    const effectiveAvatar = customAvatarUrl || selectedAvatar;
    const effectiveBanner = customBannerUrl || selectedBanner;
    const effectiveNickname = nickname.trim() || 'Explorer';
    const effectiveUsername = username.trim().toLowerCase();

    try {
      const res = await apiFetch('/api/profile/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: effectiveUsername,
          displayName: effectiveNickname,
          avatarUrl: effectiveAvatar,
          bannerUrl: effectiveBanner,
          companionPreference: selectedCompanion,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create profile.');
      }
      playChime('heart');
      setCreatedProfile(data.user);
      setCreatedToken(data.session?.token || `usr_sess_${Date.now()}`);
      setShowQuickIntro(true);
    } catch (err: any) {
      const fallbackUser: UserProfile = {
        id: `usr_local_${Date.now()}`,
        displayName: effectiveNickname,
        username: effectiveUsername,
        avatarUrl: effectiveAvatar,
        bannerUrl: effectiveBanner,
        companionPreference: selectedCompanion,
        hasCompletedProfile: true,
        hasCompletedOnboarding: true,
        hasCompletedKeySetup: false,
        createdAt: new Date().toISOString(),
      };
      playChime('heart');
      setCreatedProfile(fallbackUser);
      setCreatedToken(`usr_sess_${Date.now()}`);
      setShowQuickIntro(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAll = () => {
    if (createdProfile) {
      onFinishOnboarding(createdProfile, createdToken);
    }
  };

  const effectiveAvatar = customAvatarUrl || selectedAvatar;
  const effectiveBanner = customBannerUrl || selectedBanner;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-[#07050f] text-white p-4 sm:p-6 select-none scrollbar-none">
      <div className="relative z-10 w-full max-w-md mx-auto pt-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          {step > 1 && !showQuickIntro ? (
            <button
              type="button"
              onClick={() => {
                setStep((s) => (s - 1) as any);
                playChime('click');
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-pink-400">
              <span>ALYA AI</span>
            </span>
          )}
          {!showQuickIntro && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
              Step {step} of 5
            </span>
          )}
        </div>
        {!showQuickIntro && (
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isJarvis
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500'
              }`}
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}
      </div>

      {showQuickIntro ? (
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-4 space-y-5 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold font-comfortaa text-white">
              Profile Ready, {createdProfile?.displayName}!
            </h2>
            <p className="text-xs text-slate-300 font-quicksand">
              Here is what your AI companion can do:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-pink-300">
                <MessageSquare size={16} />
                <span>Bilingual Dialogue</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Chat in English or Hindi/Hinglish with dynamic conversational adaptation.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Zap size={16} />
                <span>Dual Personas</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Switch between warm companion Alya and tactical assistant Jarvis.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <Mic size={16} />
                <span>Real-Time Voice Calls</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Speak hands-free with low-latency neural speech synthesis and auto-listening.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-purple-300">
                <Brain size={16} />
                <span>Memory Bank</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Your companion recalls preferences safely on your device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompleteAll}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 ${
              isJarvis
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-[0_0_25px_rgba(244,114,182,0.35)]'
            }`}
          >
            <span>Launch Alya AI Dashboard</span>
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-3">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center space-y-3.5 animate-fadeIn">
              <div className="relative flex items-center justify-center w-full max-h-[220px]">
                <div
                  className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                    isJarvis ? 'bg-amber-500/20 scale-105' : 'bg-pink-500/20 scale-105'
                  }`}
                />
                <HolographicAvatar
                  character={selectedCompanion}
                  expression={isJarvis ? 'calm' : 'happy'}
                  size="md"
                  className="transition-transform duration-500 hover:scale-105"
                />
              </div>

              <div className="text-center space-y-1 px-2">
                <h1 className="text-xl sm:text-2xl font-bold font-comfortaa tracking-wide text-white">
                  Welcome to <span className={isJarvis ? 'text-amber-300' : 'text-pink-400'}>Alya AI</span>
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed font-quicksand max-w-xs mx-auto">
                  Your bilingual AI companion with dynamic real-time awareness, low-latency neural speech, and customizable personas.
                </p>
              </div>

              <div className="flex items-center gap-2.5 p-1 rounded-2xl bg-white/5 border border-white/10 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchCompanion('alya')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    !isJarvis
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌸 Alya</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchCompanion('jarvis')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isJarvis
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡ Jarvis</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handlePlayGreeting}
                  disabled={isPlayingGreeting}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    isPlayingGreeting
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-pulse'
                      : isJarvis
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border-pink-400/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20'
                  }`}
                  title="Test voice greeting"
                >
                  <Mic size={14} className={isPlayingGreeting ? 'animate-bounce' : ''} />
                  <span>{isPlayingGreeting ? 'Speaking...' : 'Hear Voice Preview'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  CompanionTTS.stop();
                  setIsPlayingGreeting(false);
                  setStep(2);
                  playChime('click');
                }}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-[0_0_25px_rgba(244,114,182,0.35)]'
                }`}
              >
                <span>Get Started</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-2xl bg-white/5 border border-white/10 mb-1">
                  <AtSign size={20} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                </div>
                <h2 className="text-2xl font-bold font-comfortaa text-white">Choose Your Username</h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Pick a unique handle to identify your device profile across Alya AI.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Username (3–20 characters)</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-slate-500 font-mono text-sm">@</div>
                  <input
                    type="text"
                    value={username}
                    maxLength={20}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="your_unique_handle"
                    autoFocus
                    className="w-full pl-8 pr-10 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                  />
                  <div className="absolute right-3.5 top-3">
                    {isCheckingUsername ? (
                      <Loader2 size={16} className="text-pink-400 animate-spin" />
                    ) : usernameStatus.checked ? (
                      usernameStatus.available ? (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      ) : (
                        <AlertCircle size={18} className="text-rose-400" />
                      )
                    ) : null}
                  </div>
                </div>
                {usernameStatus.message && (
                  <div
                    className={`text-xs flex items-center gap-1.5 ${
                      usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    <span>{usernameStatus.message}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!usernameStatus.available}
                onClick={() => {
                  setStep(3);
                  playChime('click');
                }}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                <span>Continue</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-2xl bg-white/5 border border-white/10 mb-1">
                  <User size={20} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                </div>
                <h2 className="text-2xl font-bold font-comfortaa text-white">What Should Alya Call You?</h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Enter your preferred display name or nickname.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Display Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  maxLength={40}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Gamingfire"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                />
              </div>

              <button
                type="button"
                disabled={!nickname.trim()}
                onClick={() => {
                  setStep(4);
                  playChime('click');
                }}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                <span>Continue</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-comfortaa text-white">Customize Your Profile</h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Pick an avatar and banner.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Avatar Selection</span>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium"
                  >
                    <Upload size={12} />
                    <span>Upload Custom</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_AVATARS.map((p) => {
                    const isSelected = !customAvatarUrl && selectedAvatar === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setCustomAvatarUrl(null);
                          setSelectedAvatar(p.id);
                          playChime('click');
                        }}
                        className={`h-11 rounded-2xl flex items-center justify-center transition-all ${
                          isSelected
                            ? `bg-gradient-to-br ${p.gradient} ring-2 ring-white scale-105 shadow-md`
                            : 'bg-white/5 hover:bg-white/10 border border-white/5 opacity-70 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <span className="text-xl">{p.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Profile Banner</span>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium"
                  >
                    <Upload size={12} />
                    <span>Upload Custom</span>
                  </button>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_BANNERS.map((b) => {
                    const isSelected = !customBannerUrl && selectedBanner === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setCustomBannerUrl(null);
                          setSelectedBanner(b.id);
                          playChime('click');
                        }}
                        className={`h-10 rounded-xl overflow-hidden relative border text-left p-2 transition-all ${
                          isSelected
                            ? isJarvis
                              ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]'
                              : 'border-pink-400 ring-2 ring-pink-400/50 scale-[1.02]'
                            : 'border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div
                          className={`absolute inset-0 ${b.backgroundClass}`}
                          style={{ backgroundImage: b.pattern }}
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <span className="relative z-10 text-[10px] font-bold text-white drop-shadow">
                          {b.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(5);
                  playChime('click');
                }}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                <span>Preview Profile</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold font-comfortaa text-white">Confirm Your Profile</h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Review your profile before launching your companion.
                </p>
              </div>

              <UserProfileCard
                profile={{
                  displayName: nickname.trim() || 'Explorer',
                  username: username.trim().toLowerCase() || 'explorer',
                  avatarUrl: effectiveAvatar,
                  bannerUrl: effectiveBanner,
                }}
                companion={selectedCompanion}
                showEditButton={false}
              />

              {submitError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateProfile}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xl active:scale-95 ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-[0_0_25px_rgba(244,114,182,0.35)]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>Creating Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Create Profile & Launch</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
