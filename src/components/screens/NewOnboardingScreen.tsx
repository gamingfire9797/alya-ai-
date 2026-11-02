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
  Lock,
  LogIn,
  Shield,
  UserCheck,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  CompanionCharacter,
  UserProfile,
  OnboardingPreferences,
  MemoryItem,
  ChatMessage,
} from '../../types';
import { HolographicAvatar } from '../character/HolographicAvatar';
import { UserProfileCard } from '../profile/UserProfileCard';
import { PersonalPreferencesForm } from '../profile/PersonalPreferencesModal';
import {
  PRESET_AVATARS,
  PRESET_BANNERS,
  validateImageFile,
  compressImage,
} from '../../utils/imageUtils';
import { playChime, CompanionTTS } from '../../utils/audio';
import { VOICE_STYLES } from '../../data/initialData';
import { apiFetch } from '../../utils/apiConfig';
import { Storage } from '../../utils/storage';
import {
  signInWithGooglePopup,
  getGoogleAuthStatus,
  checkFirebaseDomainAuthorization,
  FirebaseDomainDiagnostics,
  tryFirebaseEmailRegister,
  tryFirebaseEmailSignIn,
  trySendFirebasePasswordReset,
} from '../../utils/authService';

export interface OnboardingCompletionPayload {
  profile: UserProfile;
  sessionToken: string;
  userData?: {
    chats?: { alya?: ChatMessage[]; jarvis?: ChatMessage[] };
    memories?: MemoryItem[];
    onboardingPreferences?: OnboardingPreferences | null;
  };
  migratedFromGuestId?: string;
}

interface NewOnboardingScreenProps {
  initialCompanion?: CompanionCharacter;
  existingGuestUser?: UserProfile | null;
  existingGuestToken?: string | null;
  onFinishOnboarding: (
    profile: UserProfile,
    sessionToken: string,
    extra?: {
      userData?: OnboardingCompletionPayload['userData'];
      migratedFromGuestId?: string;
    },
  ) => void;
  onSelectCompanion: (char: CompanionCharacter) => void;
  onCancelUpgrade?: () => void;
}

type AuthFlowMode = 'welcome' | 'login' | 'register' | 'guest' | 'google_setup';

