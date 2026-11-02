import React from 'react';
import { ChevronLeft, Menu, Smartphone, Monitor, Laptop } from 'lucide-react';
import { ScreenType } from '../../types';

interface TopBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenMenu: () => void;
  onHeartTap: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  companionStatus?: string;
  character?: 'alya' | 'jarvis';
  floatingMiniVisible?: boolean;
  onToggleFloatingMini?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentScreen,
  onNavigate,
  onOpenMenu,
  isPhoneFrame,
  onTogglePhoneFrame,
  companionStatus = 'Online',
  character = 'alya',
  floatingMiniVisible = false,
  onToggleFloatingMini,
}) => {
  const isHome = currentScreen === 'home';
  const isJarvis = character === 'jarvis';

  // Home, Voice, and Work screens render their own integrated compact headers.
  // Do NOT render any fake status bar (time, Wi-Fi, cellular signal, or battery icons)
  // so the native Android/iOS status bar is never duplicated.
  if (isHome || currentScreen === 'voice' || currentScreen === 'work') {
    return null;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'chat':
        return isJarvis ? 'Jarvis Chat' : 'Live AI Chat';
      case 'memory':
        return 'Memory Bank';
      case 'backgrounds':
        return 'Backgrounds & Ambience';
      case 'phone_control':
        return 'Phone Control';
      case 'screen_tools':
        return 'Screen Understanding';
      case 'settings':
        return 'Settings';
      case 'studio':
        return 'AI Core Studio';
      case 'slides':
        return 'Google Slides AI';
      case 'help':
        return 'Getting Started Guide';
      case 'about':
        return isJarvis ? 'About Jarvis' : 'About Alya';
      default:
        return isJarvis ? 'Jarvis' : 'Alya';
    }
  };

  return (
    <header className="w-full select-none z-30 shrink-0 border-b border-white/10 bg-[#070210]/80 backdrop-blur-xl">
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-5 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-panel-subtle flex items-center justify-center text-slate-200 active:scale-95 transition-all shrink-0 ${
              isJarvis
                ? 'hover:text-amber-400 hover:border-amber-500/40'
                : 'hover:text-pink-400 hover:border-pink-500/40'
            }`}
            aria-label="Go back to Home"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-100 font-jakarta truncate leading-tight">
              {getScreenTitle()}
            </h2>
            <span
              className={`text-[10px] flex items-center gap-1 leading-tight ${
                isJarvis ? 'text-amber-400/90' : 'text-pink-400/90'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">
                {isJarvis ? `Jarvis • ${companionStatus}` : `Alya • ${companionStatus}`}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('work')}
            title="Switch to Work Mode"
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
              isJarvis
                ? 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border-cyan-500/35'
                : 'bg-pink-950/60 hover:bg-pink-900/60 text-pink-200 border-pink-500/35'
            }`}
          >
            <Laptop size={11} />
            <span className="hidden xs:inline">Work</span>
          </button>

          {onToggleFloatingMini && (
            <button
              type="button"
              onClick={onToggleFloatingMini}
              title="Toggle Floating Alya Avatar Overlay"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                floatingMiniVisible
                  ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_8px_rgba(255,38,159,0.5)]'
                  : 'bg-white/10 hover:bg-pink-500/20 text-pink-200 border-white/15'
              }`}
            >
              <span>🌸</span>
              <span className="hidden sm:inline">Mini</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePhoneFrame}
            title={isPhoneFrame ? 'Switch to Fullscreen view' : 'Preview Phone Frame (Desktop)'}
            className="hidden lg:flex px-2 py-1 rounded-lg bg-white/10 hover:bg-pink-500/20 text-[10px] text-pink-300 border border-white/10 transition-colors items-center gap-1"
          >
            {isPhoneFrame ? <Monitor size={11} /> : <Smartphone size={11} />}
            <span>{isPhoneFrame ? 'Full' : 'Frame'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl glass-panel flex items-center justify-center text-slate-100 active:scale-95 transition-all ${
              isJarvis
                ? 'hover:text-amber-300 hover:border-amber-500/50'
                : 'hover:text-pink-300 hover:border-pink-500/50'
            }`}
            aria-label="Open menu drawer"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
