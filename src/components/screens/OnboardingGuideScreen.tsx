import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Sparkles,
  Zap,
  Brain,
  Key,
  UserCheck,
  Search,
  BookOpen,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { CompanionCharacter } from '../../types';
import { playChime } from '../../utils/audio';

interface OnboardingGuideScreenProps {
  currentCompanion: CompanionCharacter;
  userName: string;
  onCompleteOnboarding: () => void;
  onBack: () => void;
  isStandalone?: boolean;
}

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  badge: string;
  category: 'auth' | 'voice' | 'companion' | 'system';
  title: string;
  summary: string;
  steps: string[];
  tip: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'time_awareness',
    icon: <Clock size={22} className="text-cyan-400" />,
    badge: 'Time & Timezone',
    category: 'system',
    title: 'Live Real-Time Awareness',
    summary: 'Alya dynamically understands your live system clock, current year, date, day of the week, and timezone.',
    steps: [
      'Automatically checks your browser/device system clock and timezone (e.g. Asia/Kolkata, America/New_York).',
      'Never uses outdated training cutoffs or static years like 2024.',
      'Calibrates with the server time engine to guarantee accurate scheduling and greetings.',
      'Geographic location is strictly optional and privacy-first.',
    ],
    tip: 'Ask Alya "What is today\'s date?", "Which year is it?", or "What time is it?" anytime!',
  },
  {
    id: 'language_adaptation',
    icon: <Sparkles size={22} className="text-pink-400" />,
    badge: 'Language Adaptation',
    category: 'companion',
    title: 'Hinglish & English Automatic Adaptation',
    summary: 'Alya automatically detects your language mode and mirrors your communication style naturally.',
    steps: [
      'Speak or type in Hinglish ("Hey Alya kya kar rahi ho?") and Alya responds warmly in Hinglish.',
      'Speak or type in English and Alya responds in fluent, articulate English.',
      'Speak in Hindi and Alya answers comfortably in Hindi.',
      'The speech recognition and neural TTS automatically calibrate phonetic pronunciation to match your language.',
    ],
    tip: 'You can switch between Hinglish and English mid-conversation without changing any settings.',
  },
  {
    id: 'voice_mic',
    icon: <Mic size={22} className="text-rose-400" />,
    badge: 'Voice Calls',
    category: 'voice',
    title: 'Hands-Free Voice Flow & Continuous Dialogue',
    summary: 'Engage in natural hands-free voice calls with automatic speech detection and auto-listening.',
    steps: [
      'Microphone access is requested when you tap the mic button.',
      'With Auto Listen enabled, listening turns on automatically once the companion finishes speaking.',
      'Speak in English or Hindi/Hinglish: speech recognition transcribes your voice naturally.',
      'Tap Stop or speak while companion is talking to instantly trigger smart interruption.',
    ],
    tip: 'Toggle any hands-free setting quickly via the Auto Features Menu on the home screen.',
  },
  {
    id: 'profile_setup',
    icon: <UserCheck size={22} className="text-emerald-400" />,
    badge: 'Profile & Setup',
    category: 'auth',
    title: 'Profile Customization & Device Setup',
    summary: 'Set up your unique username, nickname, avatar, and banner with zero external accounts or passwords required.',
    steps: [
      'Choose a unique username (3-20 characters: letters, numbers, underscores) verified against database rules.',
      'Enter your preferred display nickname that Alya and Jarvis use to address you in conversation.',
      'Pick an avatar and banner from built-in cyberpunk presets or upload your own custom artwork (JPEG, PNG, WebP).',
      'Your profile is stored locally on your device with cryptographic session security.',
    ],
    tip: 'You can customize your nickname, username, avatar, and banner anytime in Settings -> User Profile.',
  },
  {
    id: 'ai_keys',
    icon: <Key size={22} className="text-amber-400" />,
    badge: 'AI Engine',
    category: 'system',
    title: 'Connecting an AI Provider (Gemini API)',
    summary: 'Connect your own Google Gemini API key or use the built-in server proxy for AI intelligence.',
    steps: [
      'Obtain a free Google AI Studio API key at aistudio.google.com.',
      'Paste your key into the masked input on the Connect AI screen or in Settings.',
      'Tap "Test Connection" to check latency and verify connection directly with Google servers.',
      'Keys are saved isolated in your device storage and never leaked or exposed to other users.',
    ],
    tip: 'Server-side proxy credentials handle requests safely when no personal key is entered.',
  },
  {
    id: 'dual_personas',
    icon: <Zap size={22} className="text-purple-400" />,
    badge: 'Dual Companions',
    category: 'companion',
    title: 'Alya & Jarvis: Two Distinct Personalities',
    summary: 'Switch anytime between Alya (warm, friendly companion) and Jarvis (tactical, grounded advisor).',
    steps: [
      'Alya: Features a vibrant pink holographic avatar, expressive facial emotions, and natural bilingual Hindi/English dialogue.',
      'Jarvis: Features a cyan reactor holographic core, analytical tone, and tactical task assistance.',
      'Switch between companions with one tap in the top navigation bar or through the side menu drawer.',
      'Each companion retains independent memory logs, emotion responses, and voice styles.',
    ],
    tip: 'Tap the avatar on the home screen to hear personalized voice reactions!',
  },
  {
    id: 'memory_bank',
    icon: <Brain size={22} className="text-indigo-400" />,
    badge: 'Memory Bank',
    category: 'companion',
    title: 'Smart Memory Bank & Data Privacy',
    summary: 'Companions store your preferences and facts locally. You have 100% control to review or delete them.',
    steps: [
      'Companions automatically remember facts you share, like hobbies, goals, and communication preferences.',
      'Open "Memory Bank" from the menu to inspect every saved memory categorized by topic.',
      'Sensitive tokens like passwords, tokens, or coordinates are automatically prevented from storage.',
      'Tap the delete trash icon to permanently remove any memory from your companion\'s mind.',
    ],
    tip: 'You can clear all memory data at once in Settings with one click.',
  },
];

