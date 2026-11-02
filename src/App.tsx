import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CompanionCharacter,
  ScreenType,
  ExpressionType,
  ChatMessage,
  MemoryItem,
  BackgroundItem,
  VoiceStyle,
  AppSettings,
  UserProfile,
  RecognitionState,
  CoreCustomization,
  AutoFeaturesSettings,
} from './types';
import { BACKGROUNDS, VOICE_STYLES, INITIAL_SETTINGS, DEFAULT_AUTO_FEATURES } from './data/initialData';
import { Storage } from './utils/storage';
import { CompanionTTS, playChime, ambientEngine, VoiceLatencyTracker } from './utils/audio';
import { TimeEngine } from './utils/time';
import { LanguageEngine } from './utils/language';
import { PermissionManager } from './utils/permissions';
import {
  VoiceCommandRouter,
  PendingClarification,
  PendingConfirmation,
  SearchSourceItem,
} from './utils/commandRouter';
import { AndroidBridgeService, AndroidAppDefinition } from './utils/androidBridge';
import { backgroundCompanionService } from './utils/backgroundService';
import { apiFetch } from './utils/apiConfig';

// Components
import { AnimatedCompanionBackground } from './components/character/AnimatedCompanionBackground';
import { TopBar } from './components/navigation/TopBar';
import { MenuDrawer } from './components/navigation/MenuDrawer';
import { FloatingMiniAlya } from './components/overlays/FloatingMiniAlya';
import { DynamicIsland } from './components/overlays/DynamicIsland';
import { AutoFeaturesModal } from './components/overlays/AutoFeaturesModal';
import { LocationPermissionModal } from './components/overlays/LocationPermissionModal';

// Screens
import { HomeScreen } from './components/screens/HomeScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { VoiceScreen } from './components/screens/VoiceScreen';
import { MemoryScreen } from './components/screens/MemoryScreen';
import { BackgroundsScreen } from './components/screens/BackgroundsScreen';
import { PhoneControlScreen } from './components/screens/PhoneControlScreen';
import { ScreenToolsScreen } from './components/screens/ScreenToolsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { OnboardingGuideScreen } from './components/screens/OnboardingGuideScreen';
import { SplashScreen } from './components/screens/SplashScreen';
import { NewOnboardingScreen } from './components/screens/NewOnboardingScreen';
import { ApiKeySetupScreen } from './components/screens/ApiKeySetupScreen';
import { AdminLoginScreen } from './components/admin/AdminLoginScreen';
import { AdminControlPanel } from './components/admin/AdminControlPanel';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { CoreCustomizationStudio } from './components/studio/CoreCustomizationStudio';
import { SlidesScreen } from './components/screens/SlidesScreen';
import { WorkScreen } from './components/screens/WorkScreen';

