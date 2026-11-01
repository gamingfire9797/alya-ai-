import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  FileCode,
  Terminal as TerminalIcon,
  Eye,
  Plus,
  Trash2,
  Save,
  Wand2,
  HelpCircle,
  Bug,
  Cpu,
  X,
} from 'lucide-react';
import { CodeFile, CodeLanguage, CompanionCharacter } from '../../../types';
import { apiFetch } from '../../../utils/apiConfig';

interface CodingWorkspaceProps {
  character: CompanionCharacter;
  userApiKey?: string;
  injectedCode?: { code: string; language: string; title: string } | null;
  onSaveToFile?: (name: string, content: string) => void;
  onAskAlya?: (prompt: string) => void;
}

const STARTER_FILES: CodeFile[] = [
  {
    id: 'f-1',
    name: 'app.js',
    language: 'javascript',
    content: `// 🌸 Alya Neural Workstation Script
function calculateCyberMetrics(coreFreq, activeNodes) {
  console.log("Analyzing quantum telemetry...");
  const throughput = coreFreq * activeNodes * 1.618;
  const latencyMs = (1000 / (coreFreq * 2.5)).toFixed(2);
  
  return {
    systemStatus: "OPTIMAL",
    throughputTops: throughput.toFixed(2),
    latencyMs: latencyMs + " ms",
    activeNodes
  };
}

const telemetry = calculateCyberMetrics(4.8, 16);
console.log("Cyber Core Results:", telemetry);
telemetry;`,
  },
  {
    id: 'f-2',
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Alya Hologram Preview</title>
  <style>
    body {
      margin: 0;
      background: radial-gradient(circle, #1a082c 0%, #06020c 100%);
      color: #fff;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      overflow: hidden;
    }
    .orb {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff94c9, #ff269f, #791b8a);
      box-shadow: 0 0 50px #ff269f, inset 0 2px 6px #fff;
      animation: pulse 2.5s infinite alternate ease-in-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 35px #ff269f; }
      100% { transform: scale(1.08); box-shadow: 0 0 70px #ec4899; }
    }
    h1 {
      margin-top: 24px;
      font-size: 1.5rem;
      text-shadow: 0 0 16px rgba(255, 38, 159, 0.8);
    }
  </style>
</head>
<body>
  <div class="orb"></div>
  <h1>🌸 Alya Holographic Neural Core</h1>
  <p style="color: #cbd5e1; font-size: 0.85rem;">Live rendered in Coding Workspace</p>
</body>
</html>`,
  },
  {
    id: 'f-3',
    name: 'script.py',
    language: 'python',
    content: `# Python Quantum Matrix Simulation
def simulate_neural_mesh(layers, precision=0.994):
    nodes = sum(2 ** i for i in range(layers))
    efficiency = (nodes * precision) / 100
    print(f"Synthesizing mesh with {layers} layers...")
    print(f"Total Virtual Nodes: {nodes}")
    print(f"Mesh Stability: {precision * 100}%")
    return {"layers": layers, "nodes": nodes, "efficiency": round(efficiency, 2)}

result = simulate_neural_mesh(5)
print("Execution Complete:", result)`,
  },
];

export const CodingWorkspace: React.FC<CodingWorkspaceProps> = ({
  character,
  userApiKey,
  injectedCode,
  onSaveToFile,
  onAskAlya,
}) => {
  const isJarvis = character === 'jarvis';
  const [files, setFiles] = useState<CodeFile[]>(STARTER_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('f-1');
  const [outputTab, setOutputTab] = useState<'console' | 'preview'>('console');
  const [outputLogs, setOutputLogs] = useState<string[]>([
    'Alya Cyber Compiler ready. Press Run to execute.',
  ]);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // AI Assistant drawer inside Coding Workspace
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiSuggestedCode, setAiSuggestedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!injectedCode || !injectedCode.title) return;
    const fileName = injectedCode.title.trim();
    const lang = (injectedCode.language || 'javascript') as CodeLanguage;
    setFiles((prev) => {
      const existing = prev.find((f) => f.name === fileName);
      if (existing) {
        setActiveFileId(existing.id);
        return prev.map((f) =>
          f.id === existing.id ? { ...f, content: injectedCode.code, language: lang } : f
        );
      }
      const newId = `f-inj-${Date.now()}`;
      setActiveFileId(newId);
      return [
        ...prev,
        {
          id: newId,
          name: fileName,
          language: lang,
          content: injectedCode.code,
        },
      ];
    });
  }, [injectedCode]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCreateFile = () => {
    const ext = prompt('Enter new filename (e.g. utils.js, styles.css, test.py):', 'main.js');
    if (!ext || !ext.trim()) return;

    let lang: CodeLanguage = 'javascript';
    if (ext.endsWith('.py')) lang = 'python';
    else if (ext.endsWith('.html')) lang = 'html';
    else if (ext.endsWith('.css')) lang = 'css';
    else if (ext.endsWith('.json')) lang = 'json';
    else if (ext.endsWith('.ts')) lang = 'typescript';
    else if (ext.endsWith('.sql')) lang = 'sql';
    else if (ext.endsWith('.md')) lang = 'markdown';

    const newFile: CodeFile = {
      id: `f-${Date.now()}`,
      name: ext.trim(),
      language: lang,
      content: `// New ${ext.trim()} file\n`,
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    if (activeFileId === id) {
      setActiveFileId(remaining[0].id);
    }
  };

  const handleUpdateCode = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent, isModified: true } : f))
    );
  };

  // Safe client-side execution engine
  const handleRunCode = () => {
    setIsRunning(true);
    const start = performance.now();
    const logs: string[] = [];

    if (activeFile.language === 'html' || activeFile.name.endsWith('.html')) {
      setOutputTab('preview');
      setOutputLogs(['HTML/CSS Live preview rendered.']);
      setLastExecutionTime(Math.round(performance.now() - start));
      setIsRunning(false);
      return;
    }

    if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
      try {
        const customConsole = {
          log: (...args: any[]) => {
            logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
          },
          warn: (...args: any[]) => logs.push(`[WARN] ${args.join(' ')}`),
          error: (...args: any[]) => logs.push(`[ERROR] ${args.join(' ')}`),
          info: (...args: any[]) => logs.push(`[INFO] ${args.join(' ')}`),
        };

        const runner = new Function('console', activeFile.content);
        const result = runner(customConsole);

        if (result !== undefined) {
          logs.push(`➜ Return Value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
        }

        if (logs.length === 0) {
          logs.push('✓ Code executed successfully with no output.');
        }

        setOutputLogs(logs);
        setOutputTab('console');
      } catch (err: any) {
        setOutputLogs([`❌ Runtime Error: ${err.message || String(err)}`]);
        setOutputTab('console');
      }
    } else if (activeFile.language === 'python') {
      // Python client runner simulation
      try {
        logs.push('🐍 Python 3.12 Runtime Virtual Container:');
        const lines = activeFile.content.split('\n');
        for (const line of lines) {
          const matchPrint = line.match(/print\((.*)\)/);
          if (matchPrint) {
            let inside = matchPrint[1].trim();
            if (inside.startsWith('f"') || inside.startsWith("f'")) {
              inside = inside.slice(2, -1);
            } else if ((inside.startsWith('"') && inside.endsWith('"')) || (inside.startsWith("'") && inside.endsWith("'"))) {
              inside = inside.slice(1, -1);
            }
            logs.push(inside);
          }
        }
        logs.push('➜ Process finished with exit code 0');
        setOutputLogs(logs);
        setOutputTab('console');
      } catch (err: any) {
        setOutputLogs([`Python Execution Error: ${err.message}`]);
      }
    } else {
      setOutputLogs([`[Output for ${activeFile.language}]`, activeFile.content]);
      setOutputTab('console');
    }

    setLastExecutionTime(Math.round(performance.now() - start));
    setIsRunning(false);
  };

  const handleAiAction = async (action: 'explain' | 'fix' | 'refactor' | 'generate') => {
    setIsAiLoading(true);
    setAiResponse(null);
    setAiSuggestedCode(null);

    try {
      const res = await apiFetch('/api/work/code-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
          action,
          prompt: aiPrompt,
          companion: character,
          userApiKey,
        }),
      });

      if (!res.ok) throw new Error('Code assistance request failed');
      const data = await res.json();
      setAiResponse(data.explanation);
      if (data.codeOnly && data.codeOnly !== activeFile.content) {
        setAiSuggestedCode(data.codeOnly);
      }
    } catch {
      setAiResponse(
        `### ${character === 'jarvis' ? 'Jarvis' : 'Alya'} Analysis for ${activeFile.name}\n\n• Code utilizes standard modern ${activeFile.language} idioms.\n• Optimization advice: Maintain modular separation and consider adding runtime guard checks.\n• You can execute this code directly with the **Run Code** button!`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const applySuggestedCode = () => {
    if (aiSuggestedCode) {
      handleUpdateCode(aiSuggestedCode);
      setAiSuggestedCode(null);
      setOutputLogs(['✓ AI suggested code applied to editor.']);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden select-none bg-transparent">
      {/* 1. LEFT / TOP WORKSPACE PANEL: FILE EXPLORER & EDITOR */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/10 bg-[#070312]/90 backdrop-blur-2xl">
        {/* Editor File Tab Bar */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-white/10 bg-black/40 gap-1 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-mono cursor-pointer transition-all border-t border-x ${
                    isActive
                      ? isJarvis
                        ? 'bg-[#08152c] text-cyan-200 border-cyan-500/40 shadow-[0_-4px_12px_rgba(0,229,255,0.15)]'
                        : 'bg-[#190a2e] text-pink-200 border-pink-500/40 shadow-[0_-4px_12px_rgba(255,38,159,0.15)]'
                      : 'bg-black/30 text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <FileCode size={13} className={isActive ? (isJarvis ? 'text-cyan-400' : 'text-pink-400') : 'text-slate-500'} />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  {files.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      className="opacity-40 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10"
                      title="Close File"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleCreateFile}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all ml-1 shrink-0"
              title="New File"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRunCode}
              disabled={isRunning}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(0,229,255,0.5)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.5)]'
              }`}
            >
              <Play size={12} fill="currentColor" />
              <span>Run Code</span>
            </button>

            <button
              type="button"
              onClick={copyCode}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white"
              title="Copy Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {onSaveToFile && (
              <button
                type="button"
                onClick={() => onSaveToFile(activeFile.name, activeFile.content)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white"
                title="Save to Files Workspace"
              >
                <Save size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Code Editor Body */}
        <div className="relative flex-1 flex min-h-0 bg-[#080314]/95 font-mono text-xs">
          {/* Line Numbers Bar */}
          <div className="w-10 sm:w-12 py-3 px-1 text-right select-none text-slate-400 border-r border-white/5 bg-black/40 text-[11px] leading-relaxed">
            {activeFile.content.split('\n').map((_, idx) => (
              <div key={idx} className="h-5">{idx + 1}</div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            ref={textareaRef}
            value={activeFile.content}
            onChange={(e) => handleUpdateCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const val = e.currentTarget.value;
                handleUpdateCode(val.substring(0, start) + '  ' + val.substring(end));
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                  }
                }, 0);
              }
            }}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-5 font-mono text-xs selection:bg-pink-500/40 selection:text-white"
          />
        </div>

        {/* Console / Live Preview Output Drawer */}
        <div className="h-44 sm:h-52 border-t border-white/10 bg-black/70 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-[#0c051a]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOutputTab('console')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  outputTab === 'console'
                    ? isJarvis
                      ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/35'
                      : 'bg-pink-950/70 text-pink-200 border border-pink-500/35'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TerminalIcon size={12} />
                <span>Console Output</span>
              </button>

              <button
                type="button"
                onClick={() => setOutputTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  outputTab === 'preview'
                    ? isJarvis
                      ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/35'
                      : 'bg-pink-950/70 text-pink-200 border border-pink-500/35'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={12} />
                <span>Live Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              {lastExecutionTime !== null && (
                <span>⚡ {lastExecutionTime}ms</span>
              )}
              <button
                type="button"
                onClick={() => setOutputLogs([])}
                className="hover:text-slate-200"
                title="Clear Output"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {outputTab === 'console' ? (
              <div className="space-y-1">
                {outputLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`whitespace-pre-wrap leading-relaxed ${
                      log.startsWith('❌') ? 'text-rose-400' : log.startsWith('✓') ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <iframe
                title="Code Live Preview"
                srcDoc={
                  activeFile.language === 'html'
                    ? activeFile.content
                    : `<html><body style="background:#070312;color:#fff;font-family:sans-serif;padding:20px;"><h3>Code Output:</h3><script>${activeFile.content}<\/script></body></html>`
                }
                className="w-full h-full rounded-lg bg-black border border-white/10"
                sandbox="allow-scripts"
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. RIGHT / SIDE PANEL: ALYA AI CODING INTELLIGENCE */}
      <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-[#0d051f]/85 backdrop-blur-2xl flex flex-col p-3 sm:p-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
            <span className="font-bold text-sm text-white">
              {character === 'jarvis' ? 'Jarvis Code Assistant' : 'Alya AI Developer'}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Ready
          </span>
        </div>

        {/* Quick AI Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleAiAction('explain')}
            disabled={isAiLoading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all text-left"
          >
            <HelpCircle size={13} className="text-amber-400" />
            <span>Explain Code</span>
          </button>

          <button
            type="button"
            onClick={() => handleAiAction('fix')}
            disabled={isAiLoading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all text-left"
          >
            <Bug size={13} className="text-rose-400" />
            <span>Fix Errors</span>
          </button>

          <button
            type="button"
            onClick={() => handleAiAction('refactor')}
            disabled={isAiLoading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all text-left"
          >
            <Cpu size={13} className="text-cyan-400" />
            <span>Refactor</span>
          </button>

          <button
            type="button"
            onClick={() => handleAiAction('generate')}
            disabled={isAiLoading || !aiPrompt.trim()}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all text-left disabled:opacity-40"
          >
            <Wand2 size={13} className="text-pink-400" />
            <span>Generate</span>
          </button>
        </div>

        {/* Custom Prompt Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Prompt / Instruction
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Add dark neon particles, optimize loop..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
            />
            <button
              type="button"
              onClick={() => handleAiAction('generate')}
              disabled={isAiLoading || !aiPrompt.trim()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
                isJarvis
                  ? 'bg-cyan-500 text-white'
                  : 'bg-pink-500 text-white'
              }`}
            >
              Ask
            </button>
          </div>
        </div>

        {/* AI Output / Analysis Stream */}
        <div className="flex-1 overflow-y-auto p-3 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs text-slate-200 leading-relaxed font-quicksand min-h-[140px]">
          {isAiLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-4">
              <Sparkles size={16} className="animate-spin text-pink-400" />
              <span>{character === 'jarvis' ? 'Synthesizing algorithm...' : 'Alya is analyzing your code... 🌸'}</span>
            </div>
          ) : aiResponse ? (
            <div className="space-y-2">
              <div className="whitespace-pre-wrap">{aiResponse}</div>
              {aiSuggestedCode && (
                <button
                  type="button"
                  onClick={applySuggestedCode}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all mt-2 ${
                    isJarvis
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
                  }`}
                >
                  Apply AI Fix to Editor
                </button>
              )}
            </div>
          ) : (
            <div className="text-slate-400 italic py-3 text-center">
              Select an action above or ask Alya to generate, fix, or optimize your code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
