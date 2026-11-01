import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Trash2,
  Volume2,
  VolumeX,
  RotateCw,
  Phone,
  CheckCheck,
  LifeBuoy,
  CheckCircle2,
} from 'lucide-react';
import { ChatMessage, ExpressionType, CompanionCharacter, RecognitionState } from '../../types';

interface ChatScreenProps {
  messages: ChatMessage[];
  isThinking: boolean;
  isStreaming: boolean;
  isListening: boolean;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
  onSendMessage: (text: string, imageAttachment?: string) => void;
  onToggleVoice: () => void;
  onStartVoiceCall: () => void;
  onClearChat: () => void;
  onSpeakMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  character?: CompanionCharacter;
  recognitionState?: RecognitionState;
  micErrorMessage?: string | null;
  onClearMicError?: () => void;
  userName?: string;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  isThinking,
  isStreaming,
  isListening,
  isSpeaking = false,
  onStopSpeaking,
  onSendMessage,
  onToggleVoice,
  onStartVoiceCall,
  onClearChat,
  onSpeakMessage,
  onRetryLastMessage,
  character = 'alya',
  recognitionState = 'idle',
  micErrorMessage,
  onClearMicError,
  userName = 'Gamingfire',
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportReason, setSupportReason] = useState('');
  const [supportConsent, setSupportConsent] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSubmittedToast, setSupportSubmittedToast] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isJarvis = character === 'jarvis';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText.trim(), selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getEmotionBadge = (emotion?: ExpressionType) => {
    if (!emotion || emotion === 'normal') return null;
    const emojiMap: Record<ExpressionType, string> = {
      normal: '✨',
      happy: '😊 Happy',
      laughing: '😄 Laughing',
      shy: '🙈 Shy',
      curious: '🤔 Curious',
      thinking: '💭 Thinking',
      surprised: '😲 Surprised',
      calm: '😌 Calm',
      concerned: '💖 Caring',
    };
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1 font-medium">
        {emojiMap[emotion] || emotion}
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md">
      {/* Chat Header Actions Bar */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between glass-panel-subtle z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full p-[1.5px] ${
              isJarvis
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-tr from-pink-500 to-purple-500 shadow-[0_0_8px_rgba(244,114,182,0.4)]'
            }`}
          >
            <div className="w-full h-full rounded-full bg-[#1b1427] flex items-center justify-center">
              <span className={`text-xs font-bold ${isJarvis ? 'text-amber-300' : 'text-pink-300'}`}>
                {isJarvis ? '⚡' : 'A'}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-white">{isJarvis ? 'Jarvis' : 'Alya'}</span>
              <span className={`text-xs ${isJarvis ? 'text-amber-400' : 'text-pink-400'}`}>
                {isJarvis ? '⚡' : '🌸'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live AI Connected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500 text-rose-300 text-xs font-semibold flex items-center gap-1 shadow-sm animate-pulse hover:bg-rose-500/30 active:scale-95 transition-all"
              title="Stop audio playback"
            >
              <VolumeX size={13} />
              <span>Stop</span>
            </button>
          )}
          <button
            onClick={onStartVoiceCall}
            className={`w-8 h-8 rounded-full glass-panel-subtle flex items-center justify-center active:scale-95 transition-all ${
              isJarvis ? 'text-amber-300 hover:bg-amber-500/20' : 'text-pink-300 hover:bg-pink-500/20'
            }`}
            title="Start voice call"
          >
            <Phone size={15} />
          </button>
          <button
            onClick={onRetryLastMessage}
            className="w-8 h-8 rounded-full glass-panel-subtle flex items-center justify-center text-slate-300 hover:text-white hover:bg-purple-500/20 active:scale-95 transition-all"
            title="Retry last response"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={() => {
              setShowSupportModal(true);
              setSupportReason('');
              setSupportConsent(false);
            }}
            className="w-8 h-8 rounded-full glass-panel-subtle flex items-center justify-center text-slate-400 hover:text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all"
            title="Submit conversation to support for review"
          >
            <LifeBuoy size={14} />
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-8 h-8 rounded-full glass-panel-subtle flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
            title="Clear conversation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {supportSubmittedToast && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between z-20 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{supportSubmittedToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSupportSubmittedToast(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {showSupportModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-card border border-purple-500/30 p-4 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <LifeBuoy size={16} className="text-purple-400" />
                <span>Submit Conversation for Support</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your conversations are private. By submitting, only this snippet ({messages.length} messages) will be shared for diagnostics.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                What issue are you experiencing?
              </label>
              <textarea
                value={supportReason}
                onChange={(e) => setSupportReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={2}
                className="w-full p-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
              />
            </div>
            <label className="flex items-start gap-2 p-2 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={supportConsent}
                onChange={(e) => setSupportConsent(e.target.checked)}
                className="accent-purple-500 w-4 h-4 mt-0.5"
              />
              <span className="text-[10px] text-slate-300 leading-tight">
                I explicitly consent to submitting this chat snippet for support review.
              </span>
            </label>
            {supportError && (
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-[11px] text-rose-200">
                {supportError}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSupportError(null);
                  setShowSupportModal(false);
                }}
                className="flex-1 py-2 rounded-xl glass-panel text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!supportConsent || !supportReason.trim() || isSubmittingSupport}
                onClick={async () => {
                  setIsSubmittingSupport(true);
                  setSupportError(null);
                  try {
                    const anonymousUserId = localStorage.getItem('alya_client_usr_id') || 'usr_anonymous';
                    const res = await fetch('/api/support/submit-ticket', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: anonymousUserId,
                        userName: userName || 'Gamingfire',
                        companion: character,
                        reason: supportReason.trim(),
                        messages: messages.slice(-10).map((m) => ({
                          role: m.role,
                          text: m.text,
                          timestamp: m.timestamp,
                        })),
                      }),
                    });
                    const data = await res.json();
                    setIsSubmittingSupport(false);
                    if (res.ok && data.success) {
                      setShowSupportModal(false);
                      setSupportReason('');
                      setSupportSubmittedToast(`Support ticket #${data.ticketId} submitted.`);
                      setTimeout(() => setSupportSubmittedToast(null), 6000);
                    } else {
                      setSupportError(data.error || 'Unable to submit support ticket. Please try again.');
                    }
                  } catch {
                    setIsSubmittingSupport(false);
                    setSupportError('Unable to submit support ticket. Please check your connection.');
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold text-white shadow-md transition-all"
              >
                {isSubmittingSupport ? 'Submitting...' : 'Submit to Support'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs glass-panel border border-white/20 p-4 rounded-2xl shadow-2xl space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-comfortaa">
                Clear {isJarvis ? 'Jarvis' : 'Alya'} Chat?
              </h3>
              <p className="text-[11px] text-slate-300 mt-1">
                This will clear the current conversation for {isJarvis ? 'Jarvis' : 'Alya'}.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl glass-panel hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearChat();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {(messages || []).map((msg) => {
          const isCompanion = msg.role === 'alya' || msg.role === 'jarvis' || msg.role === 'companion';
          const isMsgJarvis = msg.role === 'jarvis';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCompanion ? 'items-start' : 'items-end'} animate-fadeIn`}
            >
              <div className="flex items-end gap-2 max-w-[85%]">
                {isCompanion && (
                  <div
                    className={`w-7 h-7 rounded-full p-[1px] flex-shrink-0 mb-1 ${
                      isMsgJarvis
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-500'
                        : 'bg-gradient-to-tr from-pink-500 to-purple-500'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-[#1b1427] flex items-center justify-center text-[10px] font-bold">
                      {isMsgJarvis ? (
                        <span className="text-amber-300">⚡</span>
                      ) : (
                        <span className="text-pink-300">🌸</span>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-md relative group ${
                    msg.isError
                      ? 'bg-rose-950/60 border border-rose-500/40 text-rose-100 rounded-bl-sm'
                      : isCompanion
                      ? isMsgJarvis
                        ? 'glass-card text-slate-100 border border-amber-500/30 rounded-bl-sm'
                        : 'glass-card text-slate-100 border border-pink-500/25 rounded-bl-sm'
                      : isJarvis
                      ? 'bg-gradient-to-tr from-amber-700/80 via-yellow-600/80 to-amber-600/80 text-white rounded-br-sm border border-amber-400/30'
                      : 'bg-gradient-to-tr from-purple-800/80 via-pink-700/80 to-rose-600/80 text-white rounded-br-sm border border-pink-400/30'
                  }`}
                >
                  {isCompanion && !msg.isError && msg.emotion && (
                    <div className="mb-1.5 flex items-center gap-1">
                      {getEmotionBadge(msg.emotion)}
                    </div>
                  )}
                  {msg.imageAttachment && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 max-h-48">
                      <img
                        src={msg.imageAttachment}
                        alt="attachment"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <p className="text-sm font-quicksand leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                    {msg.isStreaming && (
                      <span
                        className={`inline-block w-1.5 h-4 ml-1 animate-pulse ${
                          isMsgJarvis ? 'bg-amber-400' : 'bg-pink-400'
                        }`}
                      />
                    )}
                  </p>
                  <div
                    className={`mt-1.5 flex items-center justify-between text-[10px] gap-2 ${
                      msg.isError
                        ? 'text-rose-300'
                        : isCompanion
                        ? 'text-slate-400'
                        : isJarvis
                        ? 'text-amber-200'
                        : 'text-pink-200'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      {msg.isError && (
                        <button
                          type="button"
                          onClick={onRetryLastMessage}
                          className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/40 text-rose-200 hover:text-white hover:bg-rose-500/40 text-[11px] font-semibold transition-all active:scale-95"
                          title="Retry generating response"
                        >
                          <RotateCw size={11} />
                          <span>Retry</span>
                        </button>
                      )}
                      {isCompanion && !msg.isError && (
                        <button
                          onClick={() => {
                            if (isSpeaking) {
                              onStopSpeaking?.();
                            } else {
                              onSpeakMessage(msg.text);
                            }
                          }}
                          className={`p-1 rounded-full transition-all ${
                            isSpeaking
                              ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 animate-pulse'
                              : isMsgJarvis
                              ? 'opacity-75 hover:opacity-100 hover:text-amber-300'
                              : 'opacity-75 hover:opacity-100 hover:text-pink-300'
                          }`}
                          title={isSpeaking ? 'Stop speaking' : 'Read aloud with AI voice'}
                        >
                          {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>
                      )}
                      {!isCompanion && <CheckCheck size={12} className={isJarvis ? 'text-amber-200' : 'text-pink-200'} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border ${
                isJarvis
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  : 'bg-pink-500/20 border-pink-500/30 text-pink-300'
              }`}
            >
              {isJarvis ? '⚡' : '🌸'}
            </div>
            <div
              className={`glass-panel rounded-2xl px-4 py-2.5 border flex items-center gap-1.5 ${
                isJarvis ? 'border-amber-500/20' : 'border-pink-500/20'
              }`}
            >
              <span className={`text-xs font-medium ${isJarvis ? 'text-amber-300' : 'text-pink-300'}`}>
                {isJarvis ? 'Jarvis is processing' : 'Alya is thinking'}
              </span>
              <div className="flex items-center gap-1 ml-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                    isJarvis ? 'bg-amber-400' : 'bg-pink-400'
                  }`}
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                    isJarvis ? 'bg-amber-400' : 'bg-pink-400'
                  }`}
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-bounce ${
                    isJarvis ? 'bg-amber-400' : 'bg-pink-400'
                  }`}
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {selectedImage && (
        <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex items-center gap-3">
          <div
            className={`relative w-14 h-14 rounded-lg overflow-hidden border ${
              isJarvis ? 'border-amber-500/40' : 'border-pink-500/40'
            }`}
          >
            <img src={selectedImage} alt="selected" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 text-xs text-slate-300 truncate">
            Photo ready for {isJarvis ? 'Jarvis' : 'Alya'} to inspect
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="text-xs text-rose-400 hover:text-rose-300"
          >
            Remove
          </button>
        </div>
      )}

      {micErrorMessage && (
        <div className="px-4 py-2 bg-amber-950/80 border-t border-amber-500/35 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md gap-2">
          <span className="text-[11px] leading-snug break-words flex-1">{micErrorMessage}</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleVoice}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline py-0.5 px-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
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

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-white/10 glass-panel flex items-center gap-2 z-10"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-9 h-9 rounded-full glass-panel-subtle flex items-center justify-center text-slate-300 transition-colors ${
            isJarvis ? 'hover:text-amber-300 hover:bg-amber-500/20' : 'hover:text-pink-300 hover:bg-pink-500/20'
          }`}
          title="Attach image"
        >
          <Paperclip size={16} />
        </button>
        <button
          type="button"
          onClick={onToggleVoice}
          disabled={recognitionState === 'starting' || recognitionState === 'stopping'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            recognitionState === 'starting' || recognitionState === 'stopping'
              ? 'opacity-60 cursor-wait'
              : isListening
              ? 'bg-rose-500 text-white shadow-[0_0_12px_#f43f5e] animate-pulse'
              : isJarvis
              ? 'glass-panel-subtle text-slate-300 hover:text-amber-300'
              : 'glass-panel-subtle text-slate-300 hover:text-pink-300'
          }`}
          title={isListening ? 'Stop listening' : 'Voice input'}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Message ${isJarvis ? 'Jarvis' : 'Alya'}...`}
          className={`flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400/80 focus:outline-none font-quicksand ${
            isJarvis ? 'focus:border-amber-500/50' : 'focus:border-pink-500/50'
          }`}
        />
        <button
          type="submit"
          disabled={!inputText.trim() && !selectedImage}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            inputText.trim() || selectedImage
              ? isJarvis
                ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.6)] active:scale-95'
                : 'bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-[0_0_15px_rgba(244,114,182,0.6)] active:scale-95'
              : 'bg-white/10 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