export const OnboardingGuideScreen: React.FC<OnboardingGuideScreenProps> = ({
  currentCompanion,
  userName,
  onCompleteOnboarding,
  onBack,
  isStandalone = false,
}) => {
  const isJarvis = currentCompanion === 'jarvis';
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = GUIDE_SECTIONS.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.steps.some((step) => step.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const activeCard = filteredSections[activeIdx] || filteredSections[0] || GUIDE_SECTIONS[0];

  const handleNext = () => {
    if (activeIdx < filteredSections.length - 1) {
      setActiveIdx((prev) => prev + 1);
      playChime('click');
    } else {
      playChime('heart');
      onCompleteOnboarding();
    }
  };

  const handlePrev = () => {
    if (activeIdx > 0) {
      setActiveIdx((prev) => prev - 1);
      playChime('click');
    } else {
      onBack();
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-[#07050f] text-white p-4 md:p-6 select-none scrollbar-none">
      <div className="relative z-10 w-full max-w-lg mx-auto pt-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} />
            <span>{isStandalone ? 'Back' : 'Back (Step 4)'}</span>
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
            {isStandalone ? 'Help Center & Documentation' : 'Step 5 of 5: Getting Started Guide'}
          </span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex-1 flex flex-col justify-start my-3 space-y-3">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
            <BookOpen size={14} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            <span className="font-semibold text-slate-200">
              {isStandalone ? 'Alya AI Knowledge Base' : `Welcome, ${userName || 'Friend'}!`}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-comfortaa text-white">
            {isStandalone ? 'Getting Started & Feature Guide' : 'Discover What Alya Can Do'}
          </h2>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIdx(0);
              }}
              placeholder="Search guide (date, time, voice, hinglish, profile)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filteredSections.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                playChime('click');
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap border ${
                idx === activeIdx
                  ? isJarvis
                    ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-pink-950/60 border-pink-400 text-pink-200 shadow-[0_0_12px_rgba(244,114,182,0.25)]'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {s.badge}
            </button>
          ))}
        </div>

        {activeCard && (
          <div
            className={`p-5 rounded-3xl bg-black/60 border backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300 ${
              isJarvis ? 'border-amber-500/30' : 'border-pink-500/30'
            }`}
          >
            <div className="space-y-3.5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg ${
                      isJarvis ? 'bg-amber-950/50 border-amber-500/40' : 'bg-pink-950/50 border-pink-500/40'
                    }`}
                  >
                    {activeCard.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-comfortaa text-white leading-tight">
                      {activeCard.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                      {activeCard.badge}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {activeIdx + 1}/{filteredSections.length}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-quicksand">
                {activeCard.summary}
              </p>

              <div className="space-y-2 py-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  How it works:
                </div>
                {activeCard.steps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <span
                      className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                        isJarvis
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                      }`}
                    >
                      {sIdx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
                <Sparkles size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="leading-snug text-[11px]">
                  <strong className="text-white">Pro Tip:</strong> {activeCard.tip}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-2">
          {activeIdx > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="py-3 px-4 rounded-2xl font-semibold text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 py-3 px-5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
              isJarvis
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-[0_0_25px_rgba(244,114,182,0.35)]'
            }`}
          >
            {activeIdx < filteredSections.length - 1 ? (
              <>
                <span>Next Topic ({activeIdx + 1}/{filteredSections.length})</span>
                <ChevronRight size={16} />
              </>
            ) : (
              <>
                <span>{isStandalone ? 'Close Guide & Return' : 'Launch Companion Dashboard'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
