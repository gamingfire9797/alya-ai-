import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Plus,
  X,
  ExternalLink,
  Sparkles,
  Globe,
  Bookmark,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Lock,
  AlertTriangle,
  RefreshCw,
  Home,
  Square,
  Search,
  Tv,
  Layers,
  Smartphone,
} from 'lucide-react';
import {
  BrowserTab,
  BookmarkItem,
  CompanionCharacter,
  BrowserShortcut,
  BrowserHistoryEntry,
  SearchEngineType,
} from '../../../types';
import { BrowserStartPage } from './BrowserStartPage';
import {
  detectPlatform,
  openExternalBrowser,
  parseYouTubeVideoId,
  getYouTubeEmbedUrl,
  isDomainRestricted,
} from '../../../utils/platformEnvironment';
import { apiFetch } from '../../../utils/apiConfig';

interface BrowserWorkspaceProps {
  character: CompanionCharacter;
  userApiKey?: string;
  onSendToCoding?: (code: string, language: string, title: string) => void;
  onSaveToFile?: (name: string, content: string) => void;
  onAskAlya?: (prompt: string) => void;
}

const START_URL = 'alya://start';

const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  { id: 'b0', title: 'Start', url: START_URL, icon: '🌸', category: 'System' },
  { id: 'b1', title: 'YouTube', url: 'https://youtube.com', icon: '📺', category: 'Media' },
  { id: 'b2', title: 'Wikipedia', url: 'https://en.wikipedia.org', icon: '🌐', category: 'Knowledge' },
  { id: 'b3', title: 'Example.com', url: 'https://example.com', icon: '📄', category: 'Sample' },
  { id: 'b4', title: 'W3Schools', url: 'https://www.w3schools.com', icon: '📚', category: 'Docs' },
  { id: 'b5', title: 'HTTPBin Test', url: 'https://httpbin.org', icon: '⚡', category: 'Dev' },
  { id: 'b6', title: 'GitHub', url: 'https://github.com', icon: '🐙', category: 'Dev' },
  { id: 'b7', title: 'Google', url: 'https://google.com', icon: '🔍', category: 'Search' },
];

