import React, { useState, useEffect } from 'react';
import {
  Youtube,
  MessageCircle,
  Camera,
  Sliders,
  Play,
  Share2,
  ExternalLink,
  ShieldCheck,
  Check,
  Search,
  Globe,
  Settings,
  Image as ImageIcon,
  Plus,
  Trash2,
  Radio,
  Pause,
  Square,
  Sparkles,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { AndroidAppDefinition, AndroidBridgeService } from '../../utils/androidBridge';
import { backgroundCompanionService, BackgroundServiceStatus } from '../../utils/backgroundService';
import { PendingConfirmation, PendingClarification } from '../../utils/commandRouter';

interface PhoneControlScreenProps {
  onOpenScreenTools: () => void;
  onSendAlyaMessage: (msg: string) => void;
  userName: string;
  floatingMiniVisible?: boolean;
  onToggleFloatingMini?: (visible: boolean) => void;
  pendingConfirmation?: PendingConfirmation | null;
  onResolveConfirmation?: (confirmed: boolean) => void;
  pendingClarification?: PendingClarification | null;
  onSelectClarifiedApp?: (app: AndroidAppDefinition) => void;
}

export const PhoneControlScreen: React.FC<PhoneControlScreenProps> = ({
  onOpenScreenTools,
  onSendAlyaMessage,
  userName,
  floatingMiniVisible = false,
  onToggleFloatingMini,
  pendingConfirmation,
  onResolveConfirmation,
  pendingClarification,
  onSelectClarifiedApp,
}) => {
  const [youtubeQuery, setYoutubeQuery] = useState('chill anime lofi beats');
  const [googleQuery, setGoogleQuery] = useState('Minecraft shaders');
  const [activeTab, setActiveTab] = useState<'apps' | 'background' | 'system' | 'custom_apps'>('apps');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [allApps, setAllApps] = useState<AndroidAppDefinition[]>(() =>
    AndroidBridgeService.getAllKnownApps()
  );
  const [customAppName, setCustomAppName] = useState('');
  const [customPackageName, setCustomPackageName] = useState('');
  const [bgStatus, setBgStatus] = useState<BackgroundServiceStatus>(() =>
    backgroundCompanionService.getStatus()
  );

  useEffect(() => {
    return backgroundCompanionService.subscribe(setBgStatus);
  }, []);

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleLaunchApp = (app: AndroidAppDefinition, searchQuery?: string) => {
    const res = AndroidBridgeService.launchApp(app, { searchQuery });
    triggerFeedback(res.message);
  };

  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName.trim()) return;
    const added = AndroidBridgeService.saveUserRegisteredApp({
      name: customAppName.trim(),
      packageName: customPackageName.trim(),
    });
    setAllApps(AndroidBridgeService.getAllKnownApps());
    setCustomAppName('');
    setCustomPackageName('');
    triggerFeedback(`Added "${added.name}" (${added.packageName}) for voice launch`);
  };

  const handleDeleteCustomApp = (id: string) => {
    AndroidBridgeService.removeUserRegisteredApp(id);
    setAllApps(AndroidBridgeService.getAllKnownApps());
    triggerFeedback('Removed custom app entry');
  };

  const primaryApps = allApps.filter((a) => !a.id.endsWith('_settings'));
  const systemSettingShortcuts = allApps.filter((a) => a.id.endsWith('_settings') || a.id === 'settings');

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-comfortaa text-white flex items-center gap-1.5">
            Phone Control <span className="text-pink-400 text-xs">• Android Bridge</span>
          </h2>
          <span className="text-[11px] text-slate-300">
            Voice app launcher, Google search intents, background companion & floating avatar
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          <ShieldCheck size={12} /> Consent Protected
        </div>
      </div>

      {actionFeedback && (
        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Pending Sensitive Action Confirmation Gate */}
      {pendingConfirmation && (
        <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-400/50 text-amber-100 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <AlertTriangle size={14} />
            <span>Confirmation Required: {pendingConfirmation.title}</span>
          </div>
          <p className="text-[11px] text-amber-100/90">
            Command: "{pendingConfirmation.description}"
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onResolveConfirmation?.(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Confirm & Proceed
            </button>
            <button
              type="button"
              onClick={() => onResolveConfirmation?.(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs"
            >
              Cancel Action
            </button>
          </div>
        </div>
      )}

      {/* Pending Ambiguous App Clarification */}
      {pendingClarification && (
        <div className="p-3 rounded-2xl bg-purple-950/60 border border-pink-400/50 text-pink-100 text-xs space-y-2 animate-fadeIn">
          <div className="font-bold text-pink-300">
            Multiple matching apps found — Select which one to open:
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingClarification.candidates.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => onSelectClarifiedApp?.(cand)}
                className="px-3 py-1.5 rounded-xl bg-pink-600/40 hover:bg-pink-600/70 border border-pink-400/40 text-white font-bold text-xs"
              >
                {cand.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
        {(
          [
            { id: 'apps', label: 'Apps & Search' },
            { id: 'background', label: 'Floating & BG' },
            { id: 'system', label: 'Settings Intents' },
            { id: 'custom_apps', label: 'Add App' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {activeTab === 'apps' && (
          <div className="space-y-3">
            {/* Google Search + AI Grounding Box */}
            <div className="glass-card rounded-2xl p-3 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-cyan-400" />
                  <span>Google Search & Website Grounding</span>
                </div>
                <span className="text-[10px] text-cyan-300 font-normal">
                  "Google kholo aur ... search karo"
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={googleQuery}
                    onChange={(e) => setGoogleQuery(e.target.value)}
                    placeholder="Search topic (e.g., Minecraft shaders)..."
                    className="w-full bg-black/40 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSendAlyaMessage(`Google kholo aur ${googleQuery.trim() || 'Minecraft shaders'} search karo`)
                  }
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md"
                >
                  <Search size={12} /> Search
                </button>
              </div>
            </div>

            {/* YouTube Search & Launch Box */}
            <div className="glass-card rounded-2xl p-3 border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center gap-2">
                  <Youtube size={16} className="text-rose-500" />
                  <span>YouTube Intent Launcher</span>
                </div>
                <span className="text-[10px] text-rose-300 font-normal">
                  "Alya, YouTube kholo"
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={youtubeQuery}
                    onChange={(e) => setYoutubeQuery(e.target.value)}
                    placeholder="Search video, artist, anime OST..."
                    className="w-full bg-black/40 border border-white/15 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSendAlyaMessage(`YouTube kholo aur ${youtubeQuery.trim()} search karo`)
                  }
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md"
                >
                  <Play size={12} /> Open
                </button>
              </div>
            </div>

            {/* Screen Awareness Quick Card */}
            <div className="glass-card rounded-2xl p-3 border border-indigo-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera size={14} className="text-indigo-400" />
                  <span>Screen Awareness ("Meri screen par kya hai?")</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Capture or share your screen so Alya can read visible text, YouTube & websites.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenScreenTools}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                Open Tool
              </button>
            </div>

            {/* Installed & Supported Android Apps Grid */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-300 px-1 flex items-center justify-between">
                <span>Supported Android Apps (Tap or say "Alya, [App] kholo")</span>
                <span className="text-[10px] text-pink-300">{primaryApps.length} Apps Ready</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {primaryApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleLaunchApp(app)}
                    className="glass-panel p-2.5 rounded-2xl border border-white/10 hover:border-pink-500/40 flex items-center gap-2.5 text-left transition-all active:scale-95 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shrink-0">
                      {app.id === 'youtube' ? (
                        <Youtube size={18} className="text-rose-500" />
                      ) : app.id === 'whatsapp' ? (
                        <MessageCircle size={18} className="text-emerald-400" />
                      ) : app.id === 'instagram' ? (
                        <Share2 size={18} className="text-pink-400" />
                      ) : app.id === 'gallery' ? (
                        <ImageIcon size={18} className="text-purple-400" />
                      ) : app.id === 'chrome' || app.id === 'google' ? (
                        <Globe size={18} className="text-cyan-400" />
                      ) : (
                        <Smartphone size={18} className="text-pink-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
                        <span className="truncate">{app.name}</span>
                        <ExternalLink size={10} className="text-slate-400 shrink-0" />
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{app.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="space-y-3">
            {/* Floating Alya Avatar Control */}
            <div className="glass-card rounded-2xl p-3.5 border border-pink-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                  <Sparkles size={15} />
                  <span>Floating Alya Avatar Widget</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    floatingMiniVisible
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {floatingMiniVisible ? 'Active on Screen' : 'Hidden'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Displays a compact, draggable rounded-square anime avatar with real-time Listening, Thinking, Speaking, and Idle animations.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onToggleFloatingMini?.(!floatingMiniVisible);
                    triggerFeedback(
                      !floatingMiniVisible
                        ? 'Floating Alya Avatar enabled! Drag it anywhere on the screen.'
                        : 'Floating Alya Avatar hidden.'
                    );
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    floatingMiniVisible
                      ? 'bg-rose-600/30 border border-rose-500/40 text-rose-200'
                      : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                  }`}
                >
                  {floatingMiniVisible ? 'Hide Floating Avatar' : 'Enable Floating Alya Avatar'}
                </button>
              </div>
            </div>

            {/* Android Foreground / Background Service Lifecycle */}
            <div className="glass-card rounded-2xl p-3.5 border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Radio size={15} />
                  <span>Continuous Background Companion Service</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    bgStatus.state === 'running'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : bgStatus.state === 'paused'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {bgStatus.state}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {bgStatus.statusMessage}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await backgroundCompanionService.startService('Alya');
                    onToggleFloatingMini?.(true);
                    triggerFeedback('Background service & persistent notification started');
                  }}
                  className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                >
                  <Play size={12} /> Start
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await backgroundCompanionService.pauseService('Alya');
                    triggerFeedback('Background service paused (Battery saver)');
                  }}
                  className="py-2 px-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Pause size={12} /> Pause
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await backgroundCompanionService.stopService();
                    triggerFeedback('Background service stopped');
                  }}
                  className="py-2 px-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Square size={12} /> Stop
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-2.5">
            <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders size={15} className="text-cyan-400" />
                <span>Android System Settings Intents</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Open Android system settings screens directly or say "Alya, Wi-Fi settings kholo".
              </p>
              <div className="grid grid-cols-2 gap-2">
                {systemSettingShortcuts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLaunchApp(item)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs text-white font-semibold transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Settings size={14} className="text-cyan-400" />
                      {item.name}
                    </span>
                    <ExternalLink size={11} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'custom_apps' && (
          <div className="space-y-3">
            <form
              onSubmit={handleAddCustomApp}
              className="glass-card rounded-2xl p-3.5 border border-pink-500/30 space-y-2.5"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus size={15} className="text-pink-400" />
                <span>Register Installed Phone App for Voice Launch</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Add any app installed on your phone so you can say "Phone mein installed [App Name] kholo". Stored strictly on your device.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={customAppName}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  placeholder="App Name (e.g., JioCinema, Paytm, Free Fire)"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                />
                <input
                  type="text"
                  value={customPackageName}
                  onChange={(e) => setCustomPackageName(e.target.value)}
                  placeholder="Android Package ID (e.g., com.jio.media.ondemand)"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 font-mono"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold shadow-md"
                >
                  Save Installed App Mapping
                </button>
              </div>
            </form>

            {AndroidBridgeService.getUserRegisteredApps().length > 0 && (
              <div className="glass-card rounded-2xl p-3 border border-white/10 space-y-2">
                <div className="text-xs font-bold text-slate-200">Your Custom Registered Apps</div>
                {AndroidBridgeService.getUserRegisteredApps().map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{app.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{app.packageName}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleLaunchApp(app)}
                        className="px-2.5 py-1 rounded-lg bg-pink-600/30 text-pink-200 text-[11px] font-semibold"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomApp(app.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-2.5 rounded-xl glass-panel-subtle border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
        <span>
          Respects Android sandbox & package visibility. Sensitive actions always require confirmation.
        </span>
      </div>
    </div>
  );
};
