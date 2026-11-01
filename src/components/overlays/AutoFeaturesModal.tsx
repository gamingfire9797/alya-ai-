import React from 'react';
import {
  X,
  Mic,
  Headphones,
  Volume2,
  RefreshCw,
  HandMetal,
  Zap,
  CheckCircle2,
  Sliders,
  MessageSquare,
} from 'lucide-react';
import { AutoFeaturesSettings, CompanionCharacter } from '../../types';
import { playChime } from '../../utils/audio';

interface AutoFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CompanionCharacter;
  autoFeatures: AutoFeaturesSettings;
  onUpdateAutoFeatures: (updated: Partial<AutoFeaturesSettings>) => void;
}

export const AutoFeaturesModal: React.FC<AutoFeaturesModalProps> = ({
  isOpen,
  onClose,
  character,
  autoFeatures,
  onUpdateAutoFeatures,
}) => {
  if (!isOpen) return null;

  const isJarvis = character === 'jarvis';

  const toggleFeature = (key: keyof AutoFeaturesSettings) => {
    playChime('click');
    onUpdateAutoFeatures({
      [key]: !autoFeatures[key],
    });
  };

  const setAllHandsFree = (enabled: boolean) => {
    playChime('heart');
    onUpdateAutoFeatures({
      autoMic: enabled,
      autoListen: enabled,
      autoReply: enabled,
      autoTTS: enabled,
      autoRetry: enabled,
      smartInterruption: enabled,
      conversationContinuation: enabled,
    });
  };

  const featureItems: Array<{
    key: keyof AutoFeaturesSettings;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      key: 'autoListen',
      title: 'Auto Listen',
      description: 'Automatically enables listening after AI finishes speaking (Hands-free flow).',
      icon: <Headphones size={18} />,
      color: isJarvis ? 'text-cyan-400' : 'text-pink-400',
    },
    {
      key: 'autoMic',
      title: 'Auto Mic',
      description: 'Keeps the microphone armed and ready when in voice mode without repeated taps.',
      icon: <Mic size={18} />,
      color: isJarvis ? 'text-amber-400' : 'text-rose-400',
    },
    {
      key: 'autoReply',
      title: 'Auto Reply',
      description: 'Automatically sends your spoken phrase as soon as speech pause is detected.',
      icon: <Zap size={18} />,
      color: isJarvis ? 'text-blue-400' : 'text-purple-400',
    },
    {
      key: 'autoTTS',
      title: 'Auto TTS',
      description: 'Automatically vocalizes the AI response with neural speech synthesis.',
      icon: <Volume2 size={18} />,
      color: isJarvis ? 'text-teal-400' : 'text-emerald-400',
    },
    {
      key: 'autoRetry',
      title: 'Auto Retry & High-Demand Recovery',
      description: 'Silently retries with exponential backoff if Gemini API has temporary traffic spikes.',
      icon: <RefreshCw size={18} />,
      color: isJarvis ? 'text-yellow-400' : 'text-amber-400',
    },
    {
      key: 'smartInterruption',
      title: 'Smart Interruption',
      description: 'Speaking or tapping immediately stops AI voice playback and starts listening to you.',
      icon: <HandMetal size={18} />,
      color: isJarvis ? 'text-indigo-400' : 'text-fuchsia-400',
    },
    {
      key: 'conversationContinuation',
      title: 'Conversation Continuation',
      description: 'Maintains ongoing dialogue turn-taking loop so you can chat continuously.',
      icon: <MessageSquare size={18} />,
      color: isJarvis ? 'text-sky-400' : 'text-pink-300',
    },
  ];

  const allActive = Object.values(autoFeatures).every(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      {/* Modal Dialog */}
      <div
        className={`relative z-10 w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl overflow-hidden glass-panel border ${
          isJarvis ? 'border-cyan-500/35 shadow-[0_0_40px_rgba(0,229,255,0.2)]' : 'border-pink-500/35 shadow-[0_0_40px_rgba(255,38,159,0.2)]'
        } bg-[#0e0a19] text-white`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                isJarvis
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-pink-500/20 border border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(255,38,159,0.4)]'
              }`}
            >
              <Sliders size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold font-comfortaa text-white">Auto Features Menu</h2>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isJarvis ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                  }`}
                >
                  Hands-Free
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Continuous voice loop, auto-listen, smart interruption & resilience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Mode Preset Pill Bar */}
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-300 font-medium">Quick Preset:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAllHandsFree(true)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                allActive
                  ? isJarvis
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-pink-500 text-white shadow-md'
                  : 'glass-panel text-slate-300 hover:text-white'
              }`}
            >
              All Hands-Free ON
            </button>
            <button
              type="button"
              onClick={() => setAllHandsFree(false)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold glass-panel text-slate-400 hover:text-white transition-colors"
            >
              Manual PTT
            </button>
          </div>
        </div>

        {/* Scrollable Features List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-none">
          {featureItems.map((item) => {
            const isEnabled = autoFeatures[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleFeature(item.key)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isEnabled
                    ? isJarvis
                      ? 'bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_15px_rgba(0,229,255,0.12)]'
                      : 'bg-pink-950/40 border-pink-500/40 shadow-[0_0_15px_rgba(255,38,159,0.12)]'
                    : 'bg-white/5 border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl mt-0.5 ${
                      isEnabled
                        ? isJarvis
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-pink-500/20 text-pink-300'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      {isEnabled && (
                        <CheckCircle2
                          size={12}
                          className={isJarvis ? 'text-cyan-400' : 'text-pink-400'}
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFeature(item.key);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                    isEnabled
                      ? isJarvis
                        ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.5)]'
                        : 'bg-pink-500 shadow-[0_0_10px_rgba(255,38,159,0.5)]'
                      : 'bg-white/20'
                  }`}
                  aria-label={`Toggle ${item.title}`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400 font-mono">
            {Object.values(autoFeatures).filter(Boolean).length}/7 features active
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-full font-bold text-xs transition-all shadow-md active:scale-95 ${
              isJarvis
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_15px_rgba(255,38,159,0.4)]'
            }`}
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