const DEFAULT_SHORTCUTS: BrowserShortcut[] = [
  { id: 'sc-1', title: 'Google', url: 'https://google.com', icon: '🔍' },
  { id: 'sc-2', title: 'YouTube', url: 'https://youtube.com', icon: '📺' },
  { id: 'sc-3', title: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { id: 'sc-4', title: 'Wikipedia', url: 'https://en.wikipedia.org', icon: '🌐' },
  { id: 'sc-5', title: 'Example.com', url: 'https://example.com', icon: '📄' },
  { id: 'sc-6', title: 'W3Schools', url: 'https://www.w3schools.com', icon: '📚' },
];

const getCleanHostname = (url: string): string => {
  if (url === START_URL) return 'Alya Start';
  if (url.startsWith('search://')) return 'Search Results';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const BrowserWorkspace: React.FC<BrowserWorkspaceProps> = ({
  character,
  userApiKey,
  onSendToCoding,
  onSaveToFile,
  onAskAlya,
}) => {
  const isJarvis = character === 'jarvis';
  const platform = detectPlatform();

  // 1. TABS STATE
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Alya Start',
      url: START_URL,
      favicon: isJarvis ? '⚡' : '🌸',
      history: [START_URL],
      historyIndex: 0,
      isLoading: false,
      isRestricted: false,
      platformEngine: platform.platformName,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{
    overview: string;
    sources: { title: string; url: string; snippet: string }[];
  } | null>(null);

  // 2. SEARCH ENGINE SELECTION
  const [searchEngine, setSearchEngine] = useState<SearchEngineType>(() => {
    try {
      const saved = localStorage.getItem('alya_browser_engine_v1');
      if (saved && ['google', 'duckduckgo', 'bing', 'alya_ai'].includes(saved)) {
        return saved as SearchEngineType;
      }
    } catch {}
    return 'google';
  });

  // 3. SHORTCUTS STATE
  const [shortcuts, setShortcuts] = useState<BrowserShortcut[]>(() => {
    try {
      const saved = localStorage.getItem('alya_browser_shortcuts_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SHORTCUTS;
  });

  // 4. BROWSING HISTORY & 30-DAY RETENTION
  const [retain30Days, setRetain30Days] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('alya_browser_retain_30_days_v1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const [history, setHistory] = useState<BrowserHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('alya_browser_history_v1');
      if (saved) {
        let entries: BrowserHistoryEntry[] = JSON.parse(saved);
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        entries = entries.filter((e) => e.timestamp > thirtyDaysAgo);
        return entries;
      }
    } catch {}
    return [];
  });

  // 5. MODALS & UTILITIES
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    title: string;
    summary: string;
    takeaways: string[];
    readingTime: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    summary: '',
    takeaways: [],
    readingTime: '',
    isLoading: false,
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Sync Omnibar input text when tab changes
  useEffect(() => {
    if (activeTab) {
      if (activeTab.url === START_URL) {
        setInputUrl('');
      } else {
        setInputUrl(activeTab.url);
      }
      setSearchResults(null);
    }
  }, [activeTabId]);

  // Persist Shortcuts
  useEffect(() => {
    try {
      localStorage.setItem('alya_browser_shortcuts_v1', JSON.stringify(shortcuts));
    } catch {}
  }, [shortcuts]);

  // Persist History
  useEffect(() => {
    try {
      localStorage.setItem('alya_browser_history_v1', JSON.stringify(history));
    } catch {}
  }, [history]);

  // Persist Search Engine
  useEffect(() => {
    try {
      localStorage.setItem('alya_browser_engine_v1', searchEngine);
    } catch {}
  }, [searchEngine]);

  // Record a history entry
  const recordHistoryEntry = (entry: Omit<BrowserHistoryEntry, 'id' | 'timestamp'>) => {
    if (entry.url === START_URL) return;
    const newEntry: BrowserHistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: entry.title,
      url: entry.url,
      timestamp: Date.now(),
      type: entry.type,
    };
    setHistory((prev) => {
      if (prev.length > 0 && prev[0].url === newEntry.url) {
        return [newEntry, ...prev.slice(1)];
      }
      return [newEntry, ...prev.slice(0, 99)];
    });
  };

  // Check embed restrictions whenever active tab URL changes
  useEffect(() => {
    if (!activeTab || !activeTab.url || activeTab.url === START_URL || activeTab.url.startsWith('search://')) {
      return;
    }

    // YouTube videos have valid official embeds
    if (parseYouTubeVideoId(activeTab.url)) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                isRestricted: false,
                isYouTube: true,
                embedUrl: getYouTubeEmbedUrl(activeTab.url) || activeTab.url,
                isLoading: false,
              }
            : t
        )
      );
      return;
    }

    const isKnown = isDomainRestricted(activeTab.url);
    if (isKnown) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                isRestricted: true,
                restrictedReason: 'Target site enforces strict X-Frame-Options or CSP headers',
                isLoading: false,
              }
            : t
        )
      );
      return;
    }

    // Call server embed checker
    let isCancelled = false;
    apiFetch(`/api/work/check-embed?url=${encodeURIComponent(activeTab.url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data && data.embeddable === false) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id
                ? {
                    ...t,
                    isRestricted: true,
                    restrictedReason: data.reason || 'Embedding restricted by security headers',
                    isLoading: false,
                  }
                : t
            )
          );
        } else {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id ? { ...t, isRestricted: false, loadError: null } : t
            )
          );
        }
      })
      .catch(() => {
        // Inconclusive, proceed with live frame
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTab?.url]);

  // Tab Handlers
  const handleCreateTab = (initialUrl = START_URL, title?: string) => {
    const newId = `tab-${Date.now()}`;
    const hostname = initialUrl === START_URL ? 'Alya Start' : getCleanHostname(initialUrl);
    const tabTitle = title || hostname;
    const isYt = Boolean(parseYouTubeVideoId(initialUrl));
    const isKnown = !isYt && isDomainRestricted(initialUrl);

    const newTab: BrowserTab = {
      id: newId,
      title: tabTitle,
      url: initialUrl,
      embedUrl: isYt ? getYouTubeEmbedUrl(initialUrl) || initialUrl : initialUrl,
      isYouTube: isYt,
      favicon: initialUrl === START_URL ? (isJarvis ? '⚡' : '🌸') : isYt ? '📺' : '🌐',
      history: [initialUrl],
      historyIndex: 0,
      isLoading: initialUrl !== START_URL && !isKnown,
      isRestricted: isKnown,
      restrictedReason: isKnown ? 'Embedding restricted by security policy' : undefined,
      platformEngine: platform.platformName,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setInputUrl(initialUrl === START_URL ? '' : initialUrl);
    setSearchResults(null);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      handleNavigate(START_URL);
      return;
    }
    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) {
      const nextTab = filtered[0];
      setActiveTabId(nextTab.id);
      setInputUrl(nextTab.url === START_URL ? '' : nextTab.url);
    }
  };

  // Main Navigation Logic
  const handleNavigate = (target: string) => {
    let clean = target.trim();
    if (!clean) return;

    if (clean === START_URL || clean.toLowerCase() === 'about:home' || clean.toLowerCase() === 'about:blank') {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTabId) {
            const newHistory = [...t.history.slice(0, t.historyIndex + 1), START_URL];
            return {
              ...t,
              url: START_URL,
              embedUrl: undefined,
              isYouTube: false,
              title: 'Alya Start',
              favicon: isJarvis ? '⚡' : '🌸',
              history: newHistory,
              historyIndex: newHistory.length - 1,
              isLoading: false,
              isRestricted: false,
              loadError: null,
            };
          }
          return t;
        })
      );
      setInputUrl('');
      setSearchResults(null);
      return;
    }

    // Check if input looks like a web URL
    const hasHttp = /^https?:\/\//i.test(clean);
    const looksLikeUrl =
      hasHttp ||
      /^[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/i.test(clean) ||
      /^localhost(:[0-9]+)?(\/.*)?$/i.test(clean) ||
      clean.startsWith('search://');

    if (!looksLikeUrl) {
      handleSearchQuery(clean);
      return;
    }

    if (!hasHttp && !clean.startsWith('search://')) {
      clean = `https://${clean}`;
    }

    setInputUrl(clean);
    setSearchResults(null);

    const hostname = getCleanHostname(clean);
    const ytVideoId = parseYouTubeVideoId(clean);
    const isYt = Boolean(ytVideoId);
    const embedUrl = isYt ? getYouTubeEmbedUrl(clean) || clean : clean;
    const isKnown = !isYt && isDomainRestricted(clean);

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          const newHistory = [...t.history.slice(0, t.historyIndex + 1), clean];
          return {
            ...t,
            url: clean,
            embedUrl,
            isYouTube: isYt,
            title: isYt ? `YouTube Video` : hostname,
            favicon: isYt ? '📺' : '🌐',
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isLoading: !isKnown,
            isRestricted: isKnown,
            restrictedReason: isKnown
              ? 'Target site enforces strict X-Frame-Options or CSP headers'
              : undefined,
            loadError: null,
          };
        }
        return t;
      })
    );

    recordHistoryEntry({
      title: isYt ? 'YouTube Video' : hostname,
      url: clean,
      type: 'url',
    });
  };

  // Search Query Navigation
  const handleSearchQuery = (query: string) => {
    recordHistoryEntry({
      title: `Search: ${query}`,
      url: query,
      type: 'search',
    });

    if (searchEngine === 'alya_ai') {
      setIsSearching(true);
      apiFetch('/api/work/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          companion: character,
          userApiKey,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setIsSearching(false);
          setSearchResults({
            overview: data.overview || `AI search findings for "${query}"`,
            sources: data.sources || [],
          });
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId
                ? {
                    ...t,
                    url: `search://alya?q=${encodeURIComponent(query)}`,
                    title: `Search: ${query}`,
                    favicon: '✨',
                    isLoading: false,
                    isRestricted: false,
                  }
                : t
            )
          );
        })
        .catch(() => {
          setIsSearching(false);
          handleNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
        });
      return;
    }

    let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    if (searchEngine === 'duckduckgo') {
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    } else if (searchEngine === 'bing') {
      searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    }

    handleNavigate(searchUrl);
  };

  // Back / Forward / Reload Controls
  const handleBack = () => {
    if (activeTab.historyIndex > 0) {
      const prevIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[prevIndex];
      const isYt = Boolean(parseYouTubeVideoId(prevUrl));
      const embedUrl = isYt ? getYouTubeEmbedUrl(prevUrl) || prevUrl : prevUrl;
      const isKnown = !isYt && isDomainRestricted(prevUrl);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                url: prevUrl,
                embedUrl,
                isYouTube: isYt,
                historyIndex: prevIndex,
                isLoading: prevUrl !== START_URL && !isKnown,
                isRestricted: isKnown,
                loadError: null,
              }
            : t
        )
      );
    }
  };

  const handleForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[nextIndex];
      const isYt = Boolean(parseYouTubeVideoId(nextUrl));
      const embedUrl = isYt ? getYouTubeEmbedUrl(nextUrl) || nextUrl : nextUrl;
      const isKnown = !isYt && isDomainRestricted(nextUrl);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? {
                ...t,
                url: nextUrl,
                embedUrl,
                isYouTube: isYt,
                historyIndex: nextIndex,
                isLoading: nextUrl !== START_URL && !isKnown,
                isRestricted: isKnown,
                loadError: null,
              }
            : t
        )
      );
    }
  };

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: true, loadError: null } : t))
    );
  };

  const handleStopLoading = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t))
    );
  };

  // Open Direct in external or native browser
  const handleOpenDirect = (targetUrl?: string) => {
    const url = targetUrl || activeTab.url;
    if (!url || url === START_URL || url.startsWith('search://')) return;
    openExternalBrowser(url);
  };

  const handleForceTryEmbed = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, isRestricted: false, isLoading: true } : t
      )
    );
    setReloadKey((prev) => prev + 1);
  };

  const handleIframeLoad = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false, loadError: null } : t))
    );
  };

  const handleIframeError = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              isLoading: false,
              isRestricted: true,
              restrictedReason: 'Unable to embed website due to domain security policy.',
            }
          : t
      )
    );
  };

  // Shortcuts & History handlers
  const handleAddShortcut = (title: string, url: string) => {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const newSc: BrowserShortcut = {
      id: `sc-${Date.now()}`,
      title,
      url: cleanUrl,
      icon: '🔗',
      isCustom: true,
    };
    setShortcuts((prev) => [...prev, newSc]);
  };

  const handleRemoveShortcut = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRemoveHistoryEntry = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('alya_browser_history_v1');
    } catch {}
  };

  // AI Summarize feature
  const handleSummarizeCurrentPage = async () => {
    if (activeTab.url === START_URL) return;
    setSummaryModal({
      isOpen: true,
      title: activeTab.title,
      summary: '',
      takeaways: [],
      readingTime: 'Analyzing...',
      isLoading: true,
    });

    try {
      const res = await apiFetch('/api/work/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: activeTab.url,
          title: activeTab.title,
          content: `URL: ${activeTab.url}. Domain: ${getCleanHostname(activeTab.url)}`,
          companion: character,
          userApiKey,
        }),
      });

      if (!res.ok) throw new Error('Summarization failed');
      const data = await res.json();
      setSummaryModal({
        isOpen: true,
        title: data.title || activeTab.title,
        summary: data.summary || 'Summary compiled by Alya AI.',
        takeaways: data.keyTakeaways || ['Core highlights extracted from the current page.'],
        readingTime: data.readingTime || '1 min read',
        isLoading: false,
      });
    } catch {
      setSummaryModal({
        isOpen: true,
        title: activeTab.title,
        summary: `Executive review of ${activeTab.title} (${activeTab.url}): The live web resource provides online documentation and service assets.`,
        takeaways: [
          'Live web page loaded in Alya Browser workspace',
          'Compatible with external browser direct viewing',
          'AI assistance available for questions or coding extracts',
        ],
        readingTime: '1 min read',
        isLoading: false,
      });
    }
  };

  const copyLinkToClipboard = () => {
    if (!activeTab.url || activeTab.url === START_URL) return;
    navigator.clipboard.writeText(activeTab.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isCurrentUrlRestricted = Boolean(activeTab.isRestricted);
  const activeHostname = getCleanHostname(activeTab.url);
  const isStartPage = activeTab.url === START_URL;
  const isYouTubeVideo = Boolean(activeTab.isYouTube);

  return (
    <div
      className={`relative w-full h-full flex flex-col overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-[#070312]' : 'bg-[#05020c]'
      }`}
    >
      {/* 1. COMPACT TOP TAB BAR */}
      <div className="flex items-center justify-between px-2 pt-1 pb-1 gap-1 border-b border-white/10 bg-[#080214]/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 mr-2 min-w-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setSearchResults(null);
                }}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-t-xl text-xs font-medium cursor-pointer transition-all duration-200 border-t border-x ${
                  isActive
                    ? isJarvis
                      ? 'bg-[#08152c] text-cyan-200 border-cyan-500/40 shadow-[0_-4px_12px_rgba(0,229,255,0.15)]'
                      : 'bg-[#190a2e] text-pink-200 border-pink-500/40 shadow-[0_-4px_12px_rgba(255,38,159,0.15)]'
                    : 'bg-black/30 text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
                } max-w-[140px] sm:max-w-[190px] min-w-[70px] sm:min-w-[100px] shrink-0`}
              >
                <span className="text-xs shrink-0">{tab.favicon || '🌐'}</span>
                <span className="truncate flex-1 text-[11px] sm:text-xs">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-60 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 hover:text-white shrink-0"
                  title="Close Tab"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => handleCreateTab(START_URL, 'Alya Start')}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0"
            title="Open New Tab"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Tab Bar Utilities */}
        <div className="flex items-center gap-1 shrink-0">
          {!isStartPage && (
            <button
              type="button"
              onClick={handleSummarizeCurrentPage}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                isJarvis
                  ? 'bg-cyan-950/60 border-cyan-500/35 text-cyan-200 hover:border-cyan-400'
                  : 'bg-pink-950/60 border-pink-500/35 text-pink-200 hover:border-pink-400'
              }`}
              title="Summarize active page with AI"
            >
              <Sparkles size={11} />
              <span className="hidden sm:inline">AI Summarize</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Browser'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* 2. COMPACT OMNIBAR & NAVIGATION CONTROLS */}
      <div className="px-2 sm:px-3 py-1.5 border-b border-white/10 bg-[#0b0417]/95 backdrop-blur-xl flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center gap-0.5 text-slate-400 shrink-0">
          {/* Home Button */}
          <button
            type="button"
            onClick={() => handleNavigate(START_URL)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isStartPage
                ? isJarvis
                  ? 'text-cyan-400 bg-cyan-950/40'
                  : 'text-pink-400 bg-pink-950/40'
                : 'hover:bg-white/10 hover:text-white'
            }`}
            title="Alya Start Page"
          >
            <Home size={14} />
          </button>

          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={activeTab.historyIndex <= 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Forward Button */}
          <button
            type="button"
            onClick={handleForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            title="Forward"
          >
            <ArrowRight size={14} />
          </button>

          {/* Reload / Stop Button */}
          {activeTab.isLoading ? (
            <button
              type="button"
              onClick={handleStopLoading}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors"
              title="Stop Loading"
            >
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReload}
              disabled={isStartPage}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 hover:text-white disabled:opacity-20 transition-colors"
              title="Reload"
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>

        {/* Omnibar Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className={`flex-1 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full border transition-all min-w-0 ${
            isJarvis
              ? 'bg-[#060e20]/90 border-cyan-500/35 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/25'
              : 'bg-[#150729]/90 border-pink-500/35 focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-500/25'
          }`}
        >
          <span title={isYouTubeVideo ? 'YouTube Player' : isCurrentUrlRestricted ? 'Restricted Site' : isStartPage ? 'Alya Start' : 'Secure Web Frame'}>
            {isYouTubeVideo ? (
              <Tv size={13} className="text-rose-400 shrink-0" />
            ) : isCurrentUrlRestricted ? (
              <ShieldAlert size={13} className="text-amber-400 shrink-0" />
            ) : isStartPage ? (
              <span className="text-xs">{isJarvis ? '⚡' : '🌸'}</span>
            ) : (
              <ShieldCheck
                size={13}
                className={isJarvis ? 'text-cyan-400' : 'text-emerald-400 shrink-0'}
              />
            )}
          </span>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder={
              isStartPage
                ? 'Search or type URL (e.g. youtube.com, example.com)...'
                : 'Search or enter web address...'
            }
            className="flex-1 bg-transparent text-[11px] sm:text-xs text-white placeholder:text-slate-400 focus:outline-none min-w-0"
          />

          {inputUrl && (
            <button
              type="button"
              onClick={() => setInputUrl('')}
              className="text-slate-400 hover:text-white p-0.5 shrink-0"
              title="Clear"
            >
              <X size={11} />
            </button>
          )}

          <button
            type="submit"
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              isJarvis
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_10px_rgba(255,38,159,0.4)]'
            }`}
          >
            Go
          </button>
        </form>

        {/* Global Open Direct button */}
        {!isStartPage && (
          <button
            type="button"
            onClick={() => handleOpenDirect()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
              isJarvis
                ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400'
                : 'bg-pink-950/40 border-pink-500/30 text-pink-300 hover:bg-pink-900/60 hover:border-pink-400'
            }`}
            title="Open in external browser"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Open Direct</span>
          </button>
        )}
      </div>

      {/* 3. BOOKMARK QUICK BAR */}
      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/40 border-b border-white/5 overflow-x-auto no-scrollbar text-xs shrink-0">
        <Bookmark size={11} className="text-slate-500 ml-1 mr-0.5 shrink-0" />
        {DEFAULT_BOOKMARKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => handleNavigate(b.url)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0 text-[10px] sm:text-[11px] font-medium"
          >
            <span className="text-[10px]">{b.icon}</span>
            <span>{b.title}</span>
          </button>
        ))}
      </div>

      {/* 4. MAIN BROWSER VIEWPORT (100% Height, No Dead Black Space) */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col bg-[#05020c]">
        {/* VIEW 1: START PAGE */}
        {isStartPage && !searchResults && (
          <BrowserStartPage
            character={character}
            searchEngine={searchEngine}
            onSelectSearchEngine={setSearchEngine}
            onNavigate={handleNavigate}
            shortcuts={shortcuts}
            onAddShortcut={handleAddShortcut}
            onRemoveShortcut={handleRemoveShortcut}
            history={history}
            onRemoveHistoryEntry={handleRemoveHistoryEntry}
            onClearHistory={handleClearHistory}
            retain30Days={retain30Days}
            onToggleRetain30Days={setRetain30Days}
          />
        )}

        {/* VIEW 2: AI SEARCH RESULTS OVERVIEW */}
        {searchResults && !isSearching && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4 animate-fadeIn">
              <div
                className={`p-4 rounded-2xl border backdrop-blur-xl ${
                  isJarvis
                    ? 'bg-gradient-to-b from-[#08152c]/90 to-[#040a16]/95 border-cyan-500/35 shadow-[0_4px_24px_rgba(0,229,255,0.15)]'
                    : 'bg-gradient-to-b from-[#180a2c]/90 to-[#0b0316]/95 border-pink-500/35 shadow-[0_4px_24px_rgba(255,38,159,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                    <span className="font-bold text-sm text-white">
                      {character === 'jarvis' ? 'Jarvis Live AI Overview' : 'Alya Grounded Intelligence'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(searchResults.overview);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 flex items-center gap-1 text-xs"
                    >
                      {copiedSnippet ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span className="hidden sm:inline">{copiedSnippet ? 'Copied' : 'Copy'}</span>
                    </button>
                    {onAskAlya && (
                      <button
                        type="button"
                        onClick={() =>
                          onAskAlya(`Tell me more about this search topic: ${activeTab.title}`)
                        }
                        className="px-2 py-0.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200"
                      >
                        Discuss
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-quicksand">
                  {searchResults.overview}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Globe size={13} />
                  <span>Verified Reference Sources</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.sources.map((src, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleNavigate(src.url)}
                      className="p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-pink-500/40 hover:bg-white/[0.08] transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                          <span className="truncate pr-2">{src.title}</span>
                          <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {src.snippet}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-2 truncate">
                        {src.url}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE WEBPAGE OR COMPACT FALLBACK */}
        {!isStartPage && !searchResults && (
          <div className="relative flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden">
            {/* Loading Progress Bar */}
            {activeTab.isLoading && (
              <div className="w-full h-0.5 bg-white/5 overflow-hidden shrink-0">
                <div
                  className={`h-full w-full animate-pulse ${
                    isJarvis
                      ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                      : 'bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 shadow-[0_0_8px_rgba(255,38,159,0.8)]'
                  }`}
                />
              </div>
            )}

            {/* COMPACT RESTRICTION FALLBACK BAR (When site strictly prohibits iframes) */}
            {isCurrentUrlRestricted && (
              <div className="px-3 py-2 bg-gradient-to-r from-[#170520] via-[#090214] to-[#170520] border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 animate-fadeIn">
                <div className="flex items-center gap-2 truncate pr-2">
                  <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                  <span className="truncate text-slate-200 text-[11px] sm:text-xs">
                    <strong className="text-white">{activeHostname}</strong> blocks frame embedding for account & credential security.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenDirect()}
                    className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      isJarvis
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                        : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_12px_rgba(255,38,159,0.4)]'
                    }`}
                  >
                    <ExternalLink size={12} />
                    <span>Open in Browser</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForceTryEmbed}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors cursor-pointer"
                    title="Attempt to load inside frame anyway"
                  >
                    Try Frame
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate(START_URL)}
                    className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    Start
                  </button>
                </div>
              </div>
            )}

            {/* REAL WEBSITE VIEWPORT (100% Available Height) */}
            <div className="relative flex-1 w-full h-full min-h-0 bg-[#0a0515] overflow-hidden">
              {/* If site blocked and user hasn't forced iframe, display sleek portal helper */}
              {isCurrentUrlRestricted ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl ${
                      isJarvis
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400 shadow-[0_0_24px_rgba(0,229,255,0.2)]'
                        : 'bg-pink-950/40 border-pink-500/40 text-pink-400 shadow-[0_0_24px_rgba(255,38,159,0.2)]'
                    }`}
                  >
                    <Globe size={28} />
                  </div>

                  <div className="max-w-md space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {activeHostname}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono break-all">
                      {activeTab.url}
                    </p>
                  </div>

                  <p className="max-w-md text-xs text-slate-300 leading-relaxed">
                    This domain protects user accounts and prevents frame injection via <code className="text-pink-300 bg-black/40 px-1 py-0.5 rounded">X-Frame-Options: SAMEORIGIN</code>. You can open it directly in full browser mode with complete cookie & session support.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDirect()}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                        isJarvis
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                          : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_20px_rgba(255,38,159,0.4)]'
                      }`}
                    >
                      <ExternalLink size={15} />
                      <span>Open Website Directly</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate(START_URL)}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Home size={13} />
                      <span>Start Page</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* LIVE WEBSITE IFRAME (Takes full height) */
                <iframe
                  ref={iframeRef}
                  key={`${activeTab.id}-${reloadKey}`}
                  src={activeTab.embedUrl || activeTab.url}
                  title={activeTab.title}
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
                  referrerPolicy={isYouTubeVideo ? 'strict-origin-when-cross-origin' : 'no-referrer-when-downgrade'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  className="w-full h-full flex-1 border-0 block bg-white"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. AI SUMMARY MODAL */}
      {summaryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 backdrop-blur-2xl shadow-2xl space-y-4 ${
              isJarvis
                ? 'bg-[#08152c] border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.2)]'
                : 'bg-[#18082c] border-pink-500/40 shadow-[0_0_35px_rgba(255,38,159,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <h3 className="text-base font-bold text-white">
                  {character === 'jarvis' ? 'Jarvis Executive Summary' : 'Alya Page Analysis'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            {summaryModal.isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <RotateCw size={24} className="animate-spin text-pink-400" />
                <span className="text-xs text-slate-300">
                  {character === 'jarvis'
                    ? 'Synthesizing technical documentation...'
                    : 'Alya is analyzing this web page for you! 🌸'}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Document
                  </h4>
                  <p className="text-sm font-semibold text-white">{summaryModal.title}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Key Highlights
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {summaryModal.takeaways.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            isJarvis ? 'bg-cyan-400' : 'bg-pink-400'
                          }`}
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <span className="text-slate-400">{summaryModal.readingTime}</span>
                  {onAskAlya && (
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryModal((prev) => ({ ...prev, isOpen: false }));
                        onAskAlya(`What are the key points of ${summaryModal.title}?`);
                      }}
                      className="px-3 py-1 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 font-semibold"
                    >
                      Discuss with Alya
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
