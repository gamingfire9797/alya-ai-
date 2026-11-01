import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, ChevronLeft, Menu, Smartphone, Monitor, Laptop } from 'lucide-react';
import { ScreenType } from '../../types';
import { TimeEngine } from '../../utils/time';

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
  onHeartTap,
  isPhoneFrame,
  onTogglePhoneFrame,
  companionStatus = 'Online',
  character = 'alya',
  floatingMiniVisible = false,
  onToggleFloatingMini,
}) => {
  const isHome = currentScreen === 'home';
  const isJarvis = character === 'jarvis';

  // Live dynamic system clock updated every 10 seconds
  const [headerClock, setHeaderClock] = useState(() => TimeEngine.formatHeaderClock());
  const [tzCode, setTzCode] = useState(() => TimeEngine.getTimezoneShort());

  useEffect(() => {
    const updateTime = () => {
      setHeaderClock(TimeEngine.formatHeaderClock());
      setTzCode(TimeEngine.getTimezoneShort());
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'chat':
        return isJarvis ? 'Jarvis Chat' : 'Live AI Chat';
      case 'voice':
        return isJarvis ? 'Jarvis Voice Call' : 'Alya Voice Call';
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
      case 'work':
        return isJarvis ? 'Jarvis Workstation' : 'Alya Workstation';
      case 'about':
        return isJarvis ? 'About Jarvis' : 'About Alya';
      default:
        return isJarvis ? 'Jarvis' : 'Alya';
    }
  };

  return (
    <header className="w-full select-none z-30 flex flex-col">
      {/* Android / Device System Status Bar with Live Real-Time Clock */}
      <div className="w-full flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-semibold text-slate-300/80 tracking-wide">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-white/90" title={`Live time (${tzCode})`}>
            {headerClock}
          </span>
          <button
            type="button"
            onClick={onTogglePhoneFrame}
            title={isPhoneFrame ? 'Switch to Fullscreen view' : 'Switch to Android phone frame'}
            className="ml-2 px-1.5 py-0.5 rounded bg-white/10 hover:bg-pink-500/20 text-[9px] text-pink-300 border border-white/10 transition-colors flex items-center gap-1"
          >
            {isPhoneFrame ? <Monitor size={10} /> : <Smartphone size={10} />}
            <span>{isPhoneFrame ? 'Full' : 'Phone'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(currentScreen === 'work' ? 'home' : 'work')}
            title="Switch between Normal Voice Mode and Work Mode"
            className={`ml-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all flex items-center gap-1 ${
              currentScreen === 'work'
                ? isJarvis
                  ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)]'
                  : 'bg-pink-500 text-white border-pink-400 shadow-[0_0_8px_rgba(255,38,159,0.6)]'
                : isJarvis
                ? 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border-cyan-500/35'
                : 'bg-pink-950/60 hover:bg-pink-900/60 text-pink-200 border-pink-500/35'
            }`}
          >
            <Laptop size={10} />
            <span>{currentScreen === 'work' ? 'Voice Mode' : 'Work Mode'}</span>
          </button>
          {onToggleFloatingMini && (
            <button
              type="button"
              onClick={onToggleFloatingMini}
              title="Toggle Floating Alya Avatar Overlay"
              className={`ml-1 px-2 py-0.5 rounded text-[9px] font-bold border transition-all flex items-center gap-1 ${
                floatingMiniVisible
                  ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_8px_rgba(255,38,159,0.6)]'
                  : 'bg-white/10 hover:bg-pink-500/20 text-pink-200 border-white/15'
              }`}
            >
              <span>🌸 Mini</span>
            </button>
          )}
        </div>

        <div className="w-3.5 h-3.5 rounded-full bg-black/60 border border-pink-500/20 shadow-inner" />

        <div className="flex items-center gap-2">
          <Signal size={12} className="text-slate-200" />
          <Wifi size={12} className="text-slate-200" />
          <div className="flex items-center gap-0.5">
            <span className="text-[10px]">98%</span>
            <Battery size={13} className="text-slate-200" />
          </div>
        </div>
      </div>

      {/* Main Header Row - shown on secondary screens (except work mode which has its own workstation header) */}
      {!isHome && currentScreen !== 'voice' && currentScreen !== 'work' && (
        <div className="w-full flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`w-9 h-9 rounded-full glass-panel-subtle flex items-center justify-center text-slate-200 active:scale-95 transition-all ${
                isJarvis
                  ? 'hover:text-amber-400 hover:border-amber-500/40'
                  : 'hover:text-pink-400 hover:border-pink-500/40'
              }`}
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-100 font-jakarta drop-shadow-sm">
                {getScreenTitle()}
              </h2>
              <span
                className={`text-[10px] flex items-center gap-1 ${
                  isJarvis ? 'text-amber-400/90' : 'text-pink-400/90'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {isJarvis ? 'Jarvis • Standing By' : 'Alya • Online'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenMenu}
            className={`w-10 h-10 rounded-full glass-panel flex items-center justify-center text-slate-100 active:scale-95 transition-all ${
              isJarvis
                ? 'hover:text-amber-300 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'hover:text-pink-300 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(244,114,182,0.4)]'
            }`}
            aria-label="Open menu drawer"
          >
            <Menu size={20} />
          </button>
        </div>
      )}
    </header>
  );
};