export default function App() {
  // State Initialization
  const [settings, setSettings] = useState<AppSettings>(() => Storage.loadSettings());
  const [character, setCharacter] = useState<CompanionCharacter>(() => settings.selectedCompanion || 'alya');
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAutoFeaturesModal, setShowAutoFeaturesModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(true);
  const [userApiKey, setUserApiKey] = useState<string>(() => Storage.loadApiKey());
  const [showStudioModal, setShowStudioModal] = useState(false);

  // Auto Features State (Auto Mic, Auto Listen, Auto Reply, Auto TTS, Auto Retry, Smart Interruption, Conversation Continuation)
  const [autoFeatures, setAutoFeatures] = useState<AutoFeaturesSettings>(() => {
    return settings.autoFeatures || Storage.loadAutoFeatures() || DEFAULT_AUTO_FEATURES;
  });

  const [coreCustomization, setCoreCustomization] = useState<CoreCustomization>(() => {
    return settings.coreCustomization || INITIAL_SETTINGS.coreCustomization!;
  });

  // User Profile & Sessions
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = Storage.loadUserProfile();
    if (saved) return saved;
    const defaultProfile: UserProfile = {
      id: 'usr_default_gamingfire',
      displayName: settings.userName || 'Gamingfire',
      username: 'gamingfire',
      avatarUrl: 'alya_pink',
      bannerUrl: 'cyber_neon',
      companionPreference: character,
      hasCompletedProfile: true,
      hasCompletedOnboarding: true,
      hasCompletedKeySetup: false,
      createdAt: new Date().toISOString(),
      communicationStyle: {
        dominantLanguage: 'english',
        hinglishAffinity: 0.4,
        hindiAffinity: 0.1,
        englishAffinity: 0.5,
        formality: 'casual',
        preferredPacing: 'natural',
        lastUpdated: new Date().toISOString(),
      },
    };
    Storage.saveUserProfile(defaultProfile);
    return defaultProfile;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return Storage.loadAuthSession()?.token || null;
  });

  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Admin session
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('alya_admin_token_v1') || null;
  });
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('alya_admin_email_v1') || 'admin@alya.ai';
  });

  // Companion Expression & Audio States
  const [expression, setExpression] = useState<ExpressionType>('normal');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState('');
  const [alyaVoiceReply, setAlyaVoiceReply] = useState('');

  // Floating Overlays & Screen/Command States
  const [floatingMiniVisible, setFloatingMiniVisible] = useState<boolean>(
    () => Boolean(settings.floatingMiniEnabled)
  );
  const [isMuted, setIsMuted] = useState(false);
  const [activeScreenCapture, setActiveScreenCapture] = useState<string | null>(null);
  const [lastSearchContext, setLastSearchContext] = useState<{
    query: string;
    overview: string;
    sources: SearchSourceItem[];
  } | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarification | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      CompanionTTS.setMuted(next);
      return next;
    });
  }, []);

  // Data
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    Storage.loadMessages(character, currentUser?.displayName || settings.userName || 'Gamingfire')
  );
  const [memories, setMemories] = useState<MemoryItem[]>(() => Storage.loadMemories());
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>(() => {
    const custom = Storage.loadCustomBackgrounds();
    return [...BACKGROUNDS, ...custom];
  });
  const [activeBackground, setActiveBackground] = useState<BackgroundItem>(() => Storage.loadBackground());

  // Speech Recognition & Control Refs
  const [isAutoVoiceActive, setIsAutoVoiceActive] = useState(false);
  const isAutoVoiceActiveRef = useRef(false);
  const isHoldToTalkRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const activeTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const autoFeaturesRef = useRef(autoFeatures);
  const restartTimerRef = useRef<any>(null);
  const isProcessingVoiceRef = useRef(false);
  const expressionRef = useRef(expression);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const activeTurnIdRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => {
    isAutoVoiceActiveRef.current = isAutoVoiceActive;
  }, [isAutoVoiceActive]);

  useEffect(() => {
    expressionRef.current = expression;
  }, [expression]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    autoFeaturesRef.current = autoFeatures;
  }, [autoFeatures]);

  // Calibrate time engine and check backend status on load
  useEffect(() => {
    TimeEngine.calibrateWithServer();

    apiFetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasGeminiKey === 'boolean') {
          setHasServerKey(data.hasGeminiKey);
        }
      })
      .catch(() => {});
  }, []);

  // Sync TTS speaking listener
  useEffect(() => {
    CompanionTTS.setSpeakingListener((speaking) => {
      setIsSpeaking(speaking);
      isSpeakingRef.current = speaking;
      if (!speaking && (expressionRef.current === ('talking' as any) || expressionRef.current === 'thinking')) {
        setExpression('normal');
      }
    });
    return () => {
      if (chatAbortControllerRef.current) {
        try {
          chatAbortControllerRef.current.abort();
        } catch (_) {}
      }
      CompanionTTS.stop();
    };
  }, []);

  // Handle ambient sound on background change or settings
  useEffect(() => {
    if (settings.ambientMusic) {
      const sound = activeBackground.ambientSound || 'rain';
      if (sound !== 'none') {
        ambientEngine.start(sound as any, settings.ambientVolume || 0.3);
      } else {
        ambientEngine.stop();
      }
    } else {
      ambientEngine.stop();
    }
  }, [settings.ambientMusic, settings.ambientVolume, activeBackground]);

  // Get active voice style based on companion & settings
  const getActiveVoiceStyle = useCallback((): VoiceStyle => {
    if (character === 'jarvis') {
      const styleId = settings.jarvisVoice || 'jarvis_deep';
      return VOICE_STYLES.find((v) => v.id === styleId) || VOICE_STYLES[0];
    }
    const styleId = settings.alyaVoiceId || settings.selectedVoiceId || 'alya_natural';
    return VOICE_STYLES.find((v) => v.id === styleId) || VOICE_STYLES[4];
  }, [character, settings]);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    isListeningRef.current = false;
    setRecognitionState('idle');
  }, []);

  // Abort any in-flight AI generation or TTS playback cleanly
  const cancelActiveGenerationAndSpeech = useCallback(() => {
    activeTurnIdRef.current++;
    if (chatAbortControllerRef.current) {
      try {
        chatAbortControllerRef.current.abort();
      } catch (_) {}
      chatAbortControllerRef.current = null;
    }
    CompanionTTS.stop();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setIsThinking(false);
    setIsStreaming(false);
    isProcessingVoiceRef.current = false;
  }, []);

  // Companion Switching
  const handleSwitchCompanion = (newChar: CompanionCharacter) => {
    if (newChar === character) return;
    if (settings.soundEffects) playChime('switch');
    cancelActiveGenerationAndSpeech();
    stopListening();
    setCharacter(newChar);
    setSettings((prev) => {
      const updated = { ...prev, selectedCompanion: newChar };
      Storage.saveSettings(updated);
      return updated;
    });
    const newMsgs = Storage.loadMessages(newChar, currentUser?.displayName || settings.userName);
    setMessages(newMsgs);
    setExpression('normal');
  };

  // Expression auto reset after timer
  useEffect(() => {
    if (expression !== 'normal' && expression !== 'thinking') {
      const timer = setTimeout(() => {
        setExpression('normal');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [expression]);

  // START LISTENING HELPER with dynamic language recognition and natural silence detection
  // Strictly enforces: Listening -> Recognition -> Processing -> AI Response -> TTS -> Playback Completed -> Listening
  const startListening = useCallback((isHoldMode = false, isUserInitiated = false) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // If this is an automatic background restart, never activate the mic while Alya is processing or speaking
    if (!isUserInitiated && !isHoldMode) {
      if (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current) {
        return;
      }
    }

    // Smart interruption when explicitly initiated by user
    if (isUserInitiated && (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current)) {
      cancelActiveGenerationAndSpeech();
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionState('error');
      setMicErrorMessage('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    try {
      CompanionTTS.unlockAudio();
      setRecognitionState('starting');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Adapt STT language dynamically for Hinglish / Indian English / Hindi / US English
      const userLangPref = settings.preferredLanguage || 'auto';
      const dominantStyle = currentUser?.communicationStyle?.dominantLanguage || 'english';
      const userTz = TimeEngine.getTimezone();
      const isIndiaRegion = userTz.includes('Kolkata') || userTz.includes('Calcutta') || userTz.includes('Asia/Colombo');

      if (userLangPref === 'hindi' || dominantStyle === 'hindi') {
        recognition.lang = 'hi-IN';
      } else if (userLangPref === 'hinglish' || dominantStyle === 'hinglish' || isIndiaRegion) {
        // 'en-IN' recognizes Indian English and Romanized Hindi loanwords accurately in Chrome/Edge
        recognition.lang = 'en-IN';
      } else {
        recognition.lang = 'en-US';
      }

      recognition.onstart = () => {
        // Guard against race if TTS started while recognition was initializing
        if (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current) {
          try {
            recognition.abort();
          } catch (_) {}
          setIsListening(false);
          isListeningRef.current = false;
          setRecognitionState('idle');
          return;
        }
        setIsListening(true);
        isListeningRef.current = true;
        setRecognitionState('listening');
        setMicErrorMessage(null);
        setLastVoiceTranscript('');
        activeTranscriptRef.current = '';
        if (settings.soundEffects) playChime('listen_start');
      };

      recognition.onsoundstart = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onspeechstart = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };

      recognition.onresult = (event: any) => {
        // Prevent feedback loop: ignore recognition results if Alya is currently speaking or processing
        if (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current) {
          return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          setLastVoiceTranscript(currentText);
          activeTranscriptRef.current = currentText;

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }

          // Responsive silence detection: 1.8s when a final segment is complete, 2.5s for interim pause
          if (!isHoldToTalkRef.current && !isProcessingVoiceRef.current && autoFeaturesRef.current.autoReply !== false) {
            const pauseDelayMs = finalTranscript.trim().length > 0 ? 1800 : 2500;
            silenceTimerRef.current = setTimeout(() => {
              const toSend = activeTranscriptRef.current.trim();
              if (toSend && !isProcessingVoiceRef.current) {
                isProcessingVoiceRef.current = true;
                stopListening();
                handleSendMessage(toSend);
              }
            }, pauseDelayMs);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
          isListeningRef.current = false;
          setIsAutoVoiceActive(false);
          isAutoVoiceActiveRef.current = false;
          setRecognitionState('error');
          setMicErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          if (
            isAutoVoiceActiveRef.current &&
            autoFeaturesRef.current.autoListen !== false &&
            !isSpeakingRef.current &&
            !CompanionTTS.isSpeaking() &&
            !isProcessingVoiceRef.current
          ) {
            restartTimerRef.current = setTimeout(() => {
              if (
                isAutoVoiceActiveRef.current &&
                !isSpeakingRef.current &&
                !CompanionTTS.isSpeaking() &&
                !isProcessingVoiceRef.current
              ) {
                startListening(false, false);
              }
            }, 350);
          }
        } else if (event.error === 'aborted') {
          // Normal when stopped programmatically
        } else {
          setRecognitionState('error');
          setMicErrorMessage(`Mic: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (
          activeTranscriptRef.current.trim() &&
          !isProcessingVoiceRef.current &&
          !isSpeakingRef.current &&
          autoFeaturesRef.current.autoReply !== false
        ) {
          isProcessingVoiceRef.current = true;
          const toSend = activeTranscriptRef.current.trim();
          activeTranscriptRef.current = '';
          setIsListening(false);
          isListeningRef.current = false;
          setRecognitionState('idle');
          handleSendMessage(toSend);
          return;
        }

        if (
          isAutoVoiceActiveRef.current &&
          autoFeaturesRef.current.autoListen !== false &&
          isListeningRef.current &&
          !isSpeakingRef.current &&
          !CompanionTTS.isSpeaking() &&
          !isProcessingVoiceRef.current
        ) {
          restartTimerRef.current = setTimeout(() => {
            if (
              isAutoVoiceActiveRef.current &&
              !isSpeakingRef.current &&
              !CompanionTTS.isSpeaking() &&
              !isProcessingVoiceRef.current
            ) {
              startListening(false, false);
            }
          }, 350);
        } else if (!isProcessingVoiceRef.current) {
          setIsListening(false);
          isListeningRef.current = false;
          setRecognitionState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      isListeningRef.current = false;
      setRecognitionState('error');
      setMicErrorMessage(e?.message || 'Could not start voice recognition.');
    }
  }, [settings.soundEffects, settings.preferredLanguage, currentUser, stopListening, cancelActiveGenerationAndSpeech]);

  // Helper to safely resume Auto Voice listening after playback finishes (with echo guard delay)
  const scheduleResumeAutoListening = useCallback(
    (turnId: number, delayMs = 420) => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (
        !isAutoVoiceActiveRef.current ||
        autoFeaturesRef.current.autoListen === false ||
        autoFeaturesRef.current.conversationContinuation === false
      ) {
        return;
      }
      restartTimerRef.current = setTimeout(() => {
        if (
          activeTurnIdRef.current === turnId &&
          isAutoVoiceActiveRef.current &&
          autoFeaturesRef.current.autoListen !== false &&
          !isSpeakingRef.current &&
          !CompanionTTS.isSpeaking() &&
          !isProcessingVoiceRef.current
        ) {
          startListening(false, false);
        }
      }, delayMs);
    },
    [startListening]
  );

  // Handle app backgrounding, background companion service, and returning to conversation
  useEffect(() => {
    backgroundCompanionService.setActionHandlers({
      onResumeListening: () => {
        setIsAutoVoiceActive(true);
        isAutoVoiceActiveRef.current = true;
        startListening(false, true);
      },
      onPauseCompanion: () => {
        cancelActiveGenerationAndSpeech();
        stopListening();
      },
      onStopCompanion: () => {
        setIsAutoVoiceActive(false);
        isAutoVoiceActiveRef.current = false;
        cancelActiveGenerationAndSpeech();
        stopListening();
      },
    });
  }, [startListening, stopListening, cancelActiveGenerationAndSpeech]);

  useEffect(() => {
    const companionLabel = character === 'jarvis' ? 'Jarvis' : 'Alya';
    if (isSpeaking) {
      backgroundCompanionService.updateLiveActivityState(companionLabel, 'Speaking');
    } else if (isThinking) {
      backgroundCompanionService.updateLiveActivityState(companionLabel, 'Thinking');
    } else if (isListening) {
      backgroundCompanionService.updateLiveActivityState(companionLabel, 'Listening');
    } else {
      backgroundCompanionService.updateLiveActivityState(companionLabel, 'Ready');
    }
  }, [character, isSpeaking, isThinking, isListening]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (settings.backgroundServiceMode) {
          setFloatingMiniVisible(true);
          backgroundCompanionService.startService(character === 'jarvis' ? 'Jarvis' : 'Alya');
        } else {
          stopListening();
        }
      } else {
        CompanionTTS.unlockAudio();
        if (
          isAutoVoiceActiveRef.current &&
          autoFeaturesRef.current.autoListen !== false &&
          !isListeningRef.current &&
          !isSpeakingRef.current &&
          !CompanionTTS.isSpeaking() &&
          !isProcessingVoiceRef.current
        ) {
          scheduleResumeAutoListening(activeTurnIdRef.current, 350);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [character, settings.backgroundServiceMode, stopListening, scheduleResumeAutoListening]);

  // TOGGLE VOICE: Center Microphone = Auto Voice Mode (Hands-free Continuous Loop)
  const handleToggleVoice = useCallback(() => {
    CompanionTTS.unlockAudio();

    // 1. If currently speaking or processing: Smart Interruption -> stop AI and start listening
    if (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current) {
      cancelActiveGenerationAndSpeech();
      setIsAutoVoiceActive(true);
      isAutoVoiceActiveRef.current = true;
      startListening(false, true);
      return;
    }

    // 2. If Auto Voice is active or listening: Turn it OFF
    if (isAutoVoiceActiveRef.current || isListeningRef.current) {
      setIsAutoVoiceActive(false);
      isAutoVoiceActiveRef.current = false;
      if (settings.soundEffects) playChime('listen_stop');
      stopListening();
      return;
    }

    // 3. Otherwise: Turn ON Auto Voice mode
    setIsAutoVoiceActive(true);
    isAutoVoiceActiveRef.current = true;
    startListening(false, true);
  }, [settings.soundEffects, startListening, stopListening, cancelActiveGenerationAndSpeech]);

  // HOLD-TO-TALK CONTROLS (Separate from Auto Voice Mode)
  const handleHoldToTalkStart = useCallback(() => {
    if (isHoldToTalkRef.current && isListeningRef.current) return;
    CompanionTTS.unlockAudio();
    if (isSpeakingRef.current || CompanionTTS.isSpeaking() || isProcessingVoiceRef.current) {
      cancelActiveGenerationAndSpeech();
    }
    isHoldToTalkRef.current = true;
    activeTranscriptRef.current = '';
    setLastVoiceTranscript('');
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    startListening(true, true);
  }, [startListening, cancelActiveGenerationAndSpeech]);

  const handleHoldToTalkEnd = useCallback(() => {
    if (!isHoldToTalkRef.current && !isListeningRef.current) return;
    isHoldToTalkRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const toSend = activeTranscriptRef.current.trim();
    activeTranscriptRef.current = '';
    stopListening();
    if (toSend && !isProcessingVoiceRef.current) {
      isProcessingVoiceRef.current = true;
      handleSendMessage(toSend);
    }
  }, [stopListening]);

  // CANCEL VOICE HELPER
  const handleCancelVoice = useCallback(() => {
    setIsAutoVoiceActive(false);
    isAutoVoiceActiveRef.current = false;
    isHoldToTalkRef.current = false;
    activeTranscriptRef.current = '';
    setLastVoiceTranscript('');
    cancelActiveGenerationAndSpeech();
    stopListening();
  }, [stopListening, cancelActiveGenerationAndSpeech]);

  // SEND MESSAGE (With Strict Voice Lifecycle: Stop Mic -> Process -> AI Response -> TTS Playback -> Resume Mic)
  const handleSendMessage = async (text: string, imageAttachment?: string, retryCount = 0) => {
    const cleanInput = (text || '').trim();
    if (!cleanInput && !imageAttachment) return;

    CompanionTTS.unlockAudio();

    // Cancel any previous in-flight turn or speech and guarantee mic is OFF while processing/speaking
    if (retryCount === 0) {
      cancelActiveGenerationAndSpeech();
      stopListening();
    }

    const turnId = activeTurnIdRef.current;
    const turnAbortController = new AbortController();
    chatAbortControllerRef.current = turnAbortController;
    isProcessingVoiceRef.current = true;

    VoiceLatencyTracker.start();

    if (retryCount === 0 && settings.soundEffects) {
      playChime('send');
    }

    // 1. Centralized dynamic live timestamp
    const liveTimestamp = TimeEngine.formatChatTimestamp();

    // 2. Language Detection & Style Adaptation before generating response
    const detection = LanguageEngine.detectLanguage(cleanInput);
    if (retryCount === 0) {
      const updatedStyle = LanguageEngine.updateStyleProfile(currentUser?.communicationStyle, cleanInput);
      Storage.saveCommunicationStyle(updatedStyle);
      if (currentUser) {
        const updatedUser = { ...currentUser, communicationStyle: updatedStyle };
        setCurrentUser(updatedUser);
        Storage.saveUserProfile(updatedUser);
      }

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: cleanInput,
        timestamp: liveTimestamp,
        imageAttachment,
        language: detection.mode,
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        Storage.saveMessages(character, next);
        return next;
      });
    }

    // Show Thinking / Processing State
    setIsThinking(true);
    setExpression('thinking');
    setLastVoiceTranscript('');
    activeTranscriptRef.current = '';

    VoiceLatencyTracker.record('aiRequestStart');

    try {
      // 3. Lightweight relevant memory retrieval for low context overhead
      const memoryTexts = Storage.getLightweightRelevantMemories(cleanInput, memories);
      const timeContext = TimeEngine.getFullContext();

      // Determine language mode to instruct AI
      const effectiveLanguageMode =
        settings.preferredLanguage && settings.preferredLanguage !== 'auto'
          ? settings.preferredLanguage
          : detection.mode;

      const shouldSpeak =
        settings.autoSpeakResponse !== false &&
        autoFeaturesRef.current.autoTTS !== false &&
        !isMuted;
      const voiceStyle = getActiveVoiceStyle();

      // Helper to deliver a direct companion response and speak it with full lifecycle management
      const deliverCompanionReply = (replyText: string, replyEmotion: ExpressionType) => {
        setIsThinking(false);
        setIsStreaming(false);
        setExpression(replyEmotion);
        const replyLang = LanguageEngine.detectLanguage(replyText).mode;

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: character,
          text: replyText,
          timestamp: TimeEngine.formatChatTimestamp(),
          emotion: replyEmotion,
          language: replyLang,
        };

        setMessages((prev) => {
          const next = [...prev, botMsg];
          Storage.saveMessages(character, next);
          return next;
        });

        if (settings.soundEffects) playChime('receive');
        setAlyaVoiceReply(replyText);

        if (shouldSpeak) {
          CompanionTTS.speak(replyText, voiceStyle, {
            volume: settings.voiceVolume ?? 1.0,
            speed: settings.voiceSpeed ?? 1.0,
            pitch: settings.voicePitch ?? 1.0,
            languageMode: replyLang,
            emotion: replyEmotion,
            onStart: () => {
              if (activeTurnIdRef.current !== turnId) return;
              stopListening();
              setIsSpeaking(true);
              isSpeakingRef.current = true;
            },
            onEnd: () => {
              if (activeTurnIdRef.current !== turnId) return;
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              isProcessingVoiceRef.current = false;
              scheduleResumeAutoListening(turnId, 420);
            },
            onError: () => {
              if (activeTurnIdRef.current !== turnId) return;
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              isProcessingVoiceRef.current = false;
              scheduleResumeAutoListening(turnId, 450);
            },
          });
        } else {
          isProcessingVoiceRef.current = false;
          scheduleResumeAutoListening(turnId, 380);
        }
      };

      // =========================================================================
      // 3A. FAST LOCAL VOICE COMMAND ROUTER (App Launch, Search, Screen, Safety)
      // =========================================================================
      if (retryCount === 0 && !imageAttachment) {
        const routed = VoiceCommandRouter.evaluateCommand(cleanInput, {
          character,
          userName: currentUser?.displayName || settings.userName || 'Friend',
          pendingClarification,
          pendingConfirmation,
          onInternalNavigate: (scr) => setCurrentScreen(scr),
        });

        if (routed.handled) {
          if (routed.pendingClarification !== undefined) {
            setPendingClarification(routed.pendingClarification);
          }
          if (routed.pendingConfirmation !== undefined) {
            setPendingConfirmation(routed.pendingConfirmation);
          }
          if (routed.floatingVisible !== undefined) {
            setFloatingMiniVisible(routed.floatingVisible);
            handleUpdateSettings({ floatingMiniEnabled: routed.floatingVisible });
          }
          if (routed.backgroundServiceCommand) {
            const companionLabel = character === 'jarvis' ? 'Jarvis' : 'Alya';
            if (routed.backgroundServiceCommand === 'start') {
              await backgroundCompanionService.startService(companionLabel);
              setFloatingMiniVisible(true);
              handleUpdateSettings({ backgroundServiceMode: true, floatingMiniEnabled: true });
            } else if (routed.backgroundServiceCommand === 'pause') {
              await backgroundCompanionService.pauseService(companionLabel);
            } else {
              await backgroundCompanionService.stopService();
              handleUpdateSettings({ backgroundServiceMode: false });
            }
          }
          if (routed.type === 'app_launched') {
            // Keep Floating Alya accessible when launching an external Android app
            setFloatingMiniVisible(true);
          }

          // Handle Google Search + Live Grounding ("Google kholo aur Minecraft shaders search karo")
          if (routed.type === 'google_search_and_ground' && routed.searchQuery) {
            setFloatingMiniVisible(true);
            try {
              const searchRes = await apiFetch('/api/work/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: turnAbortController.signal,
                body: JSON.stringify({
                  query: routed.searchQuery,
                  companion: character,
                  userApiKey: userApiKey || undefined,
                }),
              });
              const searchData = await searchRes.json();
              const sources: SearchSourceItem[] = Array.isArray(searchData.sources) ? searchData.sources : [];
              setLastSearchContext({
                query: routed.searchQuery,
                overview: searchData.overview || '',
                sources,
              });
              const isHinglishOrHindi =
                effectiveLanguageMode === 'hinglish' || effectiveLanguageMode === 'hindi';
              const topTitles = sources
                .slice(0, 3)
                .map((s, idx) => `${idx + 1}. ${s.title}`)
                .join(', ');
              const groundedReply = isHinglishOrHindi
                ? `Maine Google open karke "${routed.searchQuery}" search kar diya hai! Screen par top visible results hain: ${topTitles}. Aap puch sakte ho ki pehli website kis baare mein hai!`
                : `I opened Google and searched for "${routed.searchQuery}"! The top visible results on screen are: ${topTitles}. You can ask me what the first website is about!`;
              deliverCompanionReply(groundedReply, 'happy');
              return;
            } catch {
              const fallbackSearchReply =
                effectiveLanguageMode === 'hinglish' || effectiveLanguageMode === 'hindi'
                  ? `Google open karke "${routed.searchQuery}" search kar diya hai!`
                  : `Opened Google and searched for "${routed.searchQuery}"!`;
              deliverCompanionReply(fallbackSearchReply, 'happy');
              return;
            }
          }

          // Handle Screen Awareness & Visible Website Questions
          if (
            routed.type === 'screen_inspect' ||
            routed.type === 'screen_websites_list' ||
            routed.type === 'screen_website_detail' ||
            routed.type === 'screen_page_summary'
          ) {
            const isHinglishOrHindi =
              effectiveLanguageMode === 'hinglish' || effectiveLanguageMode === 'hindi';

            // If user asks about N-th website and we have visible search results in context (and no overriding screenshot)
            if (
              routed.type === 'screen_website_detail' &&
              typeof routed.websiteIndex === 'number' &&
              lastSearchContext &&
              lastSearchContext.sources.length > 0 &&
              !activeScreenCapture
            ) {
              const targetSite = lastSearchContext.sources[routed.websiteIndex];
              if (targetSite) {
                const posWord =
                  routed.websiteIndex === 0 ? 'Pehli' : routed.websiteIndex === 1 ? 'Doosri' : 'Teesri';
                const siteReply = isHinglishOrHindi
                  ? `${posWord} website "${targetSite.title}" (${targetSite.url}) hai. Ye "${lastSearchContext.query}" ke baare mein hai: ${targetSite.snippet}.`
                  : `Website #${routed.websiteIndex + 1} is "${targetSite.title}" (${targetSite.url}). It covers "${lastSearchContext.query}": ${targetSite.snippet}.`;
                deliverCompanionReply(siteReply, 'curious');
                return;
              }
            }

            if (
              routed.type === 'screen_websites_list' &&
              lastSearchContext &&
              lastSearchContext.sources.length > 0 &&
              !activeScreenCapture
            ) {
              const listStr = lastSearchContext.sources
                .slice(0, 4)
                .map((s, idx) => `${idx + 1}. ${s.title}`)
                .join(', ');
              const listReply = isHinglishOrHindi
                ? `Abhi search results mein ye websites visible hain: ${listStr}. Kisi specific website ke baare mein detail chahiye toh batao!`
                : `Here are the visible websites from your search: ${listStr}. Let me know if you want details on any of them!`;
              deliverCompanionReply(listReply, 'curious');
              return;
            }

            if (!activeScreenCapture && !lastSearchContext) {
              setCurrentScreen('screen_tools');
              const promptConsentReply = isHinglishOrHindi
                ? 'Apni screen dikhane ke liye maine Screen Awareness tool open kar diya hai! Bas "Capture Screen" par tap karke permission allow kar do, phir main screen par visible har text, YouTube video ya website padh kar bata dungi.'
                : 'I have opened the Screen Awareness tool for you! Just tap "Capture Screen" to grant permission, and I will inspect and explain the visible text, YouTube videos, or websites on your screen.';
              deliverCompanionReply(promptConsentReply, 'curious');
              return;
            }

            // Call Gemini Vision (/api/screen-understand) with the active screen capture & search context
            const screenRes = await handleAnalyzeScreen(activeScreenCapture || '', cleanInput);
            deliverCompanionReply(screenRes.analysis, screenRes.emotion);
            return;
          }

          if (routed.reply) {
            deliverCompanionReply(routed.reply, routed.emotion);
            return;
          }
        }
      }

      // Try fast streaming response first for sub-second perceived voice latency
      try {
        const streamRes = await apiFetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: turnAbortController.signal,
          body: JSON.stringify({
            message: cleanInput,
            imageAttachment: imageAttachment || undefined,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text.length > 300 ? m.text.slice(0, 300) + '...' : m.text,
              isError: m.isError,
            })),
            character,
            userName: currentUser?.displayName || settings.userName || 'Friend',
            memories: memoryTexts,
            userApiKey: userApiKey || undefined,
            timeContext,
            languageMode: effectiveLanguageMode,
          }),
        });

        if (activeTurnIdRef.current !== turnId) return;

        const streamContentType = (streamRes.headers.get('content-type') || '').toLowerCase();
        if (streamRes.ok && streamRes.body && streamContentType.includes('text/event-stream')) {
          setIsThinking(false);
          setIsStreaming(true);
          VoiceLatencyTracker.record('aiFirstChunk');

          const streamSpeaker = shouldSpeak
            ? CompanionTTS.createStreamSpeaker(voiceStyle, {
                volume: settings.voiceVolume ?? 1.0,
                speed: settings.voiceSpeed ?? 1.0,
                pitch: settings.voicePitch ?? 1.0,
                languageMode: effectiveLanguageMode as any,
                emotion: 'normal',
                onStart: () => {
                  if (activeTurnIdRef.current !== turnId) return;
                  stopListening();
                  setIsSpeaking(true);
                  isSpeakingRef.current = true;
                },
                onEnd: () => {
                  if (activeTurnIdRef.current !== turnId) return;
                  setIsSpeaking(false);
                  isSpeakingRef.current = false;
                  isProcessingVoiceRef.current = false;
                  scheduleResumeAutoListening(turnId, 420);
                },
                onError: () => {
                  if (activeTurnIdRef.current !== turnId) return;
                  setIsSpeaking(false);
                  isSpeakingRef.current = false;
                  isProcessingVoiceRef.current = false;
                  scheduleResumeAutoListening(turnId, 450);
                },
              })
            : null;

          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let botText = '';
          let botEmotion: ExpressionType = 'normal';
          let streamBuffer = '';
          let streamServerError: { message: string; errorType?: string; retryable?: boolean } | null = null;
          const botMsgId = `bot-${Date.now()}`;

          // Create placeholder message in state
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              role: character,
              text: '',
              timestamp: TimeEngine.formatChatTimestamp(),
              emotion: 'normal',
              isStreaming: true,
            },
          ]);

          while (true) {
            const { value, done } = await reader.read();
            if (done || activeTurnIdRef.current !== turnId) break;

            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error && !botText.trim()) {
                  streamServerError = {
                    message: data.error,
                    errorType: data.errorType,
                    retryable: data.retryable,
                  };
                  break;
                }
                if (data.emotion) {
                  botEmotion = data.emotion;
                  setExpression(data.emotion);
                  if (streamSpeaker) {
                    streamSpeaker.setEmotion(data.emotion);
                  }
                }
                if (data.chunk) {
                  botText += data.chunk;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId ? { ...m, text: botText, emotion: botEmotion, isStreaming: true } : m
                    )
                  );
                  setAlyaVoiceReply(botText);
                  if (streamSpeaker) {
                    streamSpeaker.feedChunk(data.chunk);
                  }
                }
              } catch (_) {}
            }

            if (streamServerError) {
              break;
            }
          }

          if (activeTurnIdRef.current !== turnId) {
            try {
              await reader.cancel();
            } catch (_) {}
            return;
          }

          setIsStreaming(false);

          if (streamServerError && !botText.trim()) {
            setMessages((prev) => prev.filter((m) => m.id !== botMsgId));
            try {
              await reader.cancel();
            } catch (_) {}
            const sseErr: any = new Error(streamServerError.message);
            sseErr.errorType = streamServerError.errorType;
            sseErr.retryable = streamServerError.retryable;
            sseErr.isFromServer = true;
            throw sseErr;
          }

          if (!botText.trim()) {
            setMessages((prev) => prev.filter((m) => m.id !== botMsgId));
            throw new Error('Streaming response ended without content.');
          }

          VoiceLatencyTracker.record('aiResponseComplete');

          const finalReply = botText.trim();
          setMessages((prev) => {
            const next = prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    text: finalReply,
                    emotion: botEmotion,
                    isStreaming: false,
                    language: LanguageEngine.detectLanguage(finalReply).mode,
                  }
                : m
            );
            Storage.saveMessages(character, next);
            return next;
          });

          if (settings.soundEffects) playChime('receive');
          setAlyaVoiceReply(finalReply);

          if (streamSpeaker) {
            streamSpeaker.finish();
          } else {
            isProcessingVoiceRef.current = false;
            scheduleResumeAutoListening(turnId, 350);
          }

          return;
        }
      } catch (streamErr: any) {
        if (turnAbortController.signal.aborted || activeTurnIdRef.current !== turnId) {
          return;
        }
        if (streamErr?.retryable === false) {
          throw streamErr;
        }
        console.warn('[Chat Diagnostic] Streaming fallback to /api/chat active:', streamErr?.message || streamErr);
      }

      if (activeTurnIdRef.current !== turnId) return;

      // Non-streaming fallback
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: turnAbortController.signal,
        body: JSON.stringify({
          message: cleanInput,
          imageAttachment: imageAttachment || undefined,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            text: m.text.length > 300 ? m.text.slice(0, 300) + '...' : m.text,
            isError: m.isError,
          })),
          character,
          userName: currentUser?.displayName || settings.userName || 'Friend',
          memories: memoryTexts,
          userApiKey: userApiKey || undefined,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timeContext,
          languageMode: effectiveLanguageMode,
        }),
      });

      if (activeTurnIdRef.current !== turnId) return;

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        const nonJsonErr: any = new Error(
          `Backend server returned an unexpected non-JSON response (HTTP ${res.status}). Verify your Active API Server URL in Settings.`,
        );
        nonJsonErr.errorType = 'invalid_response';
        nonJsonErr.retryable = res.status >= 500;
        throw nonJsonErr;
      }

      const data = await res.json();
      setIsThinking(false);
      VoiceLatencyTracker.record('aiResponseComplete');

      // Handle server error when no valid reply is returned
      if ((!res.ok || data.error) && !data.reply) {
        const apiErr: any = new Error(data.error || `AI request failed with HTTP ${res.status}.`);
        apiErr.errorType = data.errorType || 'api_error';
        apiErr.retryable = data.retryable !== undefined ? Boolean(data.retryable) : res.status >= 500 || res.status === 429;
        apiErr.isFromServer = true;
        throw apiErr;
      }

      const botReply = data.reply || (character === 'jarvis' ? 'Understood.' : 'I see!');
      const botEmotion: ExpressionType = (data.emotion as ExpressionType) || 'normal';
      setExpression(botEmotion);

      const botLanguage = LanguageEngine.detectLanguage(botReply).mode;

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: character,
        text: botReply,
        timestamp: TimeEngine.formatChatTimestamp(),
        emotion: botEmotion,
        isHighDemand: data.isHighDemand,
        language: botLanguage,
      };

      setMessages((prev) => {
        const next = [...prev, botMsg];
        Storage.saveMessages(character, next);
        return next;
      });

      if (settings.soundEffects) playChime('receive');
      setAlyaVoiceReply(botReply);

      // AUTO-SPEAK RESPONSE: Alya speaks through optimized low-latency TTS
      if (shouldSpeak) {
        const activeVoice = getActiveVoiceStyle();

        CompanionTTS.speak(botReply, activeVoice, {
          volume: settings.voiceVolume ?? 1.0,
          speed: settings.voiceSpeed ?? 1.0,
          pitch: settings.voicePitch ?? 1.0,
          languageMode: botLanguage,
          emotion: botEmotion,
          onStart: () => {
            if (activeTurnIdRef.current !== turnId) return;
            stopListening();
            setIsSpeaking(true);
            isSpeakingRef.current = true;
          },
          onEnd: () => {
            if (activeTurnIdRef.current !== turnId) return;
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            isProcessingVoiceRef.current = false;
            scheduleResumeAutoListening(turnId, 420);
          },
          onError: () => {
            if (activeTurnIdRef.current !== turnId) return;
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            isProcessingVoiceRef.current = false;
            scheduleResumeAutoListening(turnId, 450);
          },
        });
      } else {
        isProcessingVoiceRef.current = false;
        scheduleResumeAutoListening(turnId, 380);
      }
    } catch (err: any) {
      if (turnAbortController.signal.aborted || activeTurnIdRef.current !== turnId) {
        return;
      }
      setIsThinking(false);
      setIsStreaming(false);

      const isRetryable = err?.retryable !== false;
      console.warn('[Chat Diagnostic] AI request failed:', {
        errorType: err?.errorType || 'network_or_runtime',
        retryable: isRetryable,
        retryCount,
        message: err?.message || String(err),
      });

      if (isRetryable && autoFeaturesRef.current.autoRetry && retryCount < 2) {
        setTimeout(() => {
          if (activeTurnIdRef.current === turnId) {
            handleSendMessage(cleanInput, imageAttachment, retryCount + 1);
          }
        }, 1200);
        return;
      }

      isProcessingVoiceRef.current = false;
      setExpression('concerned');

      const rawErrorText =
        typeof err?.message === 'string' && err.message.trim().length > 0
          ? err.message.trim()
          : 'Unable to reach the AI backend server. Please verify your internet connection or API configuration in Settings.';

      const displayErrorText =
        retryCount > 0
          ? `Automatic recovery failed after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}: ${rawErrorText}`
          : rawErrorText;

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: character,
        text: displayErrorText,
        timestamp: TimeEngine.formatChatTimestamp(),
        isError: true,
        emotion: 'concerned',
      };

      setMessages((prev) => {
        const next = [...prev, errorMsg];
        Storage.saveMessages(character, next);
        return next;
      });

      scheduleResumeAutoListening(turnId, 800);
    }
  };

  // Speak single message manually
  const handleSpeakMessage = (text: string) => {
    CompanionTTS.unlockAudio();
    stopListening();
    const voiceStyle = getActiveVoiceStyle();
    const detectedLang = LanguageEngine.detectLanguage(text).mode;

    CompanionTTS.speak(text, voiceStyle, {
      volume: settings.voiceVolume,
      speed: settings.voiceSpeed,
      pitch: settings.voicePitch,
      languageMode: detectedLang,
      emotion: expression,
      onStart: () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      },
      onEnd: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        scheduleResumeAutoListening(activeTurnIdRef.current, 420);
      },
      onError: () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        scheduleResumeAutoListening(activeTurnIdRef.current, 420);
      },
    });
  };

  // Stop speaking
  const handleStopSpeaking = () => {
    cancelActiveGenerationAndSpeech();
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    if (newSettings.selectedCompanion && newSettings.selectedCompanion !== character) {
      handleSwitchCompanion(newSettings.selectedCompanion);
    }
    if (typeof newSettings.floatingMiniEnabled === 'boolean') {
      setFloatingMiniVisible(newSettings.floatingMiniEnabled);
    }
    if (typeof newSettings.backgroundServiceMode === 'boolean') {
      const companionLabel = character === 'jarvis' ? 'Jarvis' : 'Alya';
      if (newSettings.backgroundServiceMode) {
        backgroundCompanionService.startService(companionLabel);
        setFloatingMiniVisible(true);
      } else {
        backgroundCompanionService.stopService();
      }
    }
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      Storage.saveSettings(updated);
      return updated;
    });
  };

  // Update Auto Features
  const handleUpdateAutoFeatures = (updated: Partial<AutoFeaturesSettings>) => {
    setAutoFeatures((prev) => {
      const merged = { ...prev, ...updated };
      autoFeaturesRef.current = merged;
      Storage.saveAutoFeatures(merged);
      handleUpdateSettings({ autoFeatures: merged });
      return merged;
    });
  };

  // Reset Settings
  const handleResetSettings = () => {
    setSettings(INITIAL_SETTINGS);
    setAutoFeatures(DEFAULT_AUTO_FEATURES);
    Storage.saveSettings(INITIAL_SETTINGS);
    Storage.saveAutoFeatures(DEFAULT_AUTO_FEATURES);
  };

  // Memory Handlers
  const handleAddMemory = (category: MemoryItem['category'], text: string) => {
    const clean = Storage.sanitizeMemoryText(text);
    if (!clean) return;

    const newMem: MemoryItem = {
      id: `mem-${Date.now()}`,
      category,
      text: clean,
      dateAdded: TimeEngine.formatHumanDate(),
      pinned: false,
    };
    const updated = [newMem, ...memories];
    setMemories(updated);
    Storage.saveMemories(updated);
  };

  const handleEditMemory = (id: string, text: string) => {
    const clean = Storage.sanitizeMemoryText(text);
    if (!clean) return;

    const updated = memories.map((m) => (m.id === id ? { ...m, text: clean } : m));
    setMemories(updated);
    Storage.saveMemories(updated);
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    Storage.saveMemories(updated);
  };

  const handleTogglePinMemory = (id: string) => {
    const updated = memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m));
    setMemories(updated);
    Storage.saveMemories(updated);
  };

  // Background Handlers
  const handleApplyBackground = (bg: BackgroundItem) => {
    setActiveBackground(bg);
    Storage.saveBackground(bg);
  };

  const handleAddCustomBackground = (bg: BackgroundItem) => {
    const custom = Storage.loadCustomBackgrounds();
    const updatedCustom = [bg, ...custom];
    Storage.saveCustomBackgrounds(updatedCustom);
    setBackgrounds([...BACKGROUNDS, ...updatedCustom]);
    setActiveBackground(bg);
    Storage.saveBackground(bg);
  };

  // Screen understanding analysis with Gemini Vision & Search Context
  const handleAnalyzeScreen = async (
    imageBase64: string,
    prompt: string
  ): Promise<{ analysis: string; emotion: ExpressionType }> => {
    try {
      const detectedLang = LanguageEngine.detectLanguage(prompt).mode;
      const res = await apiFetch('/api/screen-understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64 || activeScreenCapture || undefined,
          prompt,
          languageMode:
            settings.preferredLanguage && settings.preferredLanguage !== 'auto'
              ? settings.preferredLanguage
              : detectedLang,
          character,
          searchContext: lastSearchContext || undefined,
          userApiKey: userApiKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.analysis) {
        return {
          analysis: data.error || 'Failed to inspect screen.',
          emotion: 'concerned',
        };
      }
      return {
        analysis: data.analysis || 'Screen analyzed successfully.',
        emotion: (data.emotion as ExpressionType) || 'curious',
      };
    } catch {
      return {
        analysis: 'Failed to connect to screen analysis service.',
        emotion: 'concerned',
      };
    }
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    Storage.saveUserProfile(updated);
    setShowEditProfileModal(false);
  };

  const handleHeartTap = () => {
    if (settings.soundEffects) playChime('heart');
    setExpression('happy');

    const compliments =
      character === 'jarvis'
        ? [
            `System optimal. Glad to assist, ${currentUser.displayName}.`,
            'Core processing running at peak efficiency.',
            'Always prepared. What is our next objective?',
          ]
        : [
            `Yay! I love chatting with you, ${currentUser.displayName}! 💖`,
            'Hehe, thank you for being wonderful! 🌸',
            'Always here for you! You make every day brighter! ✨',
          ];

    const picked = compliments[Math.floor(Math.random() * compliments.length)];
    const voiceStyle = getActiveVoiceStyle();
    CompanionTTS.speak(picked, voiceStyle, {
      volume: settings.voiceVolume,
      speed: settings.voiceSpeed,
      pitch: settings.voicePitch,
      languageMode: 'english',
    });
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <SplashScreen
            currentCompanion={character}
            onSelectCompanion={handleSwitchCompanion}
            onEnterApp={() => setCurrentScreen('home')}
            hasGeminiKey={hasServerKey || !!userApiKey}
          />
        );

      case 'onboarding':
        return (
          <NewOnboardingScreen
            initialCompanion={character}
            onSelectCompanion={handleSwitchCompanion}
            onFinishOnboarding={(profile, token) => {
              setCurrentUser(profile);
              setSessionToken(token);
              Storage.saveUserProfile(profile);
              Storage.saveAuthSession({ token, user: profile });
              setCurrentScreen('home');
            }}
          />
        );

      case 'api_setup':
        return (
          <ApiKeySetupScreen
            currentCompanion={character}
            savedApiKey={userApiKey}
            hasServerKey={hasServerKey}
            onSaveKeyAndProceed={(key) => {
              setUserApiKey(key);
              Storage.saveApiKey(key);
              setCurrentScreen('home');
            }}
            onSkipWithServerDefault={() => setCurrentScreen('home')}
            onBack={() => setCurrentScreen('home')}
          />
        );

      case 'home':
        return (
          <HomeScreen
            character={character}
            onSwitchCompanion={handleSwitchCompanion}
            expression={expression}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
            userName={currentUser?.displayName || settings.userName || 'Gamingfire'}
            messages={messages}
            avatarSize={settings.avatarSize}
            onChangeAvatarSize={(s) => handleUpdateSettings({ avatarSize: s })}
            onSendMessage={(text, img) => handleSendMessage(text, img)}
            onOpenChat={() => setCurrentScreen('chat')}
            onOpenVoice={() => setCurrentScreen('voice')}
            onOpenVoiceSettings={() => setCurrentScreen('voice')}
            onOpenDrawer={() => setIsMenuOpen(true)}
            hasGeminiKey={hasServerKey || !!userApiKey}
            onToggleVoice={handleToggleVoice}
            isAutoVoiceActive={isAutoVoiceActive}
            onHoldToTalkStart={handleHoldToTalkStart}
            onHoldToTalkEnd={handleHoldToTalkEnd}
            lastVoiceTranscript={lastVoiceTranscript}
            onCancelVoice={handleCancelVoice}
            recognitionState={recognitionState}
            micErrorMessage={micErrorMessage}
            onClearMicError={() => setMicErrorMessage(null)}
            onOpenStudio={() => setShowStudioModal(true)}
            onOpenMemory={() => setCurrentScreen('memory')}
            onOpenBackgrounds={() => setCurrentScreen('backgrounds')}
            onOpenSettings={() => setCurrentScreen('settings')}
            onOpenProfile={() => setShowEditProfileModal(true)}
            onOpenTools={() => setCurrentScreen('phone_control')}
            onOpenPersonality={() => setShowStudioModal(true)}
            onOpenAutoFeatures={() => setShowAutoFeaturesModal(true)}
            onOpenWorkMode={() => setCurrentScreen('work')}
            floatingMiniVisible={floatingMiniVisible}
            onToggleFloatingMini={() => {
              const next = !floatingMiniVisible;
              setFloatingMiniVisible(next);
              handleUpdateSettings({ floatingMiniEnabled: next });
            }}
            autoFeatures={autoFeatures}
            coreCustomization={coreCustomization}
            onSpeakMessage={handleSpeakMessage}
          />
        );

      case 'studio':
        return (
          <CoreCustomizationStudio
            isOpen={true}
            onClose={() => setCurrentScreen('home')}
            activeCompanion={character}
            onSwitchCompanion={handleSwitchCompanion}
            customization={coreCustomization}
            onSaveCustomization={(c) => {
              setCoreCustomization(c);
              handleUpdateSettings({ coreCustomization: c });
            }}
          />
        );

      case 'chat':
        return (
          <ChatScreen
            messages={messages}
            isThinking={isThinking}
            isStreaming={isStreaming}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onStopSpeaking={handleStopSpeaking}
            onSendMessage={handleSendMessage}
            onToggleVoice={handleToggleVoice}
            onStartVoiceCall={() => setCurrentScreen('voice')}
            onClearChat={() => {
              const fresh = Storage.clearMessages(character, currentUser?.displayName);
              setMessages(fresh);
              Storage.saveMessages(character, fresh);
            }}
            onSpeakMessage={handleSpeakMessage}
            onRetryLastMessage={() => {
              const userLast = [...messages].reverse().find((m) => m.role === 'user');
              if (userLast) handleSendMessage(userLast.text);
            }}
            character={character}
            recognitionState={recognitionState}
            micErrorMessage={micErrorMessage}
            onClearMicError={() => setMicErrorMessage(null)}
            userName={currentUser?.displayName || settings.userName}
          />
        );

      case 'voice':
        return (
          <VoiceScreen
            character={character}
            onSwitchCompanion={handleSwitchCompanion}
            voices={VOICE_STYLES.filter((v) => v.character === character)}
            selectedVoice={getActiveVoiceStyle()}
            onSelectVoice={(voice) => {
              if (character === 'jarvis') {
                handleUpdateSettings({ jarvisVoice: voice.id as any });
              } else {
                handleUpdateSettings({ alyaVoiceId: voice.id, selectedVoiceId: voice.id });
              }
            }}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isThinking={isThinking}
            isAutoVoiceActive={isAutoVoiceActive}
            onHoldToTalkStart={handleHoldToTalkStart}
            onHoldToTalkEnd={handleHoldToTalkEnd}
            onToggleListening={handleToggleVoice}
            onEndCall={() => {
              handleCancelVoice();
              setCurrentScreen('home');
            }}
            onStopSpeaking={handleStopSpeaking}
            expression={expression}
            speechVolume={settings.voiceVolume}
            speechSpeed={settings.voiceSpeed}
            speechPitch={settings.voicePitch}
            onChangeVolume={(v) => handleUpdateSettings({ voiceVolume: v })}
            onChangeSpeed={(v) => handleUpdateSettings({ voiceSpeed: v })}
            onChangePitch={(v) => handleUpdateSettings({ voicePitch: v })}
            lastTranscript={lastVoiceTranscript}
            alyaVoiceReply={alyaVoiceReply}
            onPreviewVoice={(voice) => {
              stopListening();
              const sample =
                voice.character === 'jarvis'
                  ? 'Hello! Main Jarvis hoon. How can I assist you today?'
                  : 'Hi there! Main Alya hoon, chalo kuch mazedaar baat karte hain!';
              CompanionTTS.speak(sample, voice, {
                volume: settings.voiceVolume,
                speed: settings.voiceSpeed,
                pitch: settings.voicePitch,
                languageMode: 'hinglish',
                emotion: 'happy',
              });
            }}
            recognitionState={recognitionState}
            micErrorMessage={micErrorMessage}
            onClearMicError={() => setMicErrorMessage(null)}
            onSendMessage={handleSendMessage}
            onOpenChat={() => setCurrentScreen('chat')}
            onOpenStudio={() => setShowStudioModal(true)}
            onOpenAutoFeatures={() => setShowAutoFeaturesModal(true)}
            autoFeatures={autoFeatures}
            userName={currentUser?.displayName || settings.userName || 'Gamingfire'}
            coreCustomization={coreCustomization}
          />
        );

      case 'memory':
        return (
          <MemoryScreen
            memories={memories}
            onAddMemory={handleAddMemory}
            onEditMemory={handleEditMemory}
            onDeleteMemory={handleDeleteMemory}
            onTogglePin={handleTogglePinMemory}
          />
        );

      case 'backgrounds':
        return (
          <BackgroundsScreen
            backgrounds={backgrounds}
            activeBackground={activeBackground}
            onApplyBackground={handleApplyBackground}
            onAddCustomBackground={handleAddCustomBackground}
          />
        );

      case 'phone_control':
        return (
          <PhoneControlScreen
            onOpenScreenTools={() => setCurrentScreen('screen_tools')}
            onSendAlyaMessage={(msg) => handleSendMessage(msg)}
            userName={currentUser?.displayName || settings.userName}
            floatingMiniVisible={floatingMiniVisible}
            onToggleFloatingMini={(visible) => {
              setFloatingMiniVisible(visible);
              handleUpdateSettings({ floatingMiniEnabled: visible });
            }}
            pendingConfirmation={pendingConfirmation}
            onResolveConfirmation={(confirmed) => {
              handleSendMessage(confirmed ? 'Haan confirm' : 'Cancel');
            }}
            pendingClarification={pendingClarification}
            onSelectClarifiedApp={(app: AndroidAppDefinition) => {
              handleSendMessage(app.name);
            }}
          />
        );

      case 'screen_tools':
        return (
          <ScreenToolsScreen
            onAnalyzeScreen={handleAnalyzeScreen}
            activeScreenCapture={activeScreenCapture}
            onUpdateScreenCapture={setActiveScreenCapture}
            lastSearchContext={lastSearchContext}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onResetSettings={handleResetSettings}
            hasGeminiKey={hasServerKey}
            userApiKey={userApiKey}
            onSaveApiKey={(key) => {
              setUserApiKey(key);
              Storage.saveApiKey(key);
            }}
            onRemoveApiKey={() => {
              setUserApiKey('');
              Storage.removeApiKey();
            }}
            currentUser={currentUser}
            sessionToken={sessionToken}
            onUpdateProfile={(p) => setCurrentUser(p)}
            onLogoutUser={() => {
              Storage.clearAuthSession();
              setSessionToken(null);
            }}
            onOpenGuide={() => setCurrentScreen('help')}
            onOpenAutoFeatures={() => setShowAutoFeaturesModal(true)}
            onRequestLocationPermission={() => setShowLocationModal(true)}
          />
        );

      case 'help':
        return (
          <OnboardingGuideScreen
            currentCompanion={character}
            userName={currentUser?.displayName || settings.userName}
            onCompleteOnboarding={() => setCurrentScreen('home')}
            onBack={() => setCurrentScreen('home')}
            isStandalone={true}
          />
        );

      case 'admin':
        if (adminToken) {
          return (
            <AdminControlPanel
              token={adminToken}
              adminEmail={adminEmail}
              onLogout={() => {
                setAdminToken(null);
                localStorage.removeItem('alya_admin_token_v1');
                setCurrentScreen('home');
              }}
              onBackToApp={() => setCurrentScreen('home')}
            />
          );
        }
        return (
          <AdminLoginScreen
            onLoginSuccess={(token, email) => {
              setAdminToken(token);
              setAdminEmail(email);
              localStorage.setItem('alya_admin_token_v1', token);
              localStorage.setItem('alya_admin_email_v1', email);
            }}
            onBackToApp={() => setCurrentScreen('home')}
            hasActiveSession={!!adminToken}
          />
        );

      case 'about':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/30 to-amber-500/20 border border-white/20 flex items-center justify-center mb-4 shadow-xl backdrop-blur-md">
              <span className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent">
                {character === 'jarvis' ? 'J' : 'A'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {character === 'jarvis' ? 'Jarvis AI Core v3.8' : 'Alya AI Companion v3.8'}
            </h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Interactive anime & sci-fi companion with live neural voice synthesis, dynamic time awareness, Hinglish & English adaptation, and hands-free continuous dialogue.
            </p>
            <div className="glass-panel p-4 rounded-xl max-w-sm w-full space-y-2 text-left text-xs text-slate-300 mb-6">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">System Timezone</span>
                <span className="font-semibold text-white">{TimeEngine.getTimezone()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">AI Intelligence</span>
                <span className="font-semibold text-white">Gemini 3.8 Flash</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Neural TTS</span>
                <span className="font-semibold text-white">Gemini 3.8 Flash Lite TTS</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Hands-Free Flow</span>
                <span className="font-semibold text-emerald-400">Auto Listen & Auto Reply</span>
              </div>
            </div>
            <button
              onClick={() => setCurrentScreen('home')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium text-sm shadow-lg hover:brightness-110 transition-all active:scale-95"
            >
              Back to Home
            </button>
          </div>
        );

      case 'slides':
        return (
          <SlidesScreen
            character={character}
            userName={currentUser?.displayName || settings.userName}
            userApiKey={userApiKey}
            onBackToHome={() => setCurrentScreen('home')}
          />
        );

      case 'work':
        return (
          <WorkScreen
            character={character}
            onSwitchCompanion={handleSwitchCompanion}
            expression={expression}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
            userName={currentUser?.displayName || settings.userName || 'Gamingfire'}
            userApiKey={userApiKey}
            hasGeminiKey={hasServerKey || !!userApiKey}
            isAutoVoiceActive={isAutoVoiceActive}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onToggleVoice={handleToggleVoice}
            onSendMessage={(text, img) => handleSendMessage(text, img)}
            onReturnToNormalMode={() => setCurrentScreen('home')}
            onOpenDrawer={() => setIsMenuOpen(true)}
            lastVoiceTranscript={lastVoiceTranscript}
            onStopSpeaking={handleStopSpeaking}
            autoFeatures={autoFeatures}
            onUpdateAutoFeatures={handleUpdateAutoFeatures}
            messages={messages}
            micErrorMessage={micErrorMessage}
          />
        );

      default:
        return null;
    }
  };

  const showTopBar =
    currentScreen !== 'splash' &&
    currentScreen !== 'onboarding' &&
    currentScreen !== 'admin' &&
    currentScreen !== 'work';

  return (
    <div className="app-viewport relative w-full h-[100dvh] min-h-[100svh] max-h-[100dvh] max-w-[100vw] overflow-hidden bg-[#030107] text-white flex items-center justify-center select-none">
      <div
        className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${
          isPhoneFrame
            ? 'lg:max-w-[430px] lg:max-h-[92dvh] lg:rounded-[44px] lg:border-[10px] lg:border-[#181822] lg:shadow-[0_25px_60px_rgba(0,0,0,0.85)] lg:ring-1 lg:ring-white/10 lg:my-auto'
            : 'max-w-none h-full'
        }`}
      >
        <AnimatedCompanionBackground character={character} />

        {settings.dynamicIslandEnabled && currentScreen !== 'splash' && currentScreen !== 'onboarding' && (
          <DynamicIsland
            visible={isSpeaking || isListening || isThinking}
            isSpeaking={isSpeaking}
            isListening={isListening}
            statusText={
              isSpeaking
                ? `${character === 'jarvis' ? 'Jarvis' : 'Alya'} Speaking...`
                : isListening
                ? 'Listening to you...'
                : 'Thinking...'
            }
            onTap={() => {
              if (currentScreen !== 'voice') setCurrentScreen('voice');
            }}
          />
        )}

        <FloatingMiniAlya
          visible={floatingMiniVisible}
          character={character}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          recognitionState={recognitionState}
          micErrorMessage={micErrorMessage}
          lastTranscript={lastVoiceTranscript}
          alyaReply={alyaVoiceReply}
          backgroundServiceActive={settings.backgroundServiceMode}
          onToggleVoice={handleToggleVoice}
          onPauseService={() => {
            handleCancelVoice();
            backgroundCompanionService.pauseService(character === 'jarvis' ? 'Jarvis' : 'Alya');
          }}
          onInspectScreen={() => {
            setCurrentScreen('screen_tools');
          }}
          onOpenApp={() => {
            setCurrentScreen('home');
          }}
          onClose={() => {
            setFloatingMiniVisible(false);
            handleUpdateSettings({ floatingMiniEnabled: false });
          }}
        />

        {showTopBar && (
          <TopBar
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenMenu={() => setIsMenuOpen(true)}
            onHeartTap={handleHeartTap}
            isPhoneFrame={isPhoneFrame}
            onTogglePhoneFrame={() => setIsPhoneFrame((prev) => !prev)}
            companionStatus={isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Online'}
            character={character}
            floatingMiniVisible={floatingMiniVisible}
            onToggleFloatingMini={() => {
              const next = !floatingMiniVisible;
              setFloatingMiniVisible(next);
              handleUpdateSettings({ floatingMiniEnabled: next });
            }}
          />
        )}

        <main className="relative flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col z-10">
          {renderCurrentScreen()}
        </main>

        <MenuDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          currentScreen={currentScreen}
          onSelectScreen={(screen) => {
            setCurrentScreen(screen);
            setIsMenuOpen(false);
          }}
          userName={currentUser?.displayName || settings.userName || 'Gamingfire'}
          character={character}
          currentUser={currentUser}
          onOpenAutoFeatures={() => setShowAutoFeaturesModal(true)}
        />

        {showEditProfileModal && (
          <EditProfileModal
            isOpen={showEditProfileModal}
            currentUser={currentUser}
            sessionToken={sessionToken}
            companion={character}
            onClose={() => setShowEditProfileModal(false)}
            onProfileUpdated={handleUpdateProfile}
          />
        )}

        {showStudioModal && (
          <CoreCustomizationStudio
            isOpen={showStudioModal}
            onClose={() => setShowStudioModal(false)}
            activeCompanion={character}
            onSwitchCompanion={handleSwitchCompanion}
            customization={coreCustomization}
            onSaveCustomization={(c) => {
              setCoreCustomization(c);
              handleUpdateSettings({ coreCustomization: c });
            }}
          />
        )}

        {showAutoFeaturesModal && (
          <AutoFeaturesModal
            isOpen={showAutoFeaturesModal}
            onClose={() => setShowAutoFeaturesModal(false)}
            character={character}
            autoFeatures={autoFeatures}
            onUpdateAutoFeatures={handleUpdateAutoFeatures}
          />
        )}

        {showLocationModal && (
          <LocationPermissionModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onAllow={() => {
              handleUpdateSettings({
                locationPermissionGranted: true,
                locationPermissionPrompted: true,
              });
            }}
            onDeny={() => {
              handleUpdateSettings({
                locationPermissionGranted: false,
                locationPermissionPrompted: true,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
