import React from 'react';
import {
  MessageSquare,
  Mic,
  Brain,
  Palette,
  Smartphone,
  Scan,
  Settings,
  Info,
  X,
  Heart,
  ShieldAlert,
  BookOpen,
  Sliders,
  Presentation,
  Laptop,
} from 'lucide-react';
import { ScreenType, CompanionCharacter, UserProfile } from '../../types';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenType;
  onSelectScreen: (screen: ScreenType) => void;
  userName: string;
  character?: CompanionCharacter;
  currentUser?: UserProfile | null;
  onOpenAutoFeatures?: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
  userName,
  character = 'alya',
  currentUser,
  onOpenAutoFeatures,
}) => {
  if (!isOpen) return null;

  const isJarvis = character === 'jarvis';

  const menuItems: { id: ScreenType; label: string; icon: React.ReactNode; color: string; badge?: string }[] = [
    { id: 'work', label: 'Work Mode (Workstation)', icon: <Laptop size={18} />, color: isJarvis ? 'text-cyan-400' : 'text-pink-400', badge: 'New' },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} />, color: 'text-pink-400' },
    { id: 'slides', label: 'Google Slides AI', icon: <Presentation size={18} />, color: 'text-yellow-400', badge: 'Workspace' },
    { id: 'studio', label: 'AI Core Studio', icon: <Settings size={18} />, color: 'text-amber-400', badge: 'New' },
    { id: 'memory', label: 'Memory Bank', icon: <Brain size={18} />, color: 'text-purple-400' },
    { id: 'voice', label: 'Voice Calls & Studio', icon: <Mic size={18} />, color: 'text-rose-400' },
    { id: 'backgrounds', label: 'Ambience & Backgrounds', icon: <Palette size={18} />, color: 'text-teal-400' },
    { id: 'phone_control', label: 'Phone Control', icon: <Smartphone size={18} />, color: 'text-blue-400' },
    { id: 'screen_tools', label: 'Screen Tools', icon: <Scan size={18} />, color: 'text-indigo-400', badge: 'AI' },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} />, color: 'text-slate-300' },
    { id: 'help', label: 'Getting Started Guide', icon: <BookOpen size={18} />, color: 'text-amber-400', badge: 'Guide' },
    { id: 'admin', label: 'Admin Control', icon: <ShieldAlert size={18} />, color: 'text-rose-400', badge: 'Secure' },
    { id: 'about', label: 'About', icon: <Info size={18} />, color: 'text-slate-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative ml-auto w-[290px] max-w-[85vw] h-full glass-panel flex flex-col z-10 overflow-hidden ${
          isJarvis
            ? 'border-l border-amber-500/25 shadow-[-10px_0_35px_rgba(245,158,11,0.15)]'
            : 'border-l border-pink-500/25 shadow-[-10px_0_35px_rgba(244,114,182,0.15)]'
        }`}
      >
        {/* Header Profile */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`relative w-11 h-11 rounded-full p-[2px] shadow-md ${
                isJarvis
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-gradient-to-tr from-pink-500 to-purple-500 shadow-[0_0_12px_rgba(244,114,182,0.5)]'
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#181124] flex items-center justify-center overflow-hidden">
                {isJarvis ? (
                  <span className="text-xl">⚡</span>
                ) : (
                  <span className="text-xl">🌸</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#12101d]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-base font-bold font-comfortaa text-white">
                  {isJarvis ? 'Jarvis' : 'Alya'}
                </h3>
                <span className={`text-xs ${isJarvis ? 'text-amber-400' : 'text-pink-400'}`}>
                  {isJarvis ? '⚡' : '🌸'}
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isJarvis ? 'Telemetry Optimal' : 'Online & Ready'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass-panel-subtle flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Greeting pill */}
        <div
          onClick={() => {
            onSelectScreen('settings');
            onClose();
          }}
          className={`px-4 py-2 border-b border-white/5 flex items-center justify-between text-xs cursor-pointer hover:bg-white/5 transition-colors ${
            isJarvis
              ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-200/90'
              : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-200/90'
          }`}
          title="Open Settings & Profile"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-slate-200 font-semibold truncate">{userName || 'Explorer'}</span>
            {currentUser?.username && (
              <span className="text-[10px] text-slate-400 font-mono truncate">@{currentUser.username}</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] shrink-0">
            {isJarvis ? (
              <span>⚡ System: 100%</span>
            ) : (
              <>
                <Heart size={12} fill="currentColor" /> Bond: 99%
              </>
            )}
          </span>
        </div>

        {/* Quick Auto Features Button */}
        {onOpenAutoFeatures && (
          <div className="p-2 border-b border-white/5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAutoFeatures();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isJarvis
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25'
                  : 'bg-pink-500/15 border-pink-500/30 text-pink-200 hover:bg-pink-500/25'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sliders size={14} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span>Auto Features Menu</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">
                Hands-Free
              </span>
            </button>
          </div>
        )}

        {/* Scrollable Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectScreen(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600/30 to-purple-600/20 text-white border border-pink-500/40 shadow-[0_0_15px_rgba(244,114,182,0.25)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${item.color} ${isActive ? 'text-glow-pink' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer quote */}
        <div
          className={`p-3 border-t border-white/10 text-center text-[11px] italic font-quicksand bg-black/20 ${
            isJarvis ? 'text-amber-300/80' : 'text-pink-300/80'
          }`}
        >
          {isJarvis ? '"Always here to assist and support you."' : '"I\'m always here for you... 🌸"'}
        </div>
      </div>
    </div>
  );
};
