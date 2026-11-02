import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  Play,
  Sliders,
  Check,
  Square,
  Loader2,
  ChevronLeft,
  MessageSquare,
  Image as ImageIcon,
  Send,
  X,
} from 'lucide-react';
import {
  VoiceStyle,
  ExpressionType,
  CompanionCharacter,
  RecognitionState,
  CoreCustomization,
  AutoFeaturesSettings,
} from '../../types';
import { LiveAudioWave } from '../character/LiveAudioWave';
import { HolographicAvatar } from '../character/HolographicAvatar';

interface VoiceScreenProps {
  character: CompanionCharacter;
  onSwitchCompanion?: (c: CompanionCharacter) => void;
  voices: VoiceStyle[];
  selectedVoice: VoiceStyle;
  onSelectVoice: (voice: VoiceStyle) => void;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  isAutoVoiceActive?: boolean;
  onHoldToTalkStart?: () => void;
  onHoldToTalkEnd?: () => void;
  onToggleListening: () => void;
  onEndCall: () => void;
  onStopSpeaking: () => void;
  expression: ExpressionType;
  speechVolume: number;
  speechSpeed: number;
  speechPitch: number;
  onChangeVolume: (v: number) => void;
  onChangeSpeed: (v: number) => void;
  onChangePitch: (v: number) => void;
  lastTranscript: string;
  alyaVoiceReply: string;
  onPreviewVoice: (voice: VoiceStyle) => void;
  recognitionState?: RecognitionState;
  micErrorMessage?: string | null;
  onClearMicError?: () => void;
  onSendMessage?: (text: string, imageAttachment?: string) => void;
  onOpenChat?: () => void;
  onOpenStudio?: () => void;
  onOpenAutoFeatures?: () => void;
  autoFeatures?: AutoFeaturesSettings;
  userName?: string;
  coreCustomization?: CoreCustomization;
}

