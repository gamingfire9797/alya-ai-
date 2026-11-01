import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Volume2,
  VolumeX,
  X,
  Send,
  Square,
  Headphones,
  Radio,
  Clock,
  User,
  Bot,
} from 'lucide-react';
import { CompanionCharacter, AutoFeaturesSettings, ChatMessage } from '../../types';
import { CompanionTTS } from '../../utils/audio';

interface WorkAssistantBarProps {
  character: CompanionCharacter;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isAutoVoiceActive: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleVoice: () => void;
  onReturnToNormalMode: () => void;
  onSendMessage: (text: string) => void;
  lastTranscript?: string;
  onStopSpeaking?: () => void;
  autoFeatures?: AutoFeaturesSettings;
  onUpdateAutoFeatures?: (updated: Partial<AutoFeaturesSettings>) => void;
  messages?: ChatMessage[];
  micErrorMessage?: string | null;
}

export const WorkAssistantBar: React.FC<WorkAssistantBarProps> = ({
  character,
  isListening,
  isSpeaking,
  isThinking,
  isAutoVoiceActive,
  isMuted: propIsMuted,
  onToggleMute: propOnToggleMute,
  onToggleVoice,
  onReturnToNormalMode,
  onSendMessage,
  lastTranscript = '',
  onStopSpeaking,
  autoFeatures,
  onUpdateAutoFeatures,
  messages = [],
  micErrorMessage,
}) => {
  const isJarvis = character === 'jarvis';
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [localMuted, setLocalMuted] = useState(() => CompanionTTS.getMuted());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isMuted = propIsMuted !== undefined ? propIsMuted : localMuted;

  // Sync mute state
  useEffect(() => {
    setLocalMuted(CompanionTTS.getMuted());
  }, [isSpeaking, propIsMuted]);

  const handleToggleMute = () => {
    if (propOnToggleMute) {
      propOnToggleMute();
    } else {
      const next = !localMuted;
      CompanionTTS.setMuted(next);
      setLocalMuted(next);
    }
  };

  const handleToggleAutoListen = () => {
    if (onUpdateAutoFeatures && autoFeatures) {
      onUpdateAutoFeatures({ autoListen: !autoFeatures.autoListen });
    } else {
      onToggleVoice();
    }
  };

  const handleToggleAutoVoice = () => {
    if (onUpdateAutoFeatures && autoFeatures) {
      onUpdateAutoFeatures({ autoTTS: !autoFeatures.autoTTS });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;
    onSendMessage(clean);
    setChatInput('');
  };

  useEffect(() => {
    if (isHistoryOpen && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isHistoryOpen]);

  // Status computation
  const statusLabel = isListening
    ? 'Listening...'
    : isThinking
    ? 'Thinking...'
    : isSpeaking
    ? `${isJarvis ? 'Jarvis' : 'Alya'} Speaking...`
    : 'Ready';

  return (
    <div className="relative z-30 shrink-0 select-none pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 sm:px-4">
      {/* 1. EXPANDABLE CONVERSATION HISTORY DRAWER */}
      {isHistoryOpen && (
        <div
          className={`mb-2 rounded-2xl border backdrop-blur-2xl shadow-2xl flex flex-col max-h-[45vh] overflow-hidden animate-fadeIn ${
            isJarvis
              ? 'bg-[#061224]/95 border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.2)]'
              : 'bg-[#150624]/95 border-pink-500/40 shadow-[0_0_35px_rgba(255,38,159,0.2)]'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
              <span className="text-xs font-bold text-white">
                {isJarvis ? 'Jarvis Dialogue History' : 'Alya Dialogue History'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
                {messages.length} messages
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                <span>No conversation messages yet. Ask {isJarvis ? 'Jarvis' : 'Alya'} anything!</span>
              </div>
            ) : (
              messages.slice(-20).map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        isUser
                          ? 'bg-purple-600 text-white'
                          : isJarvis
                          ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                          : 'bg-pink-500/30 text-pink-300 border border-pink-500/40'
                      }`}
                    >
                      {isUser ? <User size={10} /> : <Bot size={10} />}
                    </div>

                    <div
                      className={`max-w-[82%] px-3 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? 'bg-purple-600/80 text-white rounded-tr-none'
                          : isJarvis
                          ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-100 rounded-tl-none'
                          : 'bg-pink-950/60 border border-pink-500/30 text-pink-100 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>
        </div>
      )}

      {/* 2. MAIN BOTTOM CHAT COMPOSER DOCK */}
      <div
        className={`rounded-2xl border backdrop-blur-2xl p-2 sm:p-2.5 shadow-2xl transition-all ${
          isJarvis
            ? 'bg-gradient-to-r from-[#061224]/95 via-[#040916]/95 to-[#061224]/95 border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.15)]'
            : 'bg-gradient-to-r from-[#160624]/95 via-[#090212]/95 to-[#160624]/95 border-pink-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(255,38,159,0.15)]'
        }`}
      >
        {/* Top Controls Row: Status Badge & Quick Toggles */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-white/10 text-[11px]">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isListening
                  ? 'bg-rose-400 animate-ping'
                  : isThinking
                  ? 'bg-amber-400 animate-bounce'
                  : isSpeaking
                  ? 'bg-fuchsia-400 animate-pulse'
                  : isJarvis
                  ? 'bg-cyan-400'
                  : 'bg-pink-400'
              }`}
            />
            <span
              className={`font-semibold truncate ${
                isListening
                  ? 'text-rose-400'
                  : isThinking
                  ? 'text-amber-300'
                  : isSpeaking
                  ? 'text-fuchsia-300'
                  : 'text-slate-300'
              }`}
            >
              {statusLabel}
            </span>

            {/* If speaking, provide one-click STOP button */}
            {isSpeaking && onStopSpeaking && (
              <button
                type="button"
                onClick={onStopSpeaking}
                className="px-2 py-0.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 border border-rose-500/40 text-rose-200 font-bold flex items-center gap-1 text-[10px] transition-colors active:scale-95 ml-1"
                title="Stop speaking immediately"
              >
                <Square size={9} fill="currentColor" />
                <span>Stop</span>
              </button>
            )}

            {/* Last transcript preview if listening or spoke */}
            {lastTranscript && !isSpeaking && (
              <span className="hidden md:inline text-[10px] text-slate-400 truncate max-w-xs italic">
                "{lastTranscript}"
              </span>
            )}
          </div>

          {/* Quick Voice & Audio Toggles */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Auto Listen Button */}
            {autoFeatures && onUpdateAutoFeatures && (
              <button
                type="button"
                onClick={handleToggleAutoListen}
                className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  autoFeatures.autoListen
                    ? isJarvis
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                      : 'bg-pink-500/25 border-pink-400 text-pink-200 shadow-[0_0_10px_rgba(255,38,159,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
                title="Auto Listen: Automatically resume listening when AI finishes responding"
              >
                <Radio size={11} className={autoFeatures.autoListen ? 'animate-pulse' : ''} />
                <span className="hidden xs:inline">Auto Listen</span>
                <span className="xs:hidden">Auto</span>
              </button>
            )}

            {/* Auto Voice / TTS Toggle */}
            {autoFeatures && onUpdateAutoFeatures && (
              <button
                type="button"
                onClick={handleToggleAutoVoice}
                className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  autoFeatures.autoTTS
                    ? isJarvis
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                      : 'bg-pink-500/25 border-pink-400 text-pink-200 shadow-[0_0_10px_rgba(255,38,159,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
                title="Auto Voice: Speak AI responses with Companion TTS"
              >
                <Headphones size={11} />
                <span className="hidden sm:inline">Auto Voice</span>
              </button>
            )}

            {/* Mute Audio Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute companion audio' : 'Mute companion audio'}
            >
              {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>

            {/* Chat History Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`p-1.5 rounded-xl border transition-all ${
                isHistoryOpen
                  ? isJarvis
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-pink-500/25 border-pink-400 text-pink-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isHistoryOpen ? 'Hide dialogue history' : 'Show dialogue history'}
            >
              <MessageSquare size={12} />
            </button>
          </div>
        </div>

        {/* Bottom Input Form: Mic + Text Input + Send */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
          {/* Microphone Button */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 shadow-lg ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse'
                : isJarvis
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.35)] hover:brightness-110'
                : 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-[0_0_12px_rgba(255,38,159,0.35)] hover:brightness-110'
            }`}
            title={isListening ? 'Stop listening' : 'Start microphone listening'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Message Input Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask ${isJarvis ? 'Jarvis' : 'Alya'} about this page, or anything...`}
              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400/80 focus:ring-1 focus:ring-pink-400/40 font-sans"
            />
            {chatInput && (
              <button
                type="button"
                onClick={() => setChatInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 ${
              chatInput.trim()
                ? isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,229,255,0.4)] hover:brightness-110 cursor-pointer'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_15px_rgba(255,38,159,0.4)] hover:brightness-110 cursor-pointer'
                : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
            }`}
            title="Send command or message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
