import React, { useState } from 'react';
import {
  Search,
  Globe,
  Trash2,
  Clock,
  Plus,
  ExternalLink,
  Sparkles,
  Shield,
  X,
  Check,
  Settings,
  AlertCircle,
} from 'lucide-react';
import {
  CompanionCharacter,
  BrowserShortcut,
  BrowserHistoryEntry,
  SearchEngineType,
} from '../../../types';

interface BrowserStartPageProps {
  character: CompanionCharacter;
  searchEngine: SearchEngineType;
  onSelectSearchEngine: (engine: SearchEngineType) => void;
  onNavigate: (destination: string) => void;
  shortcuts: BrowserShortcut[];
  onAddShortcut: (title: string, url: string) => void;
  onRemoveShortcut: (id: string) => void;
  history: BrowserHistoryEntry[];
  onRemoveHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
  retain30Days: boolean;
  onToggleRetain30Days: (enabled: boolean) => void;
}

const SEARCH_ENGINES: { id: SearchEngineType; name: string; icon: string; placeholder: string }[] = [
  { id: 'google', name: 'Google', icon: '🔍', placeholder: 'Search Google or type a web address...' },
  { id: 'duckduckgo', name: 'DuckDuckGo', icon: '🦆', placeholder: 'Search DuckDuckGo with privacy...' },
  { id: 'bing', name: 'Bing', icon: '🌐', placeholder: 'Search Microsoft Bing or enter URL...' },
  { id: 'alya_ai', name: 'Alya AI', icon: '✨', placeholder: 'Ask Alya AI with live search grounding...' },
];