export const VoiceScreen: React.FC<VoiceScreenProps> = ({
  character,
  onSwitchCompanion,
  voices,
  selectedVoice,
  onSelectVoice,
  isListening,
  isSpeaking,
  isThinking = false,
  isAutoVoiceActive = false,
  onHoldToTalkStart,
  onHoldToTalkEnd,
  onToggleListening,
  onEndCall,
  onStopSpeaking,
  expression,
  speechVolume,
  speechSpeed,
  speechPitch,
  onChangeVolume,
  onChangeSpeed,
  onChangePitch,
  lastTranscript,
  alyaVoiceReply,
  onPreviewVoice,
  recognitionState = 'idle',
  micErrorMessage,
  onClearMicError,
  onSendMessage,
  onOpenChat,
  onOpenStudio,
  onOpenAutoFeatures,
  autoFeatures,
  userName = 'friend',
  coreCustomization,
}) => {
  const [showVoiceStudio, setShowVoiceStudio] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isJarvis = character === 'jarvis';
  const maleVoices = voices.filter((v) => v.gender === 'male' || v.character === 'jarvis');
  const femaleVoices = voices.filter((v) => v.gender === 'female' || v.character === 'alya');
  const activeVoices = isJarvis ? maleVoices : femaleVoices;

  const handleTestVoice = (v: VoiceStyle) => {
    setPreviewingId(v.id);
    onPreviewVoice(v);
    setTimeout(() => setPreviewingId(null), 4000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim(), selectedImage || undefined);
    }
    setInputText('');
    setSelectedImage(null);
  };

  const activeColor = isJarvis
    ? coreCustomization?.jarvisColor || '#00e5ff'
    : coreCustomization?.alyaColor || '#ff269f';
  const activeStyle = isJarvis
    ? coreCustomization?.jarvisStyle || 'default_reactor'
    : coreCustomization?.alyaStyle || 'default_orbit';
  const activeParticle = isJarvis
    ? coreCustomization?.jarvisParticleStyle || 'stars'
    : coreCustomization?.alyaParticleStyle || 'hearts';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-transparent text-white select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header */}
      <div className="relative z-20 w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
        <div className="w-full flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={onEndCall}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/45 border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
            title="End Call and return to Home"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center flex flex-col items-center min-w-0">
            <h1
              className={`text-base sm:text-lg font-bold tracking-wide font-comfortaa flex items-center gap-1.5 ${
                isJarvis
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-cyan-300 to-blue-400 drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-purple-300 drop-shadow-[0_0_12px_rgba(255,38,159,0.4)]'
              }`}
            >
              {isJarvis ? <span>⚡ Jarvis Voice</span> : <span>Alya Voice 🌸</span>}
            </h1>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isListening
                    ? 'bg-rose-400 animate-ping'
                    : isThinking
                    ? 'bg-cyan-400 animate-pulse'
                    : isSpeaking
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-[9px] sm:text-[10px] text-slate-300 tracking-wider font-medium leading-tight">
                {isListening
                  ? 'Listening to you...'
                  : isThinking
                  ? 'Thinking / Processing...'
                  : isSpeaking
                  ? 'Speaking response...'
                  : autoFeatures?.autoListen
                  ? 'Hands-Free Loop Active'
                  : 'Voice Call Connected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenAutoFeatures && (
              <button
                type="button"
                onClick={onOpenAutoFeatures}
                className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                  autoFeatures?.autoListen
                    ? isJarvis
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-pink-400 text-pink-300'
                    : 'border-white/10 text-slate-400'
                }`}
                title="Auto Features Menu"
              >
                <Sliders size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span className="text-[10px] font-bold hidden sm:inline">Auto</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowVoiceStudio((prev) => !prev)}
              className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                showVoiceStudio
                  ? isJarvis
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                    : 'border-pink-400 bg-pink-950/60 text-pink-200'
                  : isJarvis
                  ? 'border-cyan-500/25 hover:border-cyan-400 text-cyan-200'
                  : 'border-pink-500/25 hover:border-pink-400 text-pink-200'
              }`}
              title="Voice Profile Tuning"
            >
              <span className="text-[10px] font-semibold">Tuning</span>
            </button>

            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/45 border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
                title="Full Chat History"
              >
                <MessageSquare size={15} />
              </button>
            )}
          </div>
        </div>

        {onSwitchCompanion && (
          <div className="flex items-center justify-center">
            <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => onSwitchCompanion('alya')}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  !isJarvis
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-[0_0_12px_rgba(255,38,159,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌸</span>
                <span>Alya</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchCompanion('jarvis')}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  isJarvis
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚡</span>
                <span>Jarvis</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center Stage: Holographic Avatar & Wave */}
      <div className="relative z-10 flex-1 min-h-[140px] w-full max-w-4xl lg:max-w-5xl mx-auto flex flex-col items-center justify-center px-2 sm:px-6 overflow-hidden my-0.5">
        <HolographicAvatar
          character={character}
          expression={expression}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          size="lg"
          onTap={onToggleListening}
          customColor={activeColor}
          stylePreset={activeStyle}
          particleStyle={activeParticle}
          showPedestal={true}
          userName={userName}
          className="w-full h-full"
        />
        <div className="w-48 -mt-1 flex justify-center shrink-0">
          <LiveAudioWave
            active={isListening || isSpeaking}
            type="bars"
            color={isJarvis ? 'gold' : 'pink'}
          />
        </div>
      </div>

      {/* Live Transcript / Subtitle Box */}
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-6 mb-1.5 z-20 shrink-0">
        <div
          className={`rounded-2xl border backdrop-blur-xl p-2.5 shadow-xl transition-all ${
            isJarvis
              ? 'bg-black/40 border-cyan-500/25 shadow-[0_4px_20px_rgba(0,229,255,0.08)]'
              : 'bg-black/40 border-pink-500/25 shadow-[0_4px_20px_rgba(255,38,159,0.08)]'
          }`}
        >
          {isListening && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <p className="text-xs text-rose-200 font-medium truncate">
                <span className="font-bold uppercase tracking-wider text-[10px] text-rose-300 mr-1.5">
                  Listening:
                </span>
                "{lastTranscript || 'Speak naturally now...'}"
              </p>
            </div>
          )}

          {isThinking && !isListening && !isSpeaking && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <p className="text-xs text-cyan-200 font-medium italic">
                {isJarvis ? 'Jarvis is formulating response...' : 'Alya is thinking...'}
              </p>
            </div>
          )}

          {isSpeaking && !isListening && (
            <div className="flex items-start gap-2">
              <Volume2
                size={14}
                className={`mt-0.5 shrink-0 ${isJarvis ? 'text-cyan-400' : 'text-pink-400'}`}
              />
              <p
                className={`text-xs font-semibold leading-snug line-clamp-2 ${
                  isJarvis ? 'text-cyan-100' : 'text-pink-100'
                }`}
              >
                "{alyaVoiceReply || 'Speaking response...'}"
              </p>
            </div>
          )}

          {!isListening && !isSpeaking && !isThinking && (
            <div className="text-center py-0.5 text-[11px] text-slate-300 font-quicksand">
              {isAutoVoiceActive
                ? `Hands-free active. ${isJarvis ? 'Jarvis' : 'Alya'} will automatically listen after replying.`
                : `${isJarvis ? 'Jarvis' : 'Alya'} is ready. Tap center mic for Auto Voice, or use Hold-to-Talk.`}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="relative z-20 w-full max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-6 pb-[max(0.5rem,calc(env(safe-area-inset-bottom,0px)+0.35rem))] pt-0 flex flex-col gap-2 shrink-0">
        {micErrorMessage && (
          <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/35 text-amber-200 backdrop-blur-md gap-2">
            <span className="text-[11px] leading-snug break-words flex-1">{micErrorMessage}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleListening}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline py-0.5 px-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              >
                Retry
              </button>
              {onClearMicError && (
                <button
                  type="button"
                  onClick={onClearMicError}
                  className="text-slate-400 hover:text-slate-200 text-sm font-bold w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-black/60 border border-white/15 w-fit">
            <img src={selectedImage} alt="Attachment" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-[10px] text-slate-300">Image attached for call</span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X size={11} />
            </button>
          </div>
        )}

        <div className="w-full flex items-center justify-between px-1">
          {/* 1. Hold-to-Talk Control */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onHoldToTalkStart?.();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              onHoldToTalkEnd?.();
            }}
            onPointerCancel={() => onHoldToTalkEnd?.()}
            onPointerLeave={() => onHoldToTalkEnd?.()}
            onContextMenu={(e) => e.preventDefault()}
            className={`h-9 sm:h-10 px-2.5 rounded-xl bg-black/50 border backdrop-blur-md flex items-center gap-1.5 transition-all select-none cursor-pointer active:scale-95 shadow-md ${
              isJarvis
                ? 'border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:bg-cyan-950/40'
                : 'border-pink-500/30 hover:border-pink-400 text-pink-300 hover:bg-pink-950/40'
            }`}
            title="Press and HOLD to talk, release to send immediately"
          >
            <Mic size={14} className="shrink-0" />
            <span className="text-[10px] font-bold tracking-tight uppercase whitespace-nowrap">Hold</span>
          </button>

          {/* 2. Stop Speaking */}
          <button
            type="button"
            onClick={onStopSpeaking}
            disabled={!isSpeaking}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/45 border backdrop-blur-md flex items-center justify-center transition-all active:scale-95 shadow-md ${
              isSpeaking
                ? 'border-rose-500/50 text-rose-300 hover:bg-rose-950/40'
                : 'border-white/10 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
            title="Stop voice output"
          >
            <Square size={15} />
          </button>

          {/* 3. Prominent Glowing Center Mic = Auto Voice Toggle */}
          <button
            type="button"
            onClick={onToggleListening}
            disabled={recognitionState === 'starting' || recognitionState === 'stopping'}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 cursor-pointer relative group ${
              recognitionState === 'starting' || recognitionState === 'stopping'
                ? 'opacity-60 cursor-wait'
                : isListening
                ? 'bg-rose-500 text-white shadow-[0_0_26px_#f43f5e] animate-pulse ring-4 ring-rose-400/50'
                : isSpeaking
                ? 'bg-purple-600 text-white shadow-[0_0_22px_#9333ea] ring-4 ring-purple-400/50'
                : isThinking
                ? 'bg-amber-500 text-white shadow-[0_0_22px_#f59e0b] animate-pulse ring-4 ring-amber-400/50'
                : isAutoVoiceActive
                ? 'bg-emerald-600 text-white shadow-[0_0_22px_#10b981] ring-4 ring-emerald-400/50 animate-pulse'
                : isJarvis
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_22px_rgba(0,229,255,0.7)] ring-2 ring-cyan-300/40'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_22px_rgba(255,38,159,0.7)] ring-2 ring-pink-300/40'
            }`}
            title={
              isListening
                ? 'Auto Voice Active (Listening - Tap to turn off)'
                : isAutoVoiceActive
                ? 'Auto Voice Active (Waiting)'
                : 'Tap to start Auto Voice mode'
            }
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            <span
              className={`absolute -inset-1 rounded-full opacity-60 animate-ping pointer-events-none ${
                isListening
                  ? 'bg-rose-500'
                  : isAutoVoiceActive
                  ? 'bg-emerald-400'
                  : isJarvis
                  ? 'bg-cyan-400'
                  : 'bg-pink-400'
              }`}
            />
          </button>

          {/* 4. Open Chat */}
          <button
            type="button"
            onClick={onOpenChat}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/45 border border-white/10 hover:border-white/30 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
            title="Open Full Chat"
          >
            <MessageSquare size={16} />
          </button>

          {/* 5. End Call */}
          <button
            type="button"
            onClick={onEndCall}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white backdrop-blur-md flex items-center justify-center transition-all active:scale-95 shadow-md"
            title="End Call and return to Home"
          >
            <PhoneOff size={16} />
          </button>
        </div>

        <form
          onSubmit={handleSend}
          className={`rounded-full p-1 pl-3.5 flex items-center gap-1.5 border backdrop-blur-xl shadow-xl transition-all focus-within:ring-2 ${
            isJarvis
              ? 'bg-black/55 border-cyan-500/30 focus-within:ring-cyan-500/40 focus-within:border-cyan-400 shadow-[0_4px_20px_rgba(0,229,255,0.1)]'
              : 'bg-black/55 border-pink-500/30 focus-within:ring-pink-500/40 focus-within:border-pink-400 shadow-[0_4px_20px_rgba(255,38,159,0.1)]'
          }`}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message or ask ${isJarvis ? 'Jarvis' : 'Alya'}...`}
            className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none py-1"
          />
          <div className="flex items-center gap-1 pr-0.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Attach Image"
            >
              <ImageIcon size={15} />
            </button>
            <button
              type="submit"
              disabled={!inputText.trim() && !selectedImage}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                inputText.trim() || selectedImage
                  ? isJarvis
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-[0_0_14px_rgba(0,229,255,0.6)] active:scale-95'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold shadow-[0_0_14px_rgba(255,38,159,0.6)] active:scale-95'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Voice Studio Modal */}
      {showVoiceStudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-md max-h-[85vh] rounded-3xl border backdrop-blur-2xl p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto ${
              isJarvis
                ? 'bg-[#060c18]/90 border-cyan-500/30 shadow-[0_0_35px_rgba(0,229,255,0.2)]'
                : 'bg-[#150616]/90 border-pink-500/30 shadow-[0_0_35px_rgba(255,38,159,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders size={18} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <h3 className="font-bold text-sm text-white">
                  {isJarvis ? 'Jarvis Voice Profiles' : 'Alya Voice Profiles'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceStudio(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-300">Select Voice Profile:</span>
              <div className="space-y-2">
                {activeVoices.map((v) => {
                  const isSelected = selectedVoice.id === v.id;
                  const isTesting = previewingId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => onSelectVoice(v)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? isJarvis
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                            : 'bg-pink-500/20 border-pink-400 shadow-[0_0_12px_rgba(255,38,159,0.25)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{v.name}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${
                              isJarvis
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                : 'bg-pink-500/10 text-pink-300 border-pink-500/30'
                            }`}
                          >
                            {v.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mt-1 line-clamp-2 leading-tight">
                          {v.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isJarvis
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300'
                              : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300'
                          }`}
                          title="Preview Voice Sample"
                        >
                          {isTesting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Play size={13} />
                          )}
                        </button>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? isJarvis
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                                : 'bg-pink-500 border-pink-400 text-white'
                              : 'border-white/20 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span>Speech Delivery Tuning</span>
                <button
                  type="button"
                  onClick={() => {
                    onChangeVolume(1.0);
                    onChangeSpeed(1.0);
                    onChangePitch(1.0);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Output Volume</span>
                  <span className="font-mono text-slate-400">
                    {Math.round(speechVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={speechVolume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Speaking Speed</span>
                  <span className="font-mono text-slate-400">{speechSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.3"
                  step="0.05"
                  value={speechSpeed}
                  onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVoiceStudio(false)}
              className={`w-full py-2.5 rounded-2xl font-bold text-xs text-white shadow-lg transition-all active:scale-95 ${
                isJarvis
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600'
                  : 'bg-gradient-to-r from-pink-600 to-rose-600'
              }`}
            >
              Done & Return to Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
