import React, { useState, useEffect } from 'react';
import {
  Presentation,
  Plus,
  ExternalLink,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Layers,
  ChevronRight,
  RefreshCw,
  FileText,
  Sliders,
  Shield,
  X,
} from 'lucide-react';
import { CompanionCharacter } from '../../types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from '../../utils/workspaceAuth';
import {
  SlidesService,
  SavedPresentationMeta,
  GeneratedDeckPlan,
} from '../../utils/slidesService';
import { playChime } from '../../utils/audio';

interface SlidesScreenProps {
  character: CompanionCharacter;
  userName?: string;
  userApiKey?: string;
  onBackToHome?: () => void;
}

const PRESET_TOPICS = [
  {
    title: 'AI Companion & Cognitive Architecture',
    desc: 'Neural voice pipelines, emotion models, and streaming latency',
    slides: 5,
  },
  {
    title: 'Startup Pitch Deck',
    desc: 'Problem statement, solution, business model, and vision',
    slides: 5,
  },
  {
    title: 'Weekly Sprint & Project Review',
    desc: 'Milestones achieved, blockers resolved, and next steps',
    slides: 4,
  },
  {
    title: 'Study Notes: Quantum Computing',
    desc: 'Core principles, qubits, superposition, and applications',
    slides: 4,
  },
];

