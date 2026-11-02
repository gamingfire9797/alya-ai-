import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Sliders,
  Menu,
  Send,
  Sparkles,
  ChevronRight,
  X,
  User,
  Image as ImageIcon,
  Palette,
  Volume2,
  Briefcase,
  Layers,
} from 'lucide-react';
import {
  CompanionCharacter,
  ExpressionType,
  ChatMessage,
  RecognitionState,
  CoreCustomization,
  AutoFeaturesSettings,
} from '../../types';
import { HolographicAvatar } from '../character/HolographicAvatar';
import { FuturisticBottomBar } from '../navigation/FuturisticBottomBar';

interface HomeScreenProps {
  character: CompanionCharacter;
  onSwitchCompanion: (c: CompanionCharacter) => void;
  expression: ExpressionType;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  userName: string;
  messages: ChatMessage[];
  avatarSize?: 'sm' | 'md' | 'lg';
  onChangeAvatarSize?: (s: 'sm' | 'md' | 'lg') => void;
  onSendMessage: (text: string, imageAttachment?: string) => void;
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenDrawer: () => void;
  hasGeminiKey: boolean;
  onToggleVoice: () => void;
  isAutoVoiceActive?: boolean;
  onHoldToTalkStart?: () => void;
  onHoldToTalkEnd?: () => void;
  lastVoiceTranscript?: string;
  onCancelVoice?: () => void;
  recognitionState?: RecognitionState;
  micErrorMessage?: string | null;
  onClearMicError?: () => void;
  onOpenStudio?: () => void;
  onOpenMemory?: () => void;
  onOpenBackgrounds?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenTools?: () => void;
  onOpenPersonality?: () => void;
  onOpenAutoFeatures?: () => void;
  onOpenWorkMode?: () => void;
  floatingMiniVisible?: boolean;
  onToggleFloatingMini?: () => void;
  autoFeatures?: AutoFeaturesSettings;
  coreCustomization?: CoreCustomization;
  onSpeakMessage?: (text: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  character,
  onSwitchCompanion,
  expression,
  isSpeaking,
  isListening,
  isThinking,
  userName,
  messages = [],
  avatarSize = 'md',
  onChangeAvatarSize,
  onSendMessage,
  onOpenChat,
  onOpenVoice,
  onOpenVoiceSettings,
  onOpenDrawer,
  hasGeminiKey,
  onToggleVoice,
  isAutoVoiceActive = false,
  onHoldToTalkStart,
  onHoldToTalkEnd,
  lastVoiceTranscript = '',
  onCancelVoice,
  recognitionState = 'idle',
  micErrorMessage,
  onClearMicError,
  onOpenStudio,
  onOpenMemory,
  onOpenBackgrounds,
  onOpenSettings,
  onOpenProfile,
  onOpenTools,
  onOpenPersonality,
  onOpenAutoFeatures,
  onOpenWorkMode,
  floatingMiniVisible = false,
  onToggleFloatingMini,
  autoFeatures,
  coreCustomization,
  onSpeakMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const isJarvis = character === 'jarvis';
  const safeMessages = Array.isArray(messages) ? messages : [];
  const companionMessages = safeMessages.filter(
    (m) => m && (m.role === 'user' || m.role === character || m.role === 'companion')
  );
  const recentMessages = companionMessages.slice(-5);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [recentMessages.length, isThinking]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
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

      {/* TOP HEADER */}
      <div className="relative z-20 w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-6 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
        <div className="w-full flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenDrawer}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/45 border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-md"
              title="Open Menu"
            >
              <Menu size={17} />
            </button>

            {onOpenWorkMode && (
              <button
                type="button"
                onClick={onOpenWorkMode}
                className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                  isJarvis
                    ? 'border-cyan-500/25 hover:border-cyan-400 text-cyan-200'
                    : 'border-pink-500/25 hover:border-pink-400 text-pink-200'
                }`}
                title="Open Work Mode"
              >
                <Briefcase size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span className="text-[10px] font-semibold">Work</span>
              </button>
            )}
          </div>

          <div className="text-center flex flex-col items-center min-w-0">
            <h1
              className={`text-base sm:text-lg font-bold tracking-wide font-comfortaa flex items-center gap-1 ${
                isJarvis
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-cyan-300 to-blue-400 drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-purple-300 drop-shadow-[0_0_12px_rgba(255,38,159,0.4)]'
              }`}
            >
              {isJarvis ? <span>⚡ Jarvis</span> : <span>Alya 🌸</span>}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider font-medium leading-tight">
              {isJarvis ? 'Intelligent AI Assistant' : 'Personal AI Companion'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {onToggleFloatingMini && (
              <button
                type="button"
                onClick={onToggleFloatingMini}
                className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                  floatingMiniVisible
                    ? 'border-emerald-400/70 bg-emerald-950/40 text-emerald-200'
                    : 'border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Toggle Mini Floating Avatar"
              >
                <Layers size={13} className={floatingMiniVisible ? 'text-emerald-400' : 'text-slate-400'} />
                <span className="text-[10px] font-semibold hidden sm:inline">Mini</span>
              </button>
            )}

            {onOpenAutoFeatures && (
              <button
                type="button"
                onClick={onOpenAutoFeatures}
                className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                  autoFeatures?.autoListen
                    ? isJarvis
                      ? 'border-cyan-400/80 bg-cyan-950/40 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                      : 'border-pink-400/80 bg-pink-950/40 text-pink-200 shadow-[0_0_12px_rgba(255,38,159,0.3)]'
                    : 'border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Auto Features Menu (Auto Mic, Auto Listen, Auto Reply, Auto TTS)"
              >
                <Sliders size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span className="text-[10px] font-semibold hidden sm:inline">Auto</span>
                {autoFeatures?.autoListen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenStudio || onOpenVoiceSettings}
              className={`h-8 px-2 rounded-xl bg-black/45 border backdrop-blur-md flex items-center gap-1 transition-all active:scale-95 shadow-md ${
                isJarvis
                  ? 'border-cyan-500/25 hover:border-cyan-400 text-cyan-200'
                  : 'border-pink-500/25 hover:border-pink-400 text-pink-200'
              }`}
              title="AI Core Studio & Customizer"
            >
              <Palette size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
              <span className="text-[10px] font-semibold hidden sm:inline">Studio</span>
            </button>

            <button
              type="button"
              onClick={onOpenProfile || onOpenDrawer}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/45 border border-white/10 hover:border-white/25 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 shadow-md ${
                isJarvis ? 'hover:border-cyan-400/40 text-cyan-300' : 'hover:border-pink-400/40 text-pink-300'
              }`}
              title="User Profile"
            >
              <User size={15} />
            </button>
          </div>
        </div>

        {/* Companion Toggle Pill */}
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
      </div>

      {/* CENTER STAGE: 3D HOLOGRAPHIC CORE */}
      <div className="relative z-10 flex-1 min-h-[140px] w-full max-w-4xl lg:max-w-5xl mx-auto flex flex-col items-center justify-center px-2 sm:px-6 overflow-hidden my-0.5">
        <HolographicAvatar
          character={character}
          expression={expression}
          isSpeaking={isSpeaking}
          isListening={isListening}
          isThinking={isThinking}
          size="lg"
          onTap={onToggleVoice}
          customColor={activeColor}
          stylePreset={activeStyle}
          particleStyle={activeParticle}
          showPedestal={true}
          userName={userName}
          className="w-full h-full"
        />
      </div>

      {/* TRANSPARENT SCROLLABLE LIVE CHAT BOX (HUD STREAM) */}
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto px-2.5 sm:px-6 mb-1.5 z-20 shrink-0">
        <div
          className={`relative rounded-2xl border backdrop-blur-xl p-2 sm:p-2.5 shadow-xl transition-all duration-300 overflow-hidden ${
            isJarvis
              ? 'bg-gradient-to-b from-[#081326]/85 via-[#040b17]/90 to-[#02050c]/95 border-cyan-500/30 shadow-[0_6px_24px_rgba(0,0,0,0.75),0_0_16px_rgba(0,229,255,0.12),inset_0_1px_1px_rgba(255,255,255,0.12)]'
              : 'bg-gradient-to-b from-[#140827]/85 via-[#0c0419]/90 to-[#070210]/95 border-pink-500/30 shadow-[0_6px_24px_rgba(0,0,0,0.75),0_0_18px_rgba(255,38,159,0.14),inset_0_1px_1px_rgba(255,255,255,0.12)]'
          }`}
        >
          {/* Top Hairline Glowing Specular Accent */}
          <div
            className={`absolute top-0 inset-x-8 sm:inset-x-16 h-[1px] pointer-events-none ${
              isJarvis
                ? 'bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent'
                : 'bg-gradient-to-r from-transparent via-pink-400/60 to-transparent'
            }`}
          />

          {/* Header Row */}
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.08] mb-1 text-[10px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isListening
                    ? 'bg-rose-400 animate-ping'
                    : isThinking
                    ? 'bg-amber-400 animate-pulse'
                    : isJarvis
                    ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.8)]'
                    : 'bg-pink-400 shadow-[0_0_6px_rgba(255,38,159,0.8)]'
                }`}
              />
              <span className={`font-bold ${isJarvis ? 'text-cyan-300' : 'text-pink-300'}`}>
                {isJarvis ? '⚡ Jarvis Live HUD' : '🌸 Alya Live Stream'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider opacity-60 hidden sm:inline">
                // SYS.STREAM
              </span>
              {autoFeatures?.autoListen && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                  Hands-Free
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenChat}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer group text-[10px] font-medium border border-white/5 ${
                isJarvis
                  ? 'hover:border-cyan-400/40 hover:bg-cyan-950/40'
                  : 'hover:border-pink-400/40 hover:bg-pink-950/40'
              }`}
              title="Open Full Chat Screen"
            >
              <span>Full Chat</span>
              <ChevronRight
                size={11}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </div>

          {/* Live Scrollable Messages */}
          <div
            ref={chatScrollRef}
            className="max-h-[64px] sm:max-h-[84px] overflow-y-auto space-y-1 pr-1 cursor-pointer"
            onClick={onOpenChat}
          >
            {recentMessages.length === 0 ? (
              <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-slate-400 font-quicksand">
                <Sparkles size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span>
                  {isJarvis
                    ? 'Say something or ask Jarvis anything...'
                    : 'Say hi or ask Alya anything! 🌸'}
                </span>
              </div>
            ) : (
              recentMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} text-xs`}
                  >
                    <div
                      className={`px-2.5 py-1 rounded-xl max-w-[92%] leading-snug transition-all shadow-sm ${
                        msg.isError
                          ? 'bg-rose-950/70 text-rose-200 border border-rose-500/40'
                          : isUser
                          ? isJarvis
                            ? 'bg-gradient-to-r from-cyan-950/70 to-blue-950/70 text-cyan-100 border border-cyan-500/35'
                            : 'bg-gradient-to-r from-pink-950/70 to-purple-950/70 text-pink-100 border border-pink-500/35'
                          : 'bg-white/[0.08] text-slate-100 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5 text-[9px] font-bold opacity-80">
                        <div className="flex items-center gap-1">
                          <span className={isUser ? '' : isJarvis ? 'text-cyan-300' : 'text-pink-300'}>
                            {isUser ? 'You' : isJarvis ? '⚡ Jarvis' : '🌸 Alya'}
                          </span>
                          <span className="opacity-50 font-mono text-[8px]">{msg.timestamp}</span>
                        </div>
                        {!isUser && onSpeakMessage && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSpeakMessage(msg.text);
                            }}
                            className="p-0.5 text-slate-400 hover:text-pink-300 transition-colors cursor-pointer"
                            title="Listen / Replay speech"
                          >
                            <Volume2 size={11} />
                          </button>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}

            {isThinking && (
              <div className="flex items-center gap-2 text-[11px] text-slate-300 italic py-0.5 px-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                    isJarvis ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]' : 'bg-pink-400 shadow-[0_0_8px_rgba(255,38,159,0.8)]'
                  }`}
                />
                <span className={isJarvis ? 'text-cyan-200' : 'text-pink-200'}>
                  {isJarvis ? 'Jarvis is formulating response...' : 'Alya is thinking...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM DOCK & SYSTEM CONTROLS (WITH SAFE-AREA INSETS) */}
      <div className="relative z-20 w-full max-w-3xl lg:max-w-4xl mx-auto px-2.5 sm:px-6 pb-[max(0.45rem,calc(env(safe-area-inset-bottom,0px)+0.35rem))] pt-0 flex flex-col gap-1.5 shrink-0">
        {/* Active Speech Recognition Banner */}
        {isListening && (
          <div
            className={`p-2 rounded-2xl border flex items-center justify-between shadow-xl animate-fadeIn backdrop-blur-xl ${
              isJarvis
                ? 'bg-gradient-to-r from-cyan-950/95 via-[#08182d]/95 to-cyan-950/95 border-cyan-400 text-cyan-200'
                : 'bg-gradient-to-r from-pink-950/95 via-[#230922]/95 to-pink-950/95 border-pink-400 text-pink-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-1 truncate mr-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
              <div className="truncate">
                <div className="text-[9px] font-black uppercase tracking-wider text-rose-300">
                  {isAutoVoiceActive ? 'Auto Voice: Listening...' : 'Listening to your voice...'}
                </div>
                <div className="text-[11px] truncate font-medium text-white">
                  {lastVoiceTranscript || 'Speak naturally now...'}
                </div>
              </div>
            </div>
            {onCancelVoice && (
              <button
                type="button"
                onClick={onCancelVoice}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 cursor-pointer active:scale-95"
                title="Cancel Voice Input"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Microphone Error Warning Banner */}
        {micErrorMessage && (
          <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-amber-950/85 border border-amber-500/40 text-amber-200 backdrop-blur-xl gap-2 shadow-lg">
            <span className="text-[11px] leading-snug break-words flex-1">{micErrorMessage}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleVoice}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline py-0.5 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              >
                Retry
              </button>
              {onClearMicError && (
                <button
                  type="button"
                  onClick={onClearMicError}
                  className="text-slate-400 hover:text-slate-200 text-sm font-bold w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected Image Attachment Preview */}
        {selectedImage && (
          <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-[#120824]/90 border border-pink-500/30 backdrop-blur-xl w-fit shadow-lg animate-fadeIn">
            <img src={selectedImage} alt="Attachment" className="w-7 h-7 rounded-lg object-cover border border-white/20" />
            <span className="text-[10px] font-medium text-pink-200">Image attached</span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            >
              <X size={11} />
            </button>
          </div>
        )}

        {/* Futuristic System Navigation Bar */}
        <FuturisticBottomBar
          isJarvis={isJarvis}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isThinking={isThinking}
          isAutoVoiceActive={isAutoVoiceActive}
          onToggleVoice={onToggleVoice}
          onHoldToTalkStart={onHoldToTalkStart}
          onHoldToTalkEnd={onHoldToTalkEnd}
          onAttachImage={() => fileInputRef.current?.click()}
          onOpenChat={onOpenChat}
          onOpenVoice={onOpenVoice}
          onOpenStudio={onOpenStudio}
          onOpenDrawer={onOpenDrawer}
        />

        {/* Message Input Field Below Navigation Bar */}
        <form
          onSubmit={handleSend}
          className={`relative w-full max-w-xl mx-auto rounded-full p-1 pl-3.5 flex items-center gap-1.5 border backdrop-blur-xl shadow-xl transition-all duration-300 focus-within:ring-2 ${
            isJarvis
              ? 'bg-gradient-to-r from-[#081326]/90 via-[#040b17]/95 to-[#081326]/90 border-cyan-500/35 focus-within:ring-cyan-500/40 focus-within:border-cyan-400 shadow-[0_6px_24px_rgba(0,0,0,0.75),0_0_16px_rgba(0,229,255,0.15)]'
              : 'bg-gradient-to-r from-[#140827]/90 via-[#0c0419]/95 to-[#140827]/90 border-pink-500/35 focus-within:ring-pink-500/40 focus-within:border-pink-400 shadow-[0_6px_24px_rgba(0,0,0,0.75),0_0_18px_rgba(255,38,159,0.16)]'
          }`}
        >
          {/* Subtle Top Specular Hairline */}
          <div
            className={`absolute top-0 inset-x-8 h-[1px] pointer-events-none ${
              isJarvis
                ? 'bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent'
                : 'bg-gradient-to-r from-transparent via-pink-400/40 to-transparent'
            }`}
          />

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${isJarvis ? 'Jarvis' : 'Alya'}...`}
            className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none py-1 selection:bg-pink-500 selection:text-white"
          />

          <div className="flex items-center gap-1 pr-0.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isJarvis
                  ? 'text-cyan-300/80 hover:text-white hover:bg-cyan-500/20'
                  : 'text-pink-300/80 hover:text-white hover:bg-pink-500/20'
              }`}
              title="Attach Image"
              aria-label="Attach Image"
            >
              <ImageIcon size={15} />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() && !selectedImage}
              aria-label="Send message"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                inputText.trim() || selectedImage
                  ? isJarvis
                    ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white font-bold shadow-[0_0_14px_rgba(0,229,255,0.65)] active:scale-95 cursor-pointer'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold shadow-[0_0_14px_rgba(255,38,159,0.65)] active:scale-95 cursor-pointer'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
