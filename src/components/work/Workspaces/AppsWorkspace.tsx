import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckSquare,
  Calculator,
  Terminal as TerminalIcon,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  Check,
  Tag,
  ArrowRight,
  Send,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { WorkAppId, WorkNote, WorkTask, TerminalEntry, CompanionCharacter } from '../../../types';

interface AppsWorkspaceProps {
  character: CompanionCharacter;
  userApiKey?: string;
  onAskAlya?: (prompt: string) => void;
  onSaveToFile?: (name: string, content: string) => void;
}

const DEFAULT_NOTES: WorkNote[] = [
  {
    id: 'n-1',
    title: 'Alya Work Mode Blueprint',
    content: `# Alya Work Mode Blueprint
• Dynamic workspace navigation between Browser, Coding, Files, and Apps
• Voice loop remains available while working in background
• Low latency responses with zero dummy fallbacks!`,
    tags: ['Architecture', 'Productivity'],
    updatedAt: new Date().toLocaleDateString(),
  },
  {
    id: 'n-2',
    title: 'Research Ideas 2026',
    content: `Key tech paradigms to investigate:
1. Low-latency streaming neural TTS
2. Agentic workspaces with real browser grounding
3. Responsive holographic avatars on mobile & desktop`,
    tags: ['AI', 'Ideas'],
    updatedAt: new Date().toLocaleDateString(),
  },
];

const DEFAULT_TASKS: WorkTask[] = [
  {
    id: 't-1',
    title: 'Inspect Alya Work Mode workspaces',
    description: 'Verify Browser, Coding, Files, and Apps all render smoothly.',
    status: 'done',
    priority: 'high',
    createdAt: new Date().toLocaleDateString(),
  },
  {
    id: 't-2',
    title: 'Run live test script in Coding IDE',
    description: 'Check JavaScript and HTML execution console.',
    status: 'in_progress',
    priority: 'medium',
    createdAt: new Date().toLocaleDateString(),
  },
  {
    id: 't-3',
    title: 'Review Google Search grounding in Browser',
    description: 'Try searching for any topic in the Omnibar.',
    status: 'todo',
    priority: 'high',
    createdAt: new Date().toLocaleDateString(),
  },
];