export const SlidesScreen: React.FC<SlidesScreenProps> = ({
  character,
  userName = 'friend',
  userApiKey,
}) => {
  const isJarvis = character === 'jarvis';

  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasAuthToken, setHasAuthToken] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Slides State
  const [presentations, setPresentations] = useState<SavedPresentationMeta[]>(() =>
    SlidesService.getRecentPresentations()
  );
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');

  // Generator form
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationSuccess, setGenerationSuccess] = useState<SavedPresentationMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Destructive Action Confirmation Modal (MANDATORY per Workspace guidelines)
  const [itemToDelete, setItemToDelete] = useState<SavedPresentationMeta | null>(null);

  useEffect(() => {
    // Listen for Firebase Auth changes
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasAuthToken(!!token);
        setAuthError(null);
      },
      () => {
        setCurrentUser(null);
        setHasAuthToken(false);
      }
    );

    // Initial check for cached in-memory token
    getAccessToken().then((token) => {
      setHasAuthToken(!!token);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasAuthToken(true);
        playChime('receive');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err?.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
    setHasAuthToken(false);
    playChime('switch');
  };

  const handleCreateDeck = async (targetTopic: string, count: number) => {
    const finalTopic = (targetTopic || topic).trim();
    if (!finalTopic) return;

    if (!hasAuthToken) {
      setErrorMsg('Please connect your Google account with the Sign in with Google button first.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationSuccess(null);

    try {
      setGenerationStep(`Alya is generating structured slide content for "${finalTopic}"...`);
      playChime('send');

      // 1. AI generates structured deck outline
      const deckPlan = await SlidesService.generateDeckOutline(finalTopic, count, userApiKey);

      setGenerationStep('Connecting to Google Slides API & provisioning new presentation...');

      // 2. Build presentation in Google Slides
      const createdMeta = await SlidesService.buildSlideDeck(deckPlan);

      setGenerationStep('Formatting slides, layouts, and typography...');
      await new Promise((r) => setTimeout(r, 600));

      setPresentations(SlidesService.getRecentPresentations());
      setGenerationSuccess(createdMeta);
      setTopic('');
      playChime('heart');
    } catch (err: any) {
      console.error('Creation error:', err);
      setErrorMsg(err?.message || 'Failed to generate presentation deck in Google Slides.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    SlidesService.removeRecentPresentation(itemToDelete.id);
    setPresentations(SlidesService.getRecentPresentations());
    if (generationSuccess?.id === itemToDelete.id) {
      setGenerationSuccess(null);
    }
    setItemToDelete(null);
    playChime('click');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-transparent text-white select-none pb-24">
      {/* Top Banner */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                isJarvis
                  ? 'bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border border-amber-500/40 text-amber-300'
                  : 'bg-gradient-to-tr from-pink-500/20 to-purple-500/30 border border-pink-500/40 text-pink-300'
              }`}
            >
              <Presentation size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-comfortaa text-white">Google Slides Studio</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Create and manage presentations with {isJarvis ? 'Jarvis' : 'Alya'}
              </p>
            </div>
          </div>

          {/* Auth State Pill */}
          <div>
            {hasAuthToken && currentUser ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full py-1.5 px-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-semibold text-emerald-300">
                  {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="text-white font-medium max-w-[120px] truncate">
                    {currentUser.displayName || 'Google User'}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Disconnect Google Account"
                  className="p-1 hover:text-rose-400 text-slate-400 transition-colors ml-1"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Authentication Card if not connected */}
        {!hasAuthToken && (
          <div className="glass-card rounded-2xl p-6 mb-6 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-black/40 to-black/60 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm mb-1">
                  <Shield size={16} />
                  <span>Connect Google Slides with Permission</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in with your Google account to grant permission for {isJarvis ? 'Jarvis' : 'Alya'} to create, format, and organize slide decks directly inside your Google Slides account.
                </p>
                {authError && (
                  <p className="text-xs text-rose-400 mt-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                    {authError}
                  </p>
                )}
              </div>

              {/* Official Google Sign-In Button */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="gsi-material-button shadow-md"
                >
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? isJarvis
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} />
            <span>AI Slide Deck Creator</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'library'
                ? isJarvis
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span>Recent Decks ({presentations.length})</span>
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Success Toast */}
            {generationSuccess && (
              <div className="glass-panel rounded-2xl p-5 border border-emerald-500/40 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Presentation Ready in Google Slides!</h3>
                    <p className="text-xs text-emerald-200/80">
                      &quot;{generationSuccess.title}&quot; ({generationSuccess.slideCount} slides)
                    </p>
                  </div>
                </div>
                <a
                  href={generationSuccess.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 shrink-0"
                >
                  <span>Open in Google Slides</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="glass-panel rounded-xl p-4 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Custom Generator Form */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                <span>What would you like a presentation about?</span>
              </h2>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="E.g., Quantum Computing Basics, Q3 Product Launch, AI Agent Architecture..."
                    disabled={isGenerating}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateDeck(topic, slideCount);
                    }}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Number of slides:</span>
                    {[3, 5, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSlideCount(count)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          slideCount === count
                            ? isJarvis
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-pink-500 text-white shadow-sm'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {count} Slides
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCreateDeck(topic, slideCount)}
                    disabled={isGenerating || !topic.trim()}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                      isGenerating || !topic.trim()
                        ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400'
                        : isJarvis
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95'
                        : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:brightness-110 active:scale-95'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating Slide Deck...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Create in Google Slides</span>
                      </>
                    )}
                  </button>
                </div>

                {isGenerating && generationStep && (
                  <div className="mt-2 p-3 bg-black/30 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-yellow-300 animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    <span>{generationStep}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Or Pick an Inspiration Deck
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_TOPICS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isGenerating) {
                        setTopic(preset.title);
                        setSlideCount(preset.slides);
                        handleCreateDeck(preset.title, preset.slides);
                      }
                    }}
                    className={`glass-panel rounded-xl p-4 border border-white/10 hover:border-yellow-500/40 cursor-pointer transition-all hover:translate-y-[-2px] group ${
                      isGenerating ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors">
                        {preset.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 shrink-0">
                        {preset.slides} slides
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{preset.desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-yellow-400/90 group-hover:text-yellow-300">
                      <span>Generate this deck</span>
                      <ChevronRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIBRARY TAB */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            {presentations.length === 0 ? (
              <div className="glass-panel rounded-2xl p-10 text-center border border-white/10 flex flex-col items-center justify-center">
                <Presentation size={36} className="text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No presentations yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Create your first presentation deck above and {isJarvis ? 'Jarvis' : 'Alya'} will automatically organize it in your Google Slides library.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isJarvis
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-pink-500 text-white font-bold'
                  }`}
                >
                  Create New Presentation
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {presentations.map((p) => (
                  <div
                    key={p.id}
                    className="glass-panel rounded-xl p-4 border border-white/10 hover:border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{p.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>{p.slideCount} slides</span>
                          <span>•</span>
                          <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <span>Open Deck</span>
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => setItemToDelete(p)}
                        title="Delete presentation"
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE ACTION (per Workspace Skill) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel rounded-2xl p-6 max-w-md w-full border border-rose-500/30 bg-[#151221] shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Presentation?</h3>
                <p className="text-xs text-slate-400">Confirmation required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to remove &quot;<span className="text-white font-semibold">{itemToDelete.title}</span>&quot; from your companion presentation library? This will remove the presentation reference from this app.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
              >
                <Trash2 size={13} />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
