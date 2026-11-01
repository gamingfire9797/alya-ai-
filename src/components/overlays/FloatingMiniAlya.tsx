import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Maximize2,
  Mic,
  MicOff,
  Pause,
  Scan,
  AlertCircle,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { CompanionCharacter, RecognitionState } from '../../types';
import { LiveAudioWave } from '../character/LiveAudioWave';

interface FloatingMiniAlyaProps {
  visible: boolean;
  character?: CompanionCharacter;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  recognitionState?: RecognitionState;
  micErrorMessage?: string | null;
  lastTranscript?: string;
  alyaReply?: string;
  backgroundServiceActive?: boolean;
  onToggleVoice?: () => void;
  onPauseService?: () => void;
  onInspectScreen?: () => void;
  onOpenApp: () => void;
  onClose: () => void;
}

export const FloatingMiniAlya: React.FC<FloatingMiniAlyaProps> = ({
  visible,
  character = 'alya',
  isSpeaking,
  isListening,
  isThinking = false,
  recognitionState = 'idle',
  micErrorMessage = null,
  lastTranscript = '',
  alyaReply = '',
  backgroundServiceActive = false,
  onToggleVoice,
  onPauseService,
  onInspectScreen,
  onOpenApp,
  onClose,
}) => {
  const [position, setPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(12, window.innerWidth - 82) : 16,
    y: 130,
  }));
  const [isExpandedCard, setIsExpandedCard] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [voiceDetectedPulse, setVoiceDetectedPulse] = useState(false);
  const [mouthOpenFrame, setMouthOpenFrame] = useState(0);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    moved: boolean;
  } | null>(null);

  const isJarvis = character === 'jarvis';
  const isError = recognitionState === 'error' || Boolean(micErrorMessage);

  // Determine exact real-time avatar animation state from actual mic, processing, and playback state
  const avatarState: 'listening' | 'thinking' | 'speaking' | 'error' | 'idle' = isError
    ? 'error'
    : isSpeaking
    ? 'speaking'
    : isThinking
    ? 'thinking'
    : isListening
    ? 'listening'
    : 'idle';

  // Occasional subtle blink in Idle & Listening states (lightweight timer, zero CPU load)
  useEffect(() => {
    if (!visible) return;
    const intervalMs = avatarState === 'listening' ? 3200 : 4200;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, intervalMs);
    return () => clearInterval(blinkInterval);
  }, [visible, avatarState]);

  // Gentle visual response when user's voice transcript updates during listening
  useEffect(() => {
    if (isListening && lastTranscript) {
      setVoiceDetectedPulse(true);
      const t = setTimeout(() => setVoiceDetectedPulse(false), 450);
      return () => clearTimeout(t);
    }
    setVoiceDetectedPulse(false);
  }, [isListening, lastTranscript]);

  // Mouth animation active strictly while speech playback is running
  useEffect(() => {
    if (!visible || !isSpeaking) {
      setMouthOpenFrame(0);
      return;
    }
    const mouthTimer = setInterval(() => {
      setMouthOpenFrame((prev) => (prev + 1) % 3);
    }, 150);
    return () => clearInterval(mouthTimer);
  }, [visible, isSpeaking]);

  // Snap to nearest horizontal screen edge on drag release so normal Android apps are never covered
  const snapToEdge = (currentX: number, currentY: number) => {
    if (typeof window === 'undefined') return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const widgetWidth = 68;
    const snapLeft = currentX + widgetWidth / 2 < screenW / 2;
    const targetX = snapLeft ? 12 : Math.max(12, screenW - widgetWidth - 12);
    const targetY = Math.max(56, Math.min(screenH - 110, currentY));
    setPosition({ x: targetX, y: targetY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
      moved: false,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.moved = true;
      }
      const nextX = Math.max(8, Math.min(window.innerWidth - 76, dragRef.current.initX + dx));
      const nextY = Math.max(48, Math.min(window.innerHeight - 96, dragRef.current.initY + dy));
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      const wasMoved = dragRef.current?.moved;
      setIsDragging(false);
      dragRef.current = null;
      if (wasMoved) {
        snapToEdge(position.x, position.y);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position.x, position.y]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      dragRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        initX: position.x,
        initY: position.y,
        moved: false,
      };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragRef.current.startX;
    const dy = touch.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.moved = true;
    }
    const nextX = Math.max(8, Math.min(window.innerWidth - 76, dragRef.current.initX + dx));
    const nextY = Math.max(48, Math.min(window.innerHeight - 96, dragRef.current.initY + dy));
    setPosition({ x: nextX, y: nextY });
  };

  const handleTouchEnd = () => {
    const wasMoved = dragRef.current?.moved;
    setIsDragging(false);
    dragRef.current = null;
    if (wasMoved) {
      snapToEdge(position.x, position.y);
    }
  };

  const handleAvatarTap = () => {
    if (dragRef.current?.moved) return;
    setIsExpandedCard((prev) => !prev);
  };

  if (!visible) return null;

  const isOnRightHalf = typeof window !== 'undefined' ? position.x > window.innerWidth / 2 : true;

  // State-driven border & glow styling
  const stateGlowClass =
    avatarState === 'listening'
      ? voiceDetectedPulse
        ? 'border-pink-400 shadow-[0_0_26px_rgba(244,114,182,0.95)] scale-105'
        : 'border-pink-400/85 shadow-[0_0_18px_rgba(244,114,182,0.65)] animate-pulse'
      : avatarState === 'speaking'
      ? 'border-fuchsia-400 shadow-[0_0_24px_rgba(192,38,211,0.85)]'
      : avatarState === 'thinking'
      ? 'border-amber-400/85 shadow-[0_0_18px_rgba(245,158,11,0.65)] animate-pulse'
      : avatarState === 'error'
      ? 'border-rose-500/90 shadow-[0_0_16px_rgba(244,63,94,0.7)]'
      : isJarvis
      ? 'border-cyan-500/50 shadow-[0_6px_22px_rgba(0,229,255,0.3)]'
      : 'border-pink-500/50 shadow-[0_6px_22px_rgba(244,114,182,0.32)]';

  const statusLabel =
    avatarState === 'speaking'
      ? 'Speaking'
      : avatarState === 'listening'
      ? voiceDetectedPulse
        ? 'Hearing you...'
        : 'Listening'
      : avatarState === 'thinking'
      ? 'Thinking...'
      : avatarState === 'error'
      ? 'Mic Alert'
      : 'Idle';

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed z-50 select-none touch-none"
    >
      <div className="relative flex items-start gap-2.5">
        {/* Compact rounded-square Floating Alya Avatar Widget */}
        <div
          onClick={handleAvatarTap}
          role="button"
          tabIndex={0}
          aria-label="Floating Alya Companion Widget"
          title="Tap to open compact voice controls, drag to reposition"
          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1d0f2f]/95 via-[#120920]/95 to-[#090411]/98 backdrop-blur-xl border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200 ${stateGlowClass}`}
        >
          {/* Subtle top specular reflection */}
          <div className="absolute top-1 inset-x-2.5 h-2 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

          {/* Active Listening Radar Ring */}
          {avatarState === 'listening' && (
            <span
              className={`absolute -inset-1.5 rounded-2xl border border-pink-400/50 pointer-events-none ${
                voiceDetectedPulse ? 'animate-ping opacity-80' : 'opacity-45'
              }`}
            />
          )}

          {/* Thinking Slow Orbital Ring */}
          {avatarState === 'thinking' && (
            <span className="absolute -inset-1 rounded-2xl border border-dashed border-amber-400/70 animate-spin pointer-events-none" />
          )}

          {/* Lightweight Anime-Inspired Expressive Face SVG */}
          <svg
            viewBox="0 0 64 64"
            className={`w-12 h-12 transition-transform duration-300 ${
              avatarState === 'speaking'
                ? 'scale-105'
                : avatarState === 'idle'
                ? 'translate-y-[0.5px]'
                : ''
            }`}
          >
            <defs>
              <radialGradient id="alyaFaceAura" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor={isJarvis ? '#67e8f9' : '#ff94c9'} stopOpacity="0.45" />
                <stop offset="65%" stopColor={isJarvis ? '#0284c7' : '#c026d3'} stopOpacity="0.2" />
                <stop offset="100%" stopColor="#090411" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="alyaHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isJarvis ? '#38bdf8' : '#fbcfe8'} />
                <stop offset="50%" stopColor={isJarvis ? '#0284c7' : '#f472b6'} />
                <stop offset="100%" stopColor={isJarvis ? '#1e3a8a' : '#a855f7'} />
              </linearGradient>
            </defs>

            {/* Soft Background Halo */}
            <circle cx="32" cy="32" r="28" fill="url(#alyaFaceAura)" />

            {/* Anime Hair Silhouette & Side Locks */}
            <path
              d="M14 28 C14 14 22 9 32 9 C42 9 50 14 50 28 C51 37 49 46 46 51 C45 43 45 36 44 31 C40 24 36 21 32 21 C28 21 24 24 20 31 C19 36 19 43 18 51 C15 46 13 37 14 28 Z"
              fill="url(#alyaHairGrad)"
              opacity="0.92"
            />

            {/* Soft Anime Face Contour */}
            <path
              d="M20 26 C20 19 25 16 32 16 C39 16 44 19 44 26 C44 36 39 45 32 46 C25 45 20 36 20 26 Z"
              fill="#241536"
              stroke={isJarvis ? '#38bdf8' : '#f472b6'}
              strokeWidth="1.2"
            />

            {/* Anime Bangs */}
            <path
              d="M19 25 C22 18 27 22 32 17 C37 22 42 18 45 25 C41 21 36 20 32 23 C28 20 23 21 19 25 Z"
              fill="url(#alyaHairGrad)"
            />

            {/* Left & Right Expressive Anime Eyes (Blinks naturally in Idle/Listening) */}
            {isBlinking ? (
              <>
                <path d="M23 31 Q26 33 29 31" stroke="#fbcfe8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M35 31 Q38 33 41 31" stroke="#fbcfe8" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                {/* Left Eye */}
                <ellipse cx="26" cy="31" rx="2.8" ry="3.2" fill={isJarvis ? '#38bdf8' : '#ec4899'} />
                <circle cx="25.2" cy="29.8" r="1.1" fill="#ffffff" />
                {/* Right Eye */}
                <ellipse cx="38" cy="31" rx="2.8" ry="3.2" fill={isJarvis ? '#38bdf8' : '#ec4899'} />
                <circle cx="37.2" cy="29.8" r="1.1" fill="#ffffff" />
              </>
            )}

            {/* Soft Anime Cheek Blush */}
            {!isJarvis && (
              <>
                <ellipse cx="22.5" cy="35" rx="2.2" ry="1" fill="#fb7185" opacity="0.45" />
                <ellipse cx="41.5" cy="35" rx="2.2" ry="1" fill="#fb7185" opacity="0.45" />
              </>
            )}

            {/* Mouth Animation: Synchronized strictly with Speaking / Listening / Error states */}
            {avatarState === 'speaking' ? (
              mouthOpenFrame === 1 ? (
                <ellipse cx="32" cy="39" rx="3.2" ry="2.6" fill="#fb7185" stroke="#ffffff" strokeWidth="0.6" />
              ) : mouthOpenFrame === 2 ? (
                <ellipse cx="32" cy="39" rx="2.2" ry="1.5" fill="#f43f5e" />
              ) : (
                <path d="M29.5 38.5 Q32 41 34.5 38.5" stroke="#fbcfe8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              )
            ) : avatarState === 'error' ? (
              <path d="M29.5 40 Q32 38 34.5 40" stroke="#fda4af" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            ) : (
              <path d="M29.5 38.5 Q32 40.8 34.5 38.5" stroke="#fbcfe8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            )}
          </svg>

          {/* Bottom Micro Status Badge */}
          <div className="absolute -bottom-1.5 px-1.5 py-0.2 rounded-full bg-[#11081f] border border-white/15 flex items-center gap-1 shadow-md">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                avatarState === 'listening'
                  ? 'bg-rose-400 animate-ping'
                  : avatarState === 'speaking'
                  ? 'bg-fuchsia-400 animate-pulse'
                  : avatarState === 'thinking'
                  ? 'bg-amber-400 animate-pulse'
                  : avatarState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-[8px] font-bold tracking-tight text-white leading-tight">
              {statusLabel}
            </span>
          </div>

          {/* Quick Close Button on Corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1b102e] border border-white/20 text-slate-300 hover:text-rose-400 flex items-center justify-center shadow-md"
            title="Close floating widget"
          >
            <X size={10} />
          </button>
        </div>

        {/* Compact Voice Interface Popover (Opens when tapping the floating avatar) */}
        {isExpandedCard && (
          <div
            className={`w-64 rounded-2xl glass-panel p-3 border border-pink-500/40 bg-[#130b21]/95 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] text-white space-y-2.5 animate-fadeIn ${
              isOnRightHalf ? 'order-first' : 'order-last'
            }`}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-pink-400" />
                <span className="text-xs font-bold font-comfortaa">
                  {isJarvis ? 'Jarvis Mini Link' : 'Alya Mini Voice'}
                </span>
                {backgroundServiceActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    BG Service
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onOpenApp}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                  title="Expand full Alya interface"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedCard(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  title="Collapse panel"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Live Transcript / Companion Voice Reply Preview */}
            <div className="min-h-[44px] max-h-24 overflow-y-auto rounded-xl bg-black/45 border border-white/10 p-2 text-[11px] leading-snug">
              {isError && micErrorMessage ? (
                <div className="flex items-start gap-1.5 text-rose-300">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>{micErrorMessage}</span>
                </div>
              ) : isListening && lastTranscript ? (
                <div className="text-pink-200">
                  <span className="text-[9px] uppercase font-bold text-pink-400 block">You:</span>
                  "{lastTranscript}"
                </div>
              ) : alyaReply ? (
                <div className="text-slate-100">
                  <span className="text-[9px] uppercase font-bold text-purple-300 block">
                    {isJarvis ? 'Jarvis:' : 'Alya:'}
                  </span>
                  {alyaReply}
                </div>
              ) : (
                <div className="text-slate-400 italic">
                  {isListening
                    ? 'Bolna shuru karein... (e.g. "YouTube kholo" ya "Screen par kya hai?")'
                    : 'Tap Mic to talk hands-free with Alya!'}
                </div>
              )}
            </div>

            {/* Audio Wave & Quick Controls */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {onToggleVoice && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    isListening
                      ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                  }`}
                >
                  {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isListening ? 'Pause Mic' : isSpeaking ? 'Interrupt' : 'Talk'}</span>
                </button>
              )}

              {onInspectScreen && (
                <button
                  type="button"
                  onClick={onInspectScreen}
                  className="py-1.5 px-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-semibold flex items-center gap-1"
                  title="Ask Alya what is on your screen"
                >
                  <Scan size={13} />
                  <span>Screen</span>
                </button>
              )}

              {onPauseService && (
                <button
                  type="button"
                  onClick={onPauseService}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200"
                  title="Pause voice & background companion"
                >
                  <Pause size={13} />
                </button>
              )}
            </div>

            {(isSpeaking || isListening) && (
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] text-pink-300 flex items-center gap-1">
                  <Volume2 size={11} />
                  {isSpeaking ? 'Alya speaking...' : 'Mic listening...'}
                </span>
                <LiveAudioWave
                  active={isSpeaking || isListening}
                  type="mini-wave"
                  color={isSpeaking ? 'purple' : 'pink'}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