export const NewOnboardingScreen: React.FC<NewOnboardingScreenProps> = ({
  initialCompanion = 'alya',
  existingGuestUser = null,
  existingGuestToken = null,
  onFinishOnboarding,
  onSelectCompanion,
  onCancelUpgrade,
}) => {
  const [flowMode, setFlowMode] = useState<AuthFlowMode>('welcome');
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionCharacter>(initialCompanion);
  const isJarvis = selectedCompanion === 'jarvis';

  // Login & Password Reset form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetStatusMsg, setResetStatusMsg] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Registration / Profile setup state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
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

  // Google Auth interim state
  const [googleIdentity, setGoogleIdentity] = useState<{
    idToken: string;
    googleSub: string;
    email: string;
    displayName: string;
    photoURL: string;
  } | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Guest Migration explicit confirmation state
  const isUpgradingFromGuest = Boolean(
    existingGuestUser && existingGuestUser.accountType === 'guest',
  );
  const [confirmMigrateGuest, setConfirmMigrateGuest] = useState<boolean>(false);

  // Avatar & Banner state
  const [selectedAvatar, setSelectedAvatar] = useState('alya_pink');
  const [selectedBanner, setSelectedBanner] = useState('cyber_neon');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [customBannerUrl, setCustomBannerUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Onboarding Preferences & Memories state
  const [onboardingPreferences, setOnboardingPreferences] =
    useState<OnboardingPreferences | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showQuickIntro, setShowQuickIntro] = useState(false);
  const [createdPayload, setCreatedPayload] = useState<OnboardingCompletionPayload | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const googleAuthStatus = getGoogleAuthStatus();
  const [domainDiag, setDomainDiag] = useState<FirebaseDomainDiagnostics | null>(null);
  const [showDomainSetupCard, setShowDomainSetupCard] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [isCheckingDomains, setIsCheckingDomains] = useState(false);

  useEffect(() => {
    let active = true;
    checkFirebaseDomainAuthorization().then((diag) => {
      if (active) {
        setDomainDiag(diag);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCopyDomain = async (domainText: string) => {
    try {
      await navigator.clipboard.writeText(domainText);
      setCopiedDomain(domainText);
      playChime('click');
      setTimeout(() => {
        setCopiedDomain((prev) => (prev === domainText ? null : prev));
      }, 2000);
    } catch (_) {}
  };

  const handleRecheckDomainAndRetry = async () => {
    setIsCheckingDomains(true);
    setSubmitError(null);
    const diag = await checkFirebaseDomainAuthorization();
    setDomainDiag(diag);
    setIsCheckingDomains(false);
    if (diag.isCurrentDomainAuthorized) {
      setShowDomainSetupCard(false);
      await handleGoogleSignIn();
    } else {
      setShowDomainSetupCard(true);
      setSubmitError(
        `Domain "${diag.currentHostname}" is still not listed in Firebase project "${diag.projectId}". Please add it in Firebase Console -> Authentication -> Settings -> Authorized domains and click Save.`,
      );
    }
  };

  const handlePlayGreeting = () => {
    CompanionTTS.unlockAudio();
    setIsPlayingGreeting(true);
    const voiceStyle =
      selectedCompanion === 'jarvis'
        ? VOICE_STYLES.find((v) => v.id === 'jarvis_deep') || VOICE_STYLES[0]
        : VOICE_STYLES.find((v) => v.id === 'alya_natural') || VOICE_STYLES[4];

    const greetingText =
      selectedCompanion === 'jarvis'
        ? 'Greetings. I am Jarvis, your intelligent tactical assistant. I am ready to configure your personal profile.'
        : "Konnichiwa! I'm Alya, your bilingual AI companion. I'm so excited to meet you!";

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

  // Validate username availability when in register or google_setup mode
  useEffect(() => {
    if (flowMode === 'guest' || flowMode === 'login') return;
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
    if (clean === 'gamingfire' || clean === 'admin' || clean === 'alya' || clean === 'jarvis') {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'This username is reserved. Please pick another.',
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
        const localAvail = Storage.isOfflineUsernameAvailable(clean);
        setUsernameStatus({
          checked: true,
          available: localAvail,
          message: localAvail
            ? 'Username available on device.'
            : 'Username is already taken on this device.',
        });
      } finally {
        setIsCheckingUsername(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [username, flowMode]);

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

  // 1. Handle Sign In with Google
  const handleGoogleSignIn = async () => {
    CompanionTTS.stop();
    setIsPlayingGreeting(false);
    setSubmitError(null);
    setIsGoogleLoading(true);
    try {
      const identity = await signInWithGooglePopup();
      // Authenticate with backend to check if user already exists
      const res = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: identity.idToken,
          displayName: identity.displayName,
          companionPreference: selectedCompanion,
          migrateFromGuestToken:
            isUpgradingFromGuest && confirmMigrateGuest ? existingGuestToken : undefined,
          confirmMigrateGuest: Boolean(isUpgradingFromGuest && confirmMigrateGuest),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google authentication failed on server.');
      }

      playChime('heart');

      // If existing user returning, complete immediately and restore their saved data
      if (!data.isNewUser) {
        onFinishOnboarding(data.user, data.session.token, {
          userData: data.userData,
          migratedFromGuestId:
            isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
        });
        return;
      }

      // If new Google user, pre-fill their info and let them customize preferences (Step 4)
      setGoogleIdentity(identity);
      setNickname(data.user.displayName || identity.displayName || 'Explorer');
      setUsername(data.user.username || '');
      if (identity.photoURL) {
        setCustomAvatarUrl(identity.photoURL);
      }
      setCreatedPayload({
        profile: data.user,
        sessionToken: data.session.token,
        userData: data.userData,
        migratedFromGuestId:
          isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
      });
      setFlowMode('google_setup');
      setStep(4);
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.diagnostics) {
        if (err.diagnostics) {
          setDomainDiag(err.diagnostics);
        }
        setShowDomainSetupCard(true);
      }
      setSubmitError(err?.message || 'Google Sign-In could not be completed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Handle Sign In to Existing Account (Username/Email + Password)
  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) return;
    setIsLoggingIn(true);
    setSubmitError(null);
    setResetStatusMsg(null);
    try {
      const cleanId = loginIdentifier.trim();
      // If user entered an email address, also attempt Firebase Email/Password sign-in
      if (cleanId.includes('@') && loginPassword) {
        await tryFirebaseEmailSignIn(cleanId, loginPassword);
      }
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanId,
          password: loginPassword,
          migrateFromGuestToken:
            isUpgradingFromGuest && confirmMigrateGuest ? existingGuestToken : undefined,
          confirmMigrateGuest: Boolean(isUpgradingFromGuest && confirmMigrateGuest),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid username or password.');
      }
      playChime('heart');
      onFinishOnboarding(data.user, data.session.token, {
        userData: data.userData,
        migratedFromGuestId:
          isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
      });
    } catch (err: any) {
      // Check offline device registry if backend was unreachable
      const offlineAuth = await Storage.authenticateOfflineAccount(
        loginIdentifier.trim(),
        loginPassword,
      );
      if (offlineAuth.success && offlineAuth.user) {
        playChime('heart');
        const u = offlineAuth.user;
        onFinishOnboarding(u, `local_tok_${Date.now().toString(36)}`, {
          userData: {
            chats: {
              alya: Storage.loadMessages('alya', u.displayName, u.id),
              jarvis: Storage.loadMessages('jarvis', u.displayName, u.id),
            },
            memories: Storage.loadMemories(u.id),
            onboardingPreferences: Storage.loadOnboardingPreferences(u.id),
          },
          migratedFromGuestId:
            isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
        });
        return;
      }
      setSubmitError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Password Reset from Login Screen
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || resetNewPassword.trim().length < 6) {
      setSubmitError('Please enter your username/email and a new password (at least 6 characters).');
      return;
    }
    setIsResettingPassword(true);
    setSubmitError(null);
    setResetStatusMsg(null);
    try {
      if (resetEmail.trim().includes('@')) {
        await trySendFirebasePasswordReset(resetEmail.trim());
      }
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          email: resetEmail.trim() || undefined,
          newPassword: resetNewPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not reset password.');
      }
      await Storage.resetOfflinePassword({
        identifier: loginIdentifier.trim(),
        email: resetEmail.trim() || undefined,
        newPassword: resetNewPassword.trim(),
      });
      setLoginPassword(resetNewPassword.trim());
      setShowPasswordReset(false);
      setResetStatusMsg('Password updated! You can now sign in below.');
      playChime('heart');
    } catch (err: any) {
      const offlineRes = await Storage.resetOfflinePassword({
        identifier: loginIdentifier.trim(),
        email: resetEmail.trim() || undefined,
        newPassword: resetNewPassword.trim(),
      });
      if (offlineRes.success) {
        setLoginPassword(resetNewPassword.trim());
        setShowPasswordReset(false);
        setResetStatusMsg('Device account password updated! You can now sign in below.');
        playChime('heart');
      } else {
        setSubmitError(err?.message || offlineRes.error || 'Password reset failed.');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  // 3. Finalize Account / Guest Creation
  const handleFinalizeSetup = async (prefsOverride?: OnboardingPreferences | null) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const activePrefs = prefsOverride !== undefined ? prefsOverride : onboardingPreferences;
    const effectiveAvatar = customAvatarUrl || selectedAvatar;
    const effectiveBanner = customBannerUrl || selectedBanner;
    const effectiveNickname =
      (activePrefs?.callsign || nickname || '').trim() ||
      (flowMode === 'guest' ? 'Guest Explorer' : 'Explorer');
    const effectiveCompanion = activePrefs?.companionPreference || selectedCompanion;
    const initialMemories = activePrefs ? Storage.preferencesToMemories(activePrefs) : [];

    // If Google user already created on step 1, update their preferences and finish
    if (flowMode === 'google_setup' && createdPayload) {
      const updatedUser: UserProfile = {
        ...createdPayload.profile,
        displayName: effectiveNickname,
        companionPreference: effectiveCompanion,
        onboardingPreferences: activePrefs || undefined,
      };
      try {
        await apiFetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${createdPayload.sessionToken}`,
          },
          body: JSON.stringify({
            preferences: activePrefs,
            memories: initialMemories,
          }),
        });
      } catch (_) {}

      setCreatedPayload({
        ...createdPayload,
        profile: updatedUser,
        userData: {
          ...createdPayload.userData,
          memories: initialMemories,
          onboardingPreferences: activePrefs,
        },
      });
      setIsSubmitting(false);
      setShowQuickIntro(true);
      return;
    }

    try {
      if (flowMode === 'guest') {
        const res = await apiFetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: effectiveNickname,
            companionPreference: effectiveCompanion,
            avatarUrl: effectiveAvatar,
            bannerUrl: effectiveBanner,
            onboardingPreferences: activePrefs || undefined,
            initialMemories,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to initialize guest session.');
        }
        playChime('heart');
        setCreatedPayload({
          profile: data.user,
          sessionToken: data.session?.token || `guest_sess_${Date.now()}`,
          userData: data.userData || {
            chats: { alya: [], jarvis: [] },
            memories: initialMemories,
            onboardingPreferences: activePrefs,
          },
        });
        setShowQuickIntro(true);
      } else {
        const effectiveUsername = username.trim().toLowerCase();
        let firebaseUid: string | undefined;
        if (email.trim() && password.trim().length >= 6) {
          const fbRes = await tryFirebaseEmailRegister(email.trim(), password.trim());
          if (fbRes?.firebaseUid) {
            firebaseUid = fbRes.firebaseUid;
          }
        }
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: effectiveUsername,
            displayName: effectiveNickname,
            email: email.trim() || undefined,
            password: password || undefined,
            firebaseUid,
            accountType: 'registered',
            avatarUrl: effectiveAvatar,
            bannerUrl: effectiveBanner,
            companionPreference: effectiveCompanion,
            onboardingPreferences: activePrefs || undefined,
            initialMemories,
            migrateFromGuestToken:
              isUpgradingFromGuest && confirmMigrateGuest ? existingGuestToken : undefined,
            confirmMigrateGuest: Boolean(isUpgradingFromGuest && confirmMigrateGuest),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create account.');
        }
        // Also save in device offline account registry for offline resilience
        await Storage.registerOfflineAccount({
          user: data.user,
          password: password || undefined,
        });
        playChime('heart');
        setCreatedPayload({
          profile: data.user,
          sessionToken: data.session?.token || `usr_sess_${Date.now()}`,
          userData: data.userData || {
            chats: { alya: [], jarvis: [] },
            memories: initialMemories,
            onboardingPreferences: activePrefs,
          },
          migratedFromGuestId:
            isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
        });
        setShowQuickIntro(true);
      }
    } catch (err: any) {
      // If server is unreachable on mobile APK, create isolated local profile
      const rand = Math.random().toString(36).slice(2, 8);
      const isGuest = flowMode === 'guest';
      const fallbackUser: UserProfile = {
        id: isGuest ? `usr_guest_${Date.now().toString(36)}_${rand}` : `usr_${Date.now().toString(36)}_${rand}`,
        accountType: isGuest ? 'guest' : 'registered',
        email: email.trim() || undefined,
        displayName: effectiveNickname,
        username: isGuest ? `guest_${rand}` : username.trim().toLowerCase() || `user_${rand}`,
        avatarUrl: effectiveAvatar,
        bannerUrl: effectiveBanner,
        companionPreference: effectiveCompanion,
        hasCompletedProfile: true,
        hasCompletedOnboarding: true,
        hasCompletedKeySetup: false,
        createdAt: new Date().toISOString(),
        onboardingPreferences: activePrefs || undefined,
      };
      if (!isGuest) {
        await Storage.registerOfflineAccount({
          user: fallbackUser,
          password: password || undefined,
        });
      }
      playChime('heart');
      setCreatedPayload({
        profile: fallbackUser,
        sessionToken: `usr_sess_${Date.now()}_${rand}`,
        userData: {
          chats: { alya: [], jarvis: [] },
          memories: initialMemories,
          onboardingPreferences: activePrefs,
        },
        migratedFromGuestId:
          isUpgradingFromGuest && confirmMigrateGuest ? existingGuestUser?.id : undefined,
      });
      setShowQuickIntro(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAll = () => {
    if (createdPayload) {
      onFinishOnboarding(createdPayload.profile, createdPayload.sessionToken, {
        userData: createdPayload.userData,
        migratedFromGuestId: createdPayload.migratedFromGuestId,
      });
    }
  };

  const effectiveAvatar = customAvatarUrl || selectedAvatar;
  const effectiveBanner = customBannerUrl || selectedBanner;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-[#07050f] text-white p-4 sm:p-6 select-none scrollbar-none">
      {/* Top Progress / Navigation Header */}
      <div className="relative z-10 w-full max-w-md mx-auto pt-1 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          {(step > 1 || flowMode === 'login') && !showQuickIntro ? (
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                if (flowMode === 'login') {
                  setFlowMode('welcome');
                  setStep(1);
                } else if (step > 1) {
                  const prevStep = (step - 1) as 1 | 2 | 3 | 4 | 5;
                  setStep(prevStep);
                  if (prevStep === 1) setFlowMode('welcome');
                }
                playChime('click');
              }}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : onCancelUpgrade ? (
            <button
              type="button"
              onClick={onCancelUpgrade}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to App</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-bold text-pink-400">
              <span>ALYA AI • MULTI-USER</span>
            </span>
          )}
          {!showQuickIntro && flowMode !== 'login' && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
              Step {step} of 5
            </span>
          )}
        </div>
        {!showQuickIntro && flowMode !== 'login' && (
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

      {/* Main Content Area */}
      {showQuickIntro && createdPayload ? (
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-4 space-y-5 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold font-comfortaa text-white">
              Welcome, {createdPayload.profile.displayName}!
            </h2>
            <p className="text-xs text-slate-300 font-quicksand">
              {createdPayload.profile.accountType === 'guest'
                ? 'Your isolated Guest profile is ready. Note: Guest data is stored locally on this device and may be lost if app data is cleared or uninstalled.'
                : `Your ${
                    createdPayload.profile.accountType === 'google' ? 'Google-linked' : 'personal'
                  } account (@${createdPayload.profile.username}) is active with isolated chat history & memory bank.`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-pink-300">
                <MessageSquare size={16} />
                <span>Private Chat History</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Conversations are strictly isolated to your unique user ID ({createdPayload.profile.id.slice(0, 12)}...).
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-purple-300">
                <Brain size={16} />
                <span>Personal Memory Bank</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {(createdPayload.userData?.memories?.length || 0) > 0
                  ? `${createdPayload.userData?.memories?.length} personal preferences saved to your Memory Bank.`
                  : 'Add or edit preferences anytime in Memory Bank or Settings.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Zap size={16} />
                <span>Dual Personas</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Switch seamlessly between warm companion Alya and tactical assistant Jarvis.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-rose-300">
                <Mic size={16} />
                <span>Real-Time Voice</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hands-free bilingual speech recognition and natural neural voice synthesis.
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
            <span>Open Alya AI Interface</span>
            <ArrowRight size={17} />
          </button>
        </div>
      ) : flowMode === 'login' ? (
        /* EXISTING ACCOUNT SIGN-IN VIEW */
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-3 space-y-4 animate-fadeIn">
          <div className="text-center space-y-1">
            <div className="inline-flex p-2.5 rounded-2xl bg-white/5 border border-white/10 mb-1">
              <LogIn size={22} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            </div>
            <h2 className="text-2xl font-bold font-comfortaa text-white">Sign In to Your Account</h2>
            <p className="text-xs text-slate-400 font-quicksand">
              Restore your personal profile, saved memories, and conversation history.
            </p>
          </div>

          {isUpgradingFromGuest && (
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 cursor-pointer text-left">
              <input
                type="checkbox"
                checked={confirmMigrateGuest}
                onChange={(e) => setConfirmMigrateGuest(e.target.checked)}
                className="mt-0.5 accent-pink-500 w-4 h-4"
              />
              <div className="text-[11px] text-slate-200 leading-relaxed">
                <strong className="text-pink-300">Migrate Guest Data:</strong> Copy my current Guest session&apos;s chat history and memories ({existingGuestUser?.displayName}) into this account upon sign-in.
              </div>
            </label>
          )}

          {resetStatusMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{resetStatusMsg}</span>
            </div>
          )}

          {showPasswordReset ? (
            <form onSubmit={handlePasswordReset} className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300">Reset Account Password</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setSubmitError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Back to Sign In
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Username or Email</label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Registered Email (if set on account)
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white"
                />
              </div>
              {submitError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={!loginIdentifier.trim() || resetNewPassword.trim().length < 6 || isResettingPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs disabled:opacity-40"
              >
                {isResettingPassword ? 'Resetting Password...' : 'Save New Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAccountLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email or Username</label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="you@example.com or your_username"
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordReset(true);
                      setSubmitError(null);
                    }}
                    className="text-[11px] text-pink-300 hover:text-pink-200 underline"
                  >
                    Forgot / Reset Password?
                  </button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!loginIdentifier.trim() || isLoggingIn}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-40 ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In & Restore Data</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-center my-2">
          {/* STEP 1: WELCOME & AUTHENTICATION METHOD SELECTION */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center space-y-3 animate-fadeIn">
              <div className="relative flex items-center justify-center w-full max-h-[175px]">
                <div
                  className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 ${
                    isJarvis ? 'bg-amber-500/20 scale-105' : 'bg-pink-500/20 scale-105'
                  }`}
                />
                <HolographicAvatar
                  character={selectedCompanion}
                  expression={isJarvis ? 'calm' : 'happy'}
                  size="sm"
                  className="transition-transform duration-500"
                />
              </div>

              <div className="text-center space-y-1 px-2">
                <h1 className="text-xl sm:text-2xl font-bold font-comfortaa tracking-wide text-white">
                  Welcome to <span className={isJarvis ? 'text-amber-300' : 'text-pink-400'}>Alya AI</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-quicksand max-w-xs mx-auto">
                  {isUpgradingFromGuest
                    ? `Upgrade or link your Guest profile (${existingGuestUser?.displayName}) to a permanent account.`
                    : 'Choose your AI companion persona and how you would like to sign in.'}
                </p>
              </div>

              {/* Persona Switcher + Voice Preview */}
              <div className="flex items-center gap-2 w-full max-w-xs">
                <div className="flex flex-1 items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSwitchCompanion('alya')}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      !isJarvis
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🌸 Alya
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchCompanion('jarvis')}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      isJarvis
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ Jarvis
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePlayGreeting}
                  disabled={isPlayingGreeting}
                  className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all flex items-center gap-1.5 active:scale-95 ${
                    isPlayingGreeting
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                  title="Hear Voice Preview"
                >
                  <Mic size={13} className={isPlayingGreeting ? 'animate-bounce' : ''} />
                  <span>{isPlayingGreeting ? 'Speaking' : 'Voice'}</span>
                </button>
              </div>

              {/* Explicit Guest Data Migration Checkbox when upgrading from Guest */}
              {isUpgradingFromGuest && (
                <label className="w-full flex items-start gap-2.5 p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 cursor-pointer text-left">
                  <input
                    type="checkbox"
                    checked={confirmMigrateGuest}
                    onChange={(e) => setConfirmMigrateGuest(e.target.checked)}
                    className="mt-0.5 accent-pink-500 w-4 h-4"
                  />
                  <div className="text-[11px] text-slate-200 leading-tight">
                    <strong className="text-pink-300">Migrate Guest Data:</strong> Transfer my current Guest chat history, memories, and preferences to the account I sign into.
                  </div>
                </label>
              )}

              {submitError && (
                <div className="w-full p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Firebase Authorized Domain Diagnostic & Setup Helper */}
              {domainDiag && (!domainDiag.isCurrentDomainAuthorized || showDomainSetupCard) && (
                <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Shield size={13} className="shrink-0" />
                      <span>Firebase Domain Authorization Needed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDomainSetupCard((v) => !v)}
                      className="text-[10px] text-amber-200/80 hover:text-white underline"
                    >
                      {showDomainSetupCard ? 'Hide Details' : 'Setup Steps'}
                    </button>
                  </div>

                  <p className="text-slate-300 leading-snug">
                    Firebase project <span className="font-mono text-amber-200">{domainDiag.projectId}</span> does not yet authorize <span className="font-mono text-white">{domainDiag.currentHostname}</span> for Google Sign-In.
                  </p>

                  {showDomainSetupCard && (
                    <div className="space-y-2 pt-1 border-t border-amber-500/20">
                      <p className="text-[10px] text-slate-300">
                        Add these domains in <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>:
                      </p>
                      <div className="space-y-1">
                        {domainDiag.requiredDomains.map((item) => (
                          <div
                            key={item.domain}
                            className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl bg-black/40 border border-white/10"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                                <span>{item.label}</span>
                                {item.isAuthorized ? (
                                  <span className="text-emerald-400 font-semibold">• Authorized</span>
                                ) : (
                                  <span className="text-amber-300 font-semibold">• Missing</span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-white truncate">
                                {item.domain}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyDomain(item.domain)}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white flex items-center gap-1 shrink-0"
                            >
                              {copiedDomain === item.domain ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleRecheckDomainAndRetry}
                        disabled={isCheckingDomains || isGoogleLoading}
                        className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all"
                      >
                        <RefreshCw size={12} className={isCheckingDomains ? 'animate-spin' : ''} />
                        <span>
                          {isCheckingDomains
                            ? 'Checking Firebase Authorized Domains...'
                            : 'I Added the Domain — Re-check & Retry Google Sign-In'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Auth Options */}
              <div className="w-full space-y-2 pt-1">
                {/* 1. Sign in with Google */}
                {googleAuthStatus.configured && (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 size={16} className="animate-spin text-slate-700" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                  </button>
                )}

                {/* 2. Create New Alya Account */}
                <button
                  type="button"
                  onClick={() => {
                    CompanionTTS.stop();
                    setIsPlayingGreeting(false);
                    setSubmitError(null);
                    setFlowMode('register');
                    setStep(2);
                    playChime('click');
                  }}
                  className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                    isJarvis
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                      : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                  }`}
                >
                  <UserCheck size={16} />
                  <span>Create Account (Username & Password)</span>
                </button>

                {/* 3. Sign in to Existing Account + Continue as Guest */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      CompanionTTS.stop();
                      setIsPlayingGreeting(false);
                      setSubmitError(null);
                      setFlowMode('login');
                      playChime('click');
                    }}
                    className="py-2.5 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-all active:scale-95"
                  >
                    <LogIn size={14} />
                    <span>Sign In</span>
                  </button>

                  {!isUpgradingFromGuest && (
                    <button
                      type="button"
                      onClick={() => {
                        CompanionTTS.stop();
                        setIsPlayingGreeting(false);
                        setSubmitError(null);
                        setFlowMode('guest');
                        setNickname('Guest Explorer');
                        setStep(2);
                        playChime('click');
                      }}
                      className="py-2.5 px-3 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
                    >
                      <User size={14} />
                      <span>Continue as Guest</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IDENTITY & CREDENTIALS (REGISTER OR GUEST) */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="inline-flex p-2 rounded-2xl bg-white/5 border border-white/10 mb-1">
                  {flowMode === 'guest' ? (
                    <User size={20} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                  ) : (
                    <AtSign size={20} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-comfortaa text-white">
                  {flowMode === 'guest' ? 'Guest Mode Setup' : 'Create Your Account'}
                </h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  {flowMode === 'guest'
                    ? 'Try Alya AI with an isolated local guest profile. Note: Guest data is stored only on this device and may be lost if app data is cleared or the app is uninstalled.'
                    : 'Choose a unique username, display name, and password so your chats and memories stay private to you.'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    What should {isJarvis ? 'Jarvis' : 'Alya'} call you? (Display Name)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    maxLength={40}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Your preferred name or nickname..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                  />
                </div>

                {flowMode !== 'guest' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Unique Username (3–20 characters)
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">@</div>
                        <input
                          type="text"
                          value={username}
                          maxLength={20}
                          onChange={(e) => setUsername(e.target.value.toLowerCase())}
                          placeholder="your_unique_handle"
                          className="w-full pl-8 pr-10 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                        />
                        <div className="absolute right-3.5 top-2.5">
                          {isCheckingUsername ? (
                            <Loader2 size={16} className="text-pink-400 animate-spin" />
                          ) : usernameStatus.checked ? (
                            usernameStatus.available ? (
                              <CheckCircle2 size={17} className="text-emerald-400" />
                            ) : (
                              <AlertCircle size={17} className="text-rose-400" />
                            )
                          ) : null}
                        </div>
                      </div>
                      {usernameStatus.message && (
                        <div
                          className={`text-[11px] flex items-center gap-1.5 ${
                            usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          <span>{usernameStatus.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Email Address (for Email Sign-In & Password Recovery)
                      </label>
                      <input
                        type="email"
                        value={email}
                        maxLength={80}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                        <Lock size={12} />
                        <span>Account Password (min 6 characters)</span>
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password to sign back in anytime"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/70"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                disabled={
                  !nickname.trim() ||
                  (flowMode !== 'guest' && (!usernameStatus.available || password.trim().length < 6))
                }
                onClick={() => {
                  setStep(3);
                  playChime('click');
                }}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                <span>Continue to Profile Look</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* STEP 3: AVATAR & BANNER SELECTION */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-comfortaa text-white">
                  Customize Your Profile
                </h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Pick an avatar and banner for your profile card.
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

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {uploadError}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep(4);
                  playChime('click');
                }}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                  isJarvis
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
                }`}
              >
                <span>Next: Optional Personal Preferences</span>
                <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* STEP 4: OPTIONAL PERSONAL MEMORY & PREFERENCES QUESTIONS */}
          {step === 4 && (
            <div className="space-y-3 animate-fadeIn max-h-[75dvh] overflow-y-auto pr-1 scrollbar-none">
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-xl font-bold font-comfortaa text-white flex items-center justify-center gap-1.5">
                  <Sparkles size={18} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                  <span>Tell {isJarvis ? 'Jarvis' : 'Alya'} About Yourself</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-quicksand">
                  Optional questions to personalize your conversations. You can skip and answer later in Settings.
                </p>
              </div>

              <PersonalPreferencesForm
                initialPreferences={onboardingPreferences}
                defaultCallsign={nickname}
                companion={selectedCompanion}
                onSavePreferences={(prefs) => {
                  setOnboardingPreferences(prefs);
                  if (prefs.callsign) setNickname(prefs.callsign);
                  if (prefs.companionPreference) {
                    setSelectedCompanion(prefs.companionPreference);
                    onSelectCompanion(prefs.companionPreference);
                  }
                  if (flowMode === 'google_setup') {
                    handleFinalizeSetup(prefs);
                  } else {
                    setStep(5);
                  }
                }}
                onSkip={() => {
                  if (flowMode === 'google_setup') {
                    handleFinalizeSetup(null);
                  } else {
                    setStep(5);
                  }
                }}
                submitLabel="Save Preferences & Continue"
              />
            </div>
          )}

          {/* STEP 5: CONFIRM & LAUNCH */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold font-comfortaa text-white">Confirm Your Profile</h2>
                <p className="text-xs text-slate-400 font-quicksand">
                  Review your {flowMode === 'guest' ? 'Guest' : 'Account'} profile before launching.
                </p>
              </div>

              <UserProfileCard
                profile={{
                  accountType: flowMode === 'guest' ? 'guest' : 'registered',
                  displayName: nickname.trim() || (flowMode === 'guest' ? 'Guest Explorer' : 'Explorer'),
                  username:
                    flowMode === 'guest'
                      ? 'guest_mode'
                      : username.trim().toLowerCase() || 'explorer',
                  avatarUrl: effectiveAvatar,
                  bannerUrl: effectiveBanner,
                }}
                companion={selectedCompanion}
                showEditButton={true}
                onEditProfile={() => setStep(2)}
              />

              {flowMode === 'guest' && (
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                  <Shield size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Guest Mode stores your profile, chats, and memories in isolated local storage on this device. Clearing app data or uninstalling the app will erase guest data unless you sign in from Settings to migrate it.
                  </span>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleFinalizeSetup(onboardingPreferences)}
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
                    <span>Setting Up Profile...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {flowMode === 'guest' ? 'Start in Guest Mode' : 'Create Account & Launch'}
                    </span>
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