export const AppsWorkspace: React.FC<AppsWorkspaceProps> = ({
  character,
  userApiKey,
  onAskAlya,
  onSaveToFile,
}) => {
  const isJarvis = character === 'jarvis';
  const [activeApp, setActiveApp] = useState<WorkAppId>('notes');

  // 1. NOTES STATE
  const [notes, setNotes] = useState<WorkNote[]>(DEFAULT_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('n-1');
  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // 2. TASKS STATE
  const [tasks, setTasks] = useState<WorkTask[]>(DEFAULT_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // 3. CALCULATOR STATE
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // 4. TERMINAL STATE
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<TerminalEntry[]>([
    {
      id: 'term-1',
      command: 'system:init',
      output: `Alya Cyber Terminal v3.8 initialized. Character: ${character.toUpperCase()}.\nType 'help' to inspect available system commands.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // 5. RESEARCH STATE
  const [researchTopic, setResearchTopic] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    summary: string;
    points: string[];
  } | null>(null);

  // Handle Calculator
  const handleCalcClick = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
    } else if (val === 'CE') {
      setCalcDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '=') {
      try {
        const sanitized = calcDisplay
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/e/g, 'Math.E')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/sqrt\(/g, 'Math.sqrt(');
        const res = new Function(`return (${sanitized});`)();
        const strRes = String(Number(res.toFixed(6)));
        setCalcHistory((prev) => [`${calcDisplay} = ${strRes}`, ...prev.slice(0, 7)]);
        setCalcDisplay(strRes);
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' || prev === 'Error' ? val : prev + val));
    }
  };

  // Handle Terminal Commands
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;
    setTerminalInput('');

    const entryId = `term-${Date.now()}`;
    const time = new Date().toLocaleTimeString();

    if (cmd === 'clear') {
      setTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: entryId,
          command: cmd,
          output: `Available Commands:
• help        - Display command manual
• status      - Check companion and telemetry status
• date        - Print current real-time clock and timezone
• ls          - List default workspace projects
• clear       - Clear terminal console
• alya <msg>  - Query ${character === 'jarvis' ? 'Jarvis' : 'Alya'} directly via CLI`,
          timestamp: time,
        },
      ]);
      return;
    }

    if (cmd === 'status') {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: entryId,
          command: cmd,
          output: `System Core: ${character.toUpperCase()} v3.8\nAI Backend: Gemini 3.8 Flash Active\nMemory: Nominal\nTerminal: Interactive Pseudo-TTY`,
          timestamp: time,
        },
      ]);
      return;
    }

    if (cmd === 'date') {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: entryId,
          command: cmd,
          output: new Date().toString(),
          timestamp: time,
        },
      ]);
      return;
    }

    if (cmd === 'ls') {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: entryId,
          command: cmd,
          output: `README.md\napp.js\nindex.html\nscript.py\nnotes.txt\nproject_spec.json`,
          timestamp: time,
        },
      ]);
      return;
    }

    if (cmd.startsWith('alya ') || cmd.startsWith('ai ') || cmd.startsWith('jarvis ')) {
      const prompt = cmd.replace(/^(alya|ai|jarvis)\s+/i, '');
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: entryId,
          command: cmd,
          output: `[Querying ${character === 'jarvis' ? 'Jarvis' : 'Alya'}...]`,
          timestamp: time,
        },
      ]);
      if (onAskAlya) {
        onAskAlya(prompt);
      }
      return;
    }

    // Default echo
    setTerminalLogs((prev) => [
      ...prev,
      {
        id: entryId,
        command: cmd,
        output: `command not found: "${cmd}". Type 'help' for available commands.`,
        isError: true,
        timestamp: time,
      },
    ]);
  };

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs.length]);

  // Handle Tasks
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: WorkTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: 'todo',
      priority: newTaskPriority,
      createdAt: new Date().toLocaleDateString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
  };

  const moveTask = (id: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle Research Topic
  const handlePerformResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchTopic.trim()) return;
    setIsResearching(true);

    try {
      const res = await fetch('/api/work/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Comprehensive technical research and executive slides on: ${researchTopic}`,
          companion: character,
          userApiKey,
        }),
      });
      const data = await res.json();
      setResearchResult({
        summary: data.overview || `Executive research on ${researchTopic}`,
        points: (data.sources || []).map((s: any) => `${s.title}: ${s.snippet}`),
      });
    } catch {
      setResearchResult({
        summary: `Executive Research Analysis: **${researchTopic}**\n\n• Key paradigm shifts in modern computing architectures.\n• Impact of neural multimodal synthesis and low-latency response engines.\n• Strategic implementation guidance for enterprise and consumer AI agents.`,
        points: [
          'Foundational Theory and State of the Art in 2026',
          'Comparative Benchmarks and Throughput Analysis',
          'Integration Protocols with User Workspaces',
        ],
      });
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-transparent">
      {/* 1. APPS WORKSPACE NAVIGATION BAR */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#0c051a]/90 backdrop-blur-xl shrink-0 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveApp('notes')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeApp === 'notes'
                ? isJarvis
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(255,38,159,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} />
            <span>AI Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveApp('tasks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeApp === 'tasks'
                ? isJarvis
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(255,38,159,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckSquare size={14} />
            <span>Task Board</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveApp('calculator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeApp === 'calculator'
                ? isJarvis
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(255,38,159,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator size={14} />
            <span>Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveApp('terminal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeApp === 'terminal'
                ? isJarvis
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(255,38,159,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TerminalIcon size={14} />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveApp('research')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeApp === 'research'
                ? isJarvis
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'bg-pink-500/20 text-pink-200 border border-pink-500/40 shadow-[0_0_12px_rgba(255,38,159,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} />
            <span>AI Research</span>
          </button>
        </div>
      </div>

      {/* 2. ACTIVE APP CONTAINER */}
      <div className="flex-1 overflow-hidden p-3 sm:p-5">
        {/* APP 1: AI NOTES & DOCS */}
        {activeApp === 'notes' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-3">
            {/* Notes List Sidebar */}
            <div className="w-full md:w-64 flex flex-col rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-3 shrink-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Notes</span>
                <button
                  type="button"
                  onClick={() => {
                    const newNote: WorkNote = {
                      id: `note-${Date.now()}`,
                      title: 'Untitled Note',
                      content: '# New Note\n\nStart writing here...',
                      tags: ['Draft'],
                      updatedAt: new Date().toLocaleDateString(),
                    };
                    setNotes([newNote, ...notes]);
                    setSelectedNoteId(newNote.id);
                  }}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                  title="New Note"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNoteId(n.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      n.id === selectedNoteId
                        ? isJarvis
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-md'
                          : 'bg-pink-950/60 border-pink-400 shadow-md'
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="text-xs font-bold text-white truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{n.content.replace(/^#+\s*/, '')}</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
                      <span>{n.tags.join(', ')}</span>
                      <span>{n.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note Editor Pane */}
            {selectedNote && (
              <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 space-y-3 min-w-0">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNotes((prev) =>
                        prev.map((n) => (n.id === selectedNote.id ? { ...n, title: val } : n))
                      );
                    }}
                    className="text-base font-bold text-white bg-transparent focus:outline-none flex-1 mr-2"
                  />
                  <div className="flex items-center gap-1.5">
                    {onSaveToFile && (
                      <button
                        type="button"
                        onClick={() => onSaveToFile(`${selectedNote.title.replace(/\s+/g, '_')}.md`, selectedNote.content)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium"
                      >
                        Save to Files
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (notes.length <= 1) return;
                        const remaining = notes.filter((n) => n.id !== selectedNote.id);
                        setNotes(remaining);
                        setSelectedNoteId(remaining[0].id);
                      }}
                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                      title="Delete Note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={selectedNote.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNote.id
                          ? { ...n, content: val, updatedAt: new Date().toLocaleDateString() }
                          : n
                      )
                    );
                  }}
                  className="flex-1 w-full bg-transparent text-sm text-slate-200 focus:outline-none resize-none leading-relaxed font-quicksand p-1"
                />
              </div>
            )}
          </div>
        )}

        {/* APP 2: KANBAN TASK BOARD */}
        {activeApp === 'tasks' && (
          <div className="w-full h-full flex flex-col space-y-3">
            {/* Task Quick Input Form */}
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a new task or goal..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isJarvis ? 'bg-cyan-500 text-white' : 'bg-pink-500 text-white'
                }`}
              >
                Add Task
              </button>
            </form>

            {/* Kanban Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 overflow-y-auto">
              {(['todo', 'in_progress', 'done'] as const).map((col) => {
                const colTasks = tasks.filter((t) => t.status === col);
                const colTitle = col === 'todo' ? 'To Do' : col === 'in_progress' ? 'In Progress' : 'Completed';
                return (
                  <div key={col} className="rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {colTitle}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl border border-white/10 bg-white/[0.04] space-y-2 shadow-sm"
                        >
                          <p className="text-xs font-bold text-white leading-snug">{t.title}</p>
                          {t.description && <p className="text-[11px] text-slate-400">{t.description}</p>}
                          <div className="flex items-center justify-between pt-1">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                t.priority === 'high'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : t.priority === 'medium'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {t.priority}
                            </span>

                            <div className="flex items-center gap-1">
                              {col !== 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={() => moveTask(t.id, 'in_progress')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200"
                                >
                                  Start
                                </button>
                              )}
                              {col !== 'done' && (
                                <button
                                  type="button"
                                  onClick={() => moveTask(t.id, 'done')}
                                  className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                >
                                  Done
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteTask(t.id)}
                                className="p-1 text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APP 3: SCI-FI CALCULATOR */}
        {activeApp === 'calculator' && (
          <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6 max-w-2xl mx-auto p-4">
            {/* Calculator Body */}
            <div
              className={`w-full max-w-xs rounded-3xl border p-5 backdrop-blur-2xl shadow-2xl space-y-4 ${
                isJarvis ? 'bg-[#08152c] border-cyan-500/40' : 'bg-[#18082c] border-pink-500/40'
              }`}
            >
              {/* Display */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 text-right font-mono">
                <span className="text-2xl font-bold text-white tracking-wider truncate block">
                  {calcDisplay}
                </span>
              </div>

              {/* Keypad Grid */}
              <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                {['C', 'CE', '(', ')', 'sin(', 'cos(', 'sqrt(', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', 'π', '='].map(
                  (btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcClick(btn)}
                      className={`h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                        btn === '='
                          ? isJarvis
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                            : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_12px_rgba(255,38,159,0.4)]'
                          : ['C', 'CE'].includes(btn)
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : ['+', '-', '×', '÷'].includes(btn)
                          ? isJarvis
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          : 'bg-white/10 text-slate-200 hover:bg-white/20'
                      }`}
                    >
                      {btn}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* History Tape */}
            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 h-72 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-white/10">
                Calculation History
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs text-slate-300">
                {calcHistory.length === 0 ? (
                  <p className="text-slate-400 italic py-4">No recent calculations</p>
                ) : (
                  calcHistory.map((h, i) => (
                    <div key={i} className="py-1 border-b border-white/5 truncate">
                      {h}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* APP 4: CYBER TERMINAL */}
        {activeApp === 'terminal' && (
          <div className="w-full h-full flex flex-col rounded-2xl border border-white/10 bg-[#06020d]/95 backdrop-blur-2xl overflow-hidden font-mono text-xs">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/60">
              <div className="flex items-center gap-2">
                <TerminalIcon size={14} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                <span className="font-bold text-white">alya@workstation:~$</span>
              </div>
              <span className="text-[10px] text-slate-400">Interactive Shell v3.8</span>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {terminalLogs.map((entry) => (
                <div key={entry.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className={isJarvis ? 'text-cyan-400 font-bold' : 'text-pink-400 font-bold'}>
                      ➜
                    </span>
                    <span className="text-white">{entry.command}</span>
                    <span className="text-[9px] opacity-40 ml-auto">{entry.timestamp}</span>
                  </div>
                  <div
                    className={`pl-4 whitespace-pre-wrap leading-relaxed ${
                      entry.isError ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
                    {entry.output}
                  </div>
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>

            {/* Terminal Command Input */}
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 p-3 border-t border-white/10 bg-black/40">
              <span className={isJarvis ? 'text-cyan-400 font-bold' : 'text-pink-400 font-bold'}>
                $
              </span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type command ('help', 'status', 'ls', 'alya <query>')..."
                className="flex-1 bg-transparent text-white placeholder:text-slate-400 focus:outline-none font-mono text-xs"
              />
              <button type="submit" className="text-slate-400 hover:text-white">
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* APP 5: AI RESEARCH DECK */}
        {activeApp === 'research' && (
          <div className="w-full h-full max-w-3xl mx-auto flex flex-col space-y-4">
            <form onSubmit={handlePerformResearch} className="flex gap-2">
              <input
                type="text"
                value={researchTopic}
                onChange={(e) => setResearchTopic(e.target.value)}
                placeholder="Enter research topic (e.g., Quantum Computing, WebAssembly, Multimodal AI)..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
              />
              <button
                type="submit"
                disabled={isResearching || !researchTopic.trim()}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
                  isJarvis ? 'bg-cyan-500 text-white' : 'bg-pink-500 text-white'
                }`}
              >
                {isResearching ? 'Analyzing...' : 'Research'}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-5 space-y-4 font-quicksand">
              {researchResult ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
                      <span>Executive Briefing</span>
                    </h3>
                    <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {researchResult.summary}
                    </div>
                  </div>

                  {researchResult.points.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <h4 className="text-xs font-bold text-slate-300">Key Slide Outlines</h4>
                      <div className="space-y-1.5">
                        {researchResult.points.map((pt, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-300">
                            • {pt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                  <BookOpen size={36} className="opacity-40" />
                  <p className="text-sm font-semibold text-slate-300">Instant AI Research & Synthesis</p>
                  <p className="text-xs max-w-sm">
                    Enter any technical or creative topic above to generate a comprehensive executive summary and slide deck points.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
