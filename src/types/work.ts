export type WorkspaceTab = 'browser' | 'coding' | 'files' | 'apps';

export type WorkAppId = 'notes' | 'tasks' | 'calculator' | 'terminal' | 'research';

// ==========================================
// Browser Workspace Types
// ==========================================
export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  embedUrl?: string;
  isYouTube?: boolean;
  isYouTubeVideo?: boolean;
  platformEngine?: string;
  favicon?: string;
  isLoading?: boolean;
  history: string[];
  historyIndex: number;
  readerMode?: boolean;
  pageContent?: string;
  summary?: string;
  isRestricted?: boolean;
  restrictedReason?: string;
  loadError?: string | null;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  category?: string;
}

export interface BrowserHistoryEntry {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  type: 'url' | 'search';
}

export interface BrowserShortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isCustom?: boolean;
}

export type SearchEngineType = 'google' | 'duckduckgo' | 'bing' | 'alya_ai';

// ==========================================
// Coding Workspace Types
// ==========================================
export type CodeLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'sql'
  | 'markdown';

export interface CodeFile {
  id: string;
  name: string;
  language: CodeLanguage;
  content: string;
  isModified?: boolean;
}

export interface CodeExecutionResult {
  output: string;
  error?: string | null;
  executionTimeMs?: number;
  logs: string[];
}

// ==========================================
// Files Workspace Types
// ==========================================
export type FileType = 'code' | 'text' | 'image' | 'json' | 'markdown' | 'data' | 'folder';

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  type: FileType;
  size: number;
  updatedAt: string;
  content?: string;
  isFolder?: boolean;
  parentId?: string | null;
}

// ==========================================
// Apps Workspace Types
// ==========================================
export interface WorkNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  isError?: boolean;
  timestamp: string;
}

export interface ResearchTopic {
  id: string;
  topic: string;
  summary: string;
  keyPoints: string[];
  references: string[];
  generatedAt: string;
}