export const BrowserStartPage: React.FC<BrowserStartPageProps> = ({
  character,
  searchEngine,
  onSelectSearchEngine,
  onNavigate,
  shortcuts,
  onAddShortcut,
  onRemoveShortcut,
  history,
  onRemoveHistoryEntry,
  onClearHistory,
  retain30Days,
  onToggleRetain30Days,
}) => {
  const isJarvis = character === 'jarvis';
  const [searchInput, setSearchInput] = useState('');
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const currentEngineObj =
    SEARCH_ENGINES.find((e) => e.id === searchEngine) || SEARCH_ENGINES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) return;
    onNavigate(clean);
  };

  const handleCreateShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    onAddShortcut(newTitle.trim(), newUrl.trim());
    setNewTitle('');
    setNewUrl('');
    setIsAddShortcutOpen(false);
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center p-4 sm:p-8 select-none">
      <div className="w-full max-w-3xl flex flex-col items-center space-y-6 sm:space-y-8 my-auto py-4">
        {/* BRANDING HERO */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border shadow-xl transition-transform hover:scale-105 ${
              isJarvis
                ? 'bg-gradient-to-b from-cyan-950/80 to-[#040d1c] border-cyan-500/40 shadow-[0_0_28px_rgba(0,229,255,0.25)] text-cyan-400'
                : 'bg-gradient-to-b from-pink-950/80 to-[#120418] border-pink-500/40 shadow-[0_0_28px_rgba(255,38,159,0.25)] text-pink-400'
            }`}
          >
            {isJarvis ? '⚡' : '🌸'}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold font-comfortaa tracking-wide text-white flex items-center gap-2">
            <span>{isJarvis ? 'Jarvis Custom Browser' : 'Alya Custom Browser'}</span>
          </h1>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Shield size={12} />
              <span>Sandboxed Engine</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Zero Telemetry</span>
            <span aria-hidden="true">·</span>
            <span>Private Navigation</span>
          </div>
        </div>

        {/* COMBINED SEARCH & URL BAR */}
        <div className="w-full">
          <form
            onSubmit={handleSubmit}
            className={`relative flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl border backdrop-blur-2xl transition-all shadow-xl ${
              isJarvis
                ? 'bg-[#08152c]/90 border-cyan-500/40 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
                : 'bg-[#180a2c]/90 border-pink-500/40 focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Search Engine Selector */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors"
                title={`Active search engine: ${currentEngineObj.name}`}
              >
                <span>{currentEngineObj.icon}</span>
                <span className="hidden sm:inline">{currentEngineObj.name}</span>
              </button>

              {/* Engine Switcher Dropdown */}
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-[#0a0316] border border-white/15 rounded-xl shadow-2xl p-1 z-30 min-w-[140px]">
                {SEARCH_ENGINES.map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => onSelectSearchEngine(engine.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      searchEngine === engine.id
                        ? isJarvis
                          ? 'bg-cyan-500/20 text-cyan-200 font-bold'
                          : 'bg-pink-500/20 text-pink-200 font-bold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{engine.icon}</span>
                    <span>{engine.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={currentEngineObj.placeholder}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none font-sans px-2"
              autoFocus
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Clear"
              >
                <X size={14} />
              </button>
            )}

            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:brightness-110 shadow-[0_0_12px_rgba(255,38,159,0.4)]'
              }`}
            >
              <Search size={14} />
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* SHORTCUTS GRID */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
              Web Shortcuts
            </span>
            <button
              type="button"
              onClick={() => setIsAddShortcutOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors text-[11px]"
            >
              <Plus size={12} />
              <span>Add Shortcut</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
            {shortcuts.map((sc) => (
              <div
                key={sc.id}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-pink-500/40 hover:bg-white/[0.08] transition-all cursor-pointer text-center"
                onClick={() => onNavigate(sc.url)}
              >
                <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
                  {sc.icon || '🌐'}
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate w-full">
                  {sc.title}
                </span>

                {/* Delete button for custom shortcuts */}
                {sc.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveShortcut(sc.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition-all"
                    title="Remove shortcut"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 text-center italic pt-1">
            Web shortcuts launch within Alya or open in your default browser. Launching native device apps requires Android OS platform integration.
          </p>
        </div>

        {/* RECENT / BROWSING HISTORY */}
        <div className="w-full space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <Clock size={13} />
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
                Recent Activity & History
              </span>
              <span className="text-[10px] text-slate-500">
                ({history.length} {history.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="hover:text-white transition-colors p-1"
                title="History Settings"
              >
                <Settings size={13} />
              </button>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(true)}
                  className="flex items-center gap-1 hover:text-rose-400 transition-colors text-[11px]"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-500 space-y-1">
              <p>No recent history yet.</p>
              <p className="text-[11px]">Pages and searches you visit will appear here for easy access.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 divide-y divide-white/5 overflow-hidden">
              {history.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.url)}
                  className="group flex items-center justify-between p-2.5 sm:px-3 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <span className="text-xs text-slate-400 shrink-0">
                      {item.type === 'search' ? '🔍' : '🌐'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-pink-300 transition-colors truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {item.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistoryEntry(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition-all"
                      title="Remove from history"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ADD SHORTCUT MODAL */}
      {isAddShortcutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 backdrop-blur-2xl shadow-2xl space-y-4 ${
              isJarvis
                ? 'bg-[#08152c] border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.2)]'
                : 'bg-[#18082c] border-pink-500/40 shadow-[0_0_35px_rgba(255,38,159,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Add Website Shortcut</h3>
              <button
                type="button"
                onClick={() => setIsAddShortcutOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateShortcut} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Shortcut Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. My Website"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-400 font-sans"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="e.g. https://example.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-400 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddShortcutOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                    isJarvis ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-pink-500 hover:bg-pink-400'
                  }`}
                >
                  Save Shortcut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAR HISTORY CONFIRMATION MODAL */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-[#18040d] p-5 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle size={20} />
              <h3 className="text-sm font-bold text-white">Clear Browsing History?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will remove all visited pages and saved searches from Alya Browser storage. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#0d0418] p-5 backdrop-blur-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings size={15} />
                <span>History & Privacy Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retain30Days}
                  onChange={(e) => onToggleRetain30Days(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-pink-500 focus:ring-0"
                />
                <div>
                  <span className="font-semibold text-white block">Auto-expire history after 30 days</span>
                  <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                    Automatically deletes browsing and search logs older than 30 days to protect local storage and privacy.
                  </span>
                </div>
              </label>

              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Privacy Guarantee</span>
                <p>History is stored locally in client sandboxed storage. Passwords, form inputs, and authentication tokens are never recorded.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
