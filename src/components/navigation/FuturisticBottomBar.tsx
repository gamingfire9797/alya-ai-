import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Sliders,
  Menu,
} from 'lucide-react';

export interface FuturisticBottomBarProps {
  isJarvis: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isAutoVoiceActive: boolean;
  onToggleVoice: () => void;
  onHoldToTalkStart?: () => void;
  onHoldToTalkEnd?: () => void;
  onAttachImage: () => void;
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenStudio?: () => void;
  onOpenDrawer?: () => void;
}

/**
 * Premium Dark Futuristic System Navigation Bar
 * Features:
 * - Large glowing central Voice AI orb with multi-layer neon pink & purple aura
 * - Concentric animated orbital rings & 3D glass reflections
 * - Symmetrically arranged circular navigation buttons with sci-fi glass pods
 * - Translucent cyber pod backdrop with hairline glowing accents & specular highlights
 * - Responsive layout for mobile (Android/iOS), tablets, and desktop displays
 * - 100% accessible touch targets with anti-clipping safe bounds
 */
export const FuturisticBottomBar: React.FC<FuturisticBottomBarProps> = ({
  isJarvis,
  isListening,
  isSpeaking,
  isThinking,
  isAutoVoiceActive,
  onToggleVoice,
  onHoldToTalkStart,
  onHoldToTalkEnd,
  onAttachImage,
  onOpenChat,
  onOpenVoice,
  onOpenStudio,
  onOpenDrawer,
}) => {
  const [isHolding, setIsHolding] = useState(false);

  const handleHoldStart = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setIsHolding(true);
    onHoldToTalkStart?.();
  };

  const handleHoldEnd = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setIsHolding(false);
    onHoldToTalkEnd?.();
  };

  // State-specific 3D lighting, glows, and orbital ring colors
  const getOrbStateClasses = () => {
    if (isListening) {
      return {
        bg: 'bg-[radial-gradient(circle_at_36%_26%,#ffe4e6_0%,#f43f5e_38%,#be123c_72%,#4c0519_100%)]',
        glow: 'shadow-[0_0_35px_rgba(244,63,94,0.95),0_0_75px_rgba(244,63,94,0.55),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-4 ring-rose-400/50 animate-pulse',
        ringColor: 'border-rose-400/80',
        outerRingColor: 'border-rose-400/35',
        label: 'Listening',
        labelColor: 'text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]',
      };
    }
    if (isSpeaking) {
      return {
        bg: 'bg-[radial-gradient(circle_at_36%_26%,#f5d0fe_0%,#c026d3_38%,#7e22ce_72%,#3b0764_100%)]',
        glow: 'shadow-[0_0_35px_rgba(192,38,211,0.95),0_0_75px_rgba(168,85,247,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-4 ring-fuchsia-400/50',
        ringColor: 'border-purple-400/80',
        outerRingColor: 'border-purple-400/35',
        label: 'Speaking',
        labelColor: 'text-fuchsia-300 drop-shadow-[0_0_8px_rgba(192,38,211,0.8)]',
      };
    }
    if (isThinking) {
      return {
        bg: 'bg-[radial-gradient(circle_at_36%_26%,#fef08a_0%,#f59e0b_40%,#b45309_75%,#451a03_100%)]',
        glow: 'shadow-[0_0_35px_rgba(245,158,11,0.9),0_0_65px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-4 ring-amber-400/50 animate-pulse',
        ringColor: 'border-amber-400/80',
        outerRingColor: 'border-amber-400/35',
        label: 'Thinking',
        labelColor: 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      };
    }
    if (isAutoVoiceActive) {
      return {
        bg: isJarvis
          ? 'bg-[radial-gradient(circle_at_36%_26%,#a5f3fc_0%,#06b6d4_40%,#0369a1_75%,#082f49_100%)]'
          : 'bg-[radial-gradient(circle_at_36%_26%,#a7f3d0_0%,#10b981_40%,#047857_75%,#022c22_100%)]',
        glow: isJarvis
          ? 'shadow-[0_0_35px_rgba(0,229,255,0.85),0_0_70px_rgba(59,130,246,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-3 ring-cyan-400/60'
          : 'shadow-[0_0_35px_rgba(16,185,129,0.85),0_0_70px_rgba(16,185,129,0.45),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-3 ring-emerald-400/60',
        ringColor: isJarvis ? 'border-cyan-400/70' : 'border-emerald-400/70',
        outerRingColor: isJarvis ? 'border-cyan-400/30' : 'border-emerald-400/30',
        label: 'Live Auto',
        labelColor: isJarvis ? 'text-cyan-300' : 'text-emerald-300',
      };
    }
    if (isJarvis) {
      return {
        bg: 'bg-[radial-gradient(circle_at_36%_26%,#67e8f9_0%,#06b6d4_38%,#0284c7_72%,#082f49_100%)]',
        glow: 'shadow-[0_0_32px_rgba(0,229,255,0.75),0_0_65px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.4)] ring-2 ring-cyan-300/40 animate-orb-pulse-cyan',
        ringColor: 'border-cyan-400/60',
        outerRingColor: 'border-cyan-400/25',
        label: 'Jarvis AI',
        labelColor: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]',
      };
    }
    // Default Alya: Vibrant Electric Neon Pink & Purple Orb
    return {
      bg: 'bg-[radial-gradient(circle_at_36%_26%,#ff94c9_0%,#ff269f_36%,#be185d_70%,#540428_100%)]',
      glow: 'shadow-[0_0_36px_rgba(255,38,159,0.85),0_0_70px_rgba(168,85,247,0.45),inset_0_2px_4px_rgba(255,255,255,0.45)] ring-2 ring-pink-300/50 animate-orb-pulse',
      ringColor: 'border-pink-400/70',
      outerRingColor: 'border-pink-400/30',
      label: 'Voice AI',
      labelColor: 'text-pink-300 drop-shadow-[0_0_8px_rgba(255,38,159,0.75)]',
    };
  };

  const orbStyle = getOrbStateClasses();

  return (
    <nav
      aria-label="Companion Controls Navigation"
      className="relative w-full max-w-xl mx-auto px-0.5 sm:px-2 z-20 select-none"
    >
      {/* Sci-Fi Navigation Pod Container */}
      <div
        className={`relative w-full rounded-[28px] sm:rounded-full backdrop-blur-xl px-1.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-0.5 sm:gap-2 transition-all duration-300 border ${
          isJarvis
            ? 'bg-gradient-to-b from-[#081326]/90 via-[#040b17]/92 to-[#02050c]/96 border-cyan-500/35 shadow-[0_8px_28px_rgba(0,0,0,0.8),0_0_22px_rgba(0,229,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.18)]'
            : 'bg-gradient-to-b from-[#140827]/90 via-[#0c0419]/92 to-[#070210]/96 border-pink-500/35 shadow-[0_8px_28px_rgba(0,0,0,0.8),0_0_24px_rgba(255,38,159,0.22),inset_0_1px_1px_rgba(255,255,255,0.18)]'
        }`}
      >
        {/* Futuristic Top Glowing Hairline */}
        <div
          className={`absolute top-0 inset-x-8 sm:inset-x-14 h-[1.5px] pointer-events-none ${
            isJarvis
              ? 'bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent'
              : 'bg-gradient-to-r from-transparent via-pink-400/75 to-transparent'
          }`}
        />

        {/* Cyber Accent Marks on Container Edges */}
        <div
          className="hidden sm:flex items-center gap-1 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70"
        >
          <div
            className={`w-1 h-3.5 rounded-full ${
              isJarvis ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.8)]' : 'bg-pink-400 shadow-[0_0_6px_rgba(255,38,159,0.8)]'
            }`}
          />
          <div
            className={`w-0.5 h-2 rounded-full ${
              isJarvis ? 'bg-cyan-500/50' : 'bg-pink-500/50'
            }`}
          />
        </div>
        <div
          className="hidden sm:flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70"
        >
          <div
            className={`w-0.5 h-2 rounded-full ${
              isJarvis ? 'bg-blue-500/50' : 'bg-purple-500/50'
            }`}
          />
          <div
            className={`w-1 h-3.5 rounded-full ${
              isJarvis ? 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]' : 'bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]'
            }`}
          />
        </div>

        {/* ============================================================ */}
        {/* LEFT BUTTON GROUP (Evenly spaced surrounding circular icons) */}
        {/* ============================================================ */}
        <div className="flex items-center justify-evenly flex-1 gap-0.5 sm:gap-2">
          {/* 1. Hold-to-Talk Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerCancel={handleHoldEnd}
              onPointerLeave={() => {
                if (isHolding) handleHoldEnd();
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 select-none shadow-md border ${
                isHolding
                  ? isJarvis
                    ? 'bg-cyan-500 text-white border-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.9)] scale-95'
                    : 'bg-pink-500 text-white border-pink-300 shadow-[0_0_20px_rgba(255,46,144,0.9)] scale-95'
                  : isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/90 border-cyan-500/30 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/90 border-pink-500/30 hover:border-pink-400 hover:text-white'
              }`}
              title="Hold-to-Talk (Press & HOLD to speak, release to send)"
              aria-label="Hold to talk"
            >
              <Mic size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span
              className={`text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none transition-colors ${
                isHolding
                  ? isJarvis
                    ? 'text-cyan-300 font-black'
                    : 'text-pink-300 font-black'
                  : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              Hold
            </span>
          </div>

          {/* 2. Attach Image Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onClick={onAttachImage}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md border ${
                isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/85 border-cyan-500/25 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/85 border-pink-500/25 hover:border-pink-400 hover:text-white'
              }`}
              title="Attach Image for Visual Analysis"
              aria-label="Attach Image"
            >
              <ImageIcon size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none text-slate-400 group-hover:text-slate-200">
              Image
            </span>
          </div>

          {/* 3. Studio / Customization Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onClick={onOpenStudio || onOpenDrawer}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md border ${
                isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/85 border-cyan-500/25 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/85 border-pink-500/25 hover:border-pink-400 hover:text-white'
              }`}
              title="Companion Studio & Customization"
              aria-label="Studio settings"
            >
              <Sliders size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none text-slate-400 group-hover:text-slate-200">
              Studio
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CENTER PROMINENT GLOWING ORB / MICROPHONE BUTTON             */}
        {/* ============================================================ */}
        <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-2 z-10">
          <div className="relative flex items-center justify-center">
            {/* Outer Expanding Radar Wave during Active Listening */}
            {isListening && (
              <span
                className={`absolute -inset-2.5 sm:-inset-3.5 rounded-full opacity-65 animate-ping pointer-events-none ${
                  isJarvis ? 'bg-cyan-400' : 'bg-rose-500'
                }`}
              />
            )}

            {/* Orbital Tech Notched Ring (Thin dashed animated cyber orbit) */}
            <div
              className={`absolute -inset-1.5 sm:-inset-2 rounded-full border border-dashed pointer-events-none animate-orb-ring transition-opacity duration-300 ${
                orbStyle.outerRingColor
              }`}
            />

            {/* Inner Concentric Glow Ring */}
            <div
              className={`absolute -inset-0.5 sm:-inset-1 rounded-full border pointer-events-none transition-all duration-300 ${orbStyle.ringColor}`}
            />

            {/* 3D Glowing Orb Button */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 group overflow-hidden ${orbStyle.bg} ${orbStyle.glow}`}
              title={
                isListening
                  ? 'Active Listening (Tap to turn off)'
                  : isSpeaking
                  ? 'Companion Speaking (Tap to interrupt)'
                  : isThinking
                  ? 'Processing Response...'
                  : isAutoVoiceActive
                  ? 'Auto Voice Ready (Hands-Free)'
                  : 'Tap to start Voice AI Mode'
              }
              aria-label={
                isListening
                  ? 'Stop listening'
                  : isAutoVoiceActive
                  ? 'Auto Voice active'
                  : 'Start voice conversation'
              }
            >
              {/* Upper Specular 3D Glass Reflection Arc */}
              <div className="absolute top-1 inset-x-2 sm:inset-x-2.5 h-3.5 sm:h-4 rounded-full bg-gradient-to-b from-white/65 via-white/25 to-transparent pointer-events-none" />

              {/* Lower Subtle Inner Ambient Bounce Light */}
              <div className="absolute bottom-1 inset-x-2.5 h-2 rounded-full bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />

              {/* Central Crisp Icon with Drop Shadow */}
              <div className="relative z-10 transition-transform duration-200 group-hover:scale-110">
                {isListening ? (
                  <MicOff
                    size={22}
                    className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                  />
                ) : (
                  <Mic
                    size={22}
                    className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                  />
                )}
              </div>
            </button>
          </div>

          {/* Micro Status Kicker under the Orb */}
          <span
            className={`text-[8px] sm:text-[9px] font-black tracking-widest uppercase mt-0.5 leading-none select-none transition-colors ${orbStyle.labelColor}`}
          >
            {orbStyle.label}
          </span>
        </div>

        {/* ============================================================ */}
        {/* RIGHT BUTTON GROUP (Evenly spaced surrounding circular icons)*/}
        {/* ============================================================ */}
        <div className="flex items-center justify-evenly flex-1 gap-0.5 sm:gap-2">
          {/* 4. Voice Call / Visualizer Screen Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onClick={onOpenVoice}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md border ${
                isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/85 border-cyan-500/25 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/85 border-pink-500/25 hover:border-pink-400 hover:text-white'
              }`}
              title="Voice Call & Audio Visualizer Screen"
              aria-label="Voice screen"
            >
              <Sparkles size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none text-slate-400 group-hover:text-slate-200">
              Voice
            </span>
          </div>

          {/* 5. Full Chat Screen Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onClick={onOpenChat}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md border ${
                isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/85 border-cyan-500/25 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/85 border-pink-500/25 hover:border-pink-400 hover:text-white'
              }`}
              title="Open Full Chat Interface"
              aria-label="Open chat"
            >
              <MessageSquare size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none text-slate-400 group-hover:text-slate-200">
              Chat
            </span>
          </div>

          {/* 6. System Menu Button */}
          <div className="flex flex-col items-center group">
            <button
              type="button"
              onClick={onOpenDrawer}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 shadow-md border ${
                isJarvis
                  ? 'bg-gradient-to-b from-[#0a1833]/90 to-[#040e20]/95 text-cyan-300/85 border-cyan-500/25 hover:border-cyan-400 hover:text-white'
                  : 'bg-gradient-to-b from-[#1b0d2e]/90 to-[#0e0618]/95 text-pink-300/85 border-pink-500/25 hover:border-pink-400 hover:text-white'
              }`}
              title="Open System Menu & Tools"
              aria-label="Open menu"
            >
              <Menu size={16} className="shrink-0 transition-transform group-hover:scale-110" />
            </button>
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider uppercase mt-0.5 leading-none select-none text-slate-400 group-hover:text-slate-200">
              Menu
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};
