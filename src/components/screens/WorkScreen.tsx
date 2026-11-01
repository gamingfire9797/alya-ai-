import React, { useState } from 'react';
import {
  Globe,
  Code2,
  FolderKanban,
  LayoutGrid,
  ArrowLeft,
  Sparkles,
  Zap,
  Sliders,
  Settings,
  Share2,
  Menu,
} from 'lucide-react';
import {
  CompanionCharacter,
  ExpressionType,
  WorkspaceTab,
  RecognitionState,
  AutoFeaturesSettings,
  ChatMessage,
} from '../../types';
import { BrowserWorkspace } from '../work/Workspaces/BrowserWorkspace';
import { CodingWorkspace } from '../work/Workspaces/CodingWorkspace';
import { FilesWorkspace } from '../work/Workspaces/FilesWorkspace';
import { AppsWorkspace } from '../work/Workspaces/AppsWorkspace';
import { WorkAssistantBar } from '../work/WorkAssistantBar';

interface WorkScreenProps {
  character: CompanionCharacter;
  onSwitchCompanion: (c: CompanionCharacter) => void;
  expression: ExpressionType;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  userName: string;
  userApiKey?: string;
  hasGeminiKey: boolean;
  isAutoVoiceActive: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onToggleVoice: () => void;
  onSendMessage: (text: string, imageAttachment?: string) => void;
  onReturnToNormalMode: () => void;
  onOpenDrawer: () => void;
  lastVoiceTranscript?: string;
  onStopSpeaking?: () => void;
  autoFeatures?: AutoFeaturesSettings;
  onUpdateAutoFeatures?: (updated: Partial<AutoFeaturesSettings>) => void;
  messages?: ChatMessage[];
  micErrorMessage?: string | null;
}

export const WorkScreen: React.FC<WorkScreenProps> = ({
  character,
  onSwitchCompanion,
  expression,
  isSpeaking,
  isListening,
  isThinking,
  userName,
  userApiKey,
  hasGeminiKey,
  isAutoVoiceActive,
  isMuted = false,
  onToggleMute,
  onToggleVoice,
  onSendMessage,
  onReturnToNormalMode,
  onOpenDrawer,
  lastVoiceTranscript = '',
  onStopSpeaking,
  autoFeatures,
  onUpdateAutoFeatures,
  messages = [],
  micErrorMessage,
}) => {
  const isJarvis = character === 'jarvis';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('browser');

  // Shared clipboard / bridge between workspaces
  const [injectedCode, setInjectedCode] = useState<{ code: string; language: string; title: string } | null>(null);

  const handleOpenInCoding = (name: string, content: string) => {
    setInjectedCode({
      title: name,
      code: content,
      language: name.endsWith('.py') ? 'python' : name.endsWith('.html') ? 'html' : 'javascript',
    });
    setActiveTab('coding');
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSaveToFile = (name: string, content: string) => {
    // Automatically injects into virtual files
    try {
      const stored = localStorage.getItem('alya_workspace_files_v1');
      const currentFiles = stored ? JSON.parse(stored) : [];
      const newFile = {
        id: `wf-${Date.now()}`,
        name,
        path: `/workspace/${name}`,
        type: name.endsWith('.md') ? 'markdown' : name.endsWith('.json') ? 'json' : 'code',
        size: content.length,
        updatedAt: new Date().toLocaleDateString(),
        content,
      };
      localStorage.setItem('alya_workspace_files_v1', JSON.stringify([newFile, ...currentFiles]));
    } catch {}
    setToastMessage(`✓ File "${name}" saved to Files Workspace!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-[#05020c] text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fadeIn">
          {toastMessage}
        </div>
      )}
      {/* 1. TOP WORKSTATION HEADER */}
      <header className="relative z-30 w-full px-3 sm:px-6 pt-2 pb-2 border-b border-white/10 bg-[#080214]/90 backdrop-blur-2xl flex items-center justify-between gap-2 shrink-0">
        {/* Left: Brand & Return to Voice Mode */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onReturnToNormalMode}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isJarvis
                ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200 hover:border-cyan-400'
                : 'bg-pink-950/70 border-pink-500/40 text-pink-200 hover:border-pink-400'
            }`}
            title="Return to Normal Voice Mode"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Voice Mode</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg">{isJarvis ? '⚡' : '🌸'}</span>
            <div>
              <h1 className="text-xs sm:text-sm font-bold font-comfortaa leading-none text-white flex items-center gap-1">
                <span>{isJarvis ? 'Jarvis Workstation' : 'Alya Workstation'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v3.8
                </span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                Dynamic Productivity Suite
              </p>
            </div>
          </div>
        </div>

        {/* Center: Dynamic Workspace Switcher Tabs */}
        <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl p-1 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'browser'
                ? isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe size={13} />
            <span className="hidden sm:inline">Browser</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'coding'
                ? isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code2 size={13} />
            <span className="hidden sm:inline">Coding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'files'
                ? isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderKanban size={13} />
            <span className="hidden sm:inline">Files</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'apps'
                ? isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={13} />
            <span className="hidden sm:inline">Apps</span>
          </button>
        </div>

        {/* Right: Companion Switcher Pill & Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/10 shadow-sm">
            <button
              type="button"
              onClick={() => onSwitchCompanion('alya')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                !isJarvis ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌸
            </button>
            <button
              type="button"
              onClick={() => onSwitchCompanion('jarvis')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                isJarvis ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenDrawer}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isJarvis
                ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
                : 'bg-pink-950/40 border-pink-500/30 text-pink-300 hover:border-pink-400'
            }`}
            title="Open Menu Drawer"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {/* 2. MAIN ACTIVE WORKSPACE VIEWPORT */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col z-10">
        {activeTab === 'browser' && (
          <BrowserWorkspace
            character={character}
            userApiKey={userApiKey}
            onSendToCoding={handleOpenInCoding}
            onSaveToFile={handleSaveToFile}
            onAskAlya={(prompt) => onSendMessage(prompt)}
          />
        )}

        {activeTab === 'coding' && (
          <CodingWorkspace
            character={character}
            userApiKey={userApiKey}
            injectedCode={injectedCode}
            onSaveToFile={handleSaveToFile}
            onAskAlya={(prompt) => onSendMessage(prompt)}
          />
        )}

        {activeTab === 'files' && (
          <FilesWorkspace
            character={character}
            onOpenInCoding={handleOpenInCoding}
            onOpenInBrowser={(name, content) => {
              setActiveTab('browser');
            }}
          />
        )}

        {activeTab === 'apps' && (
          <AppsWorkspace
            character={character}
            userApiKey={userApiKey}
            onAskAlya={(prompt) => onSendMessage(prompt)}
            onSaveToFile={handleSaveToFile}
          />
        )}
      </main>

      {/* 3. DOCKED AI WORK ASSISTANT COMPANION BAR & CHAT COMPOSER */}
      <WorkAssistantBar
        character={character}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isThinking={isThinking}
        isAutoVoiceActive={isAutoVoiceActive}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onToggleVoice={onToggleVoice}
        onReturnToNormalMode={onReturnToNormalMode}
        onSendMessage={(text) => onSendMessage(text)}
        lastTranscript={lastVoiceTranscript}
        onStopSpeaking={onStopSpeaking}
        messages={messages}
        micErrorMessage={micErrorMessage}
      />
    </div>
  );
};
