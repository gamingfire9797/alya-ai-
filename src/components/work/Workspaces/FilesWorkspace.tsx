import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  FileCode,
  FileText,
  Image as ImageIcon,
  FolderPlus,
  FilePlus,
  Upload,
  Download,
  Trash2,
  Eye,
  Edit2,
  HardDrive,
  Copy,
  ExternalLink,
  X,
  Search,
  Check,
  Grid,
  List,
} from 'lucide-react';
import { WorkspaceFile, FileType, CompanionCharacter } from '../../../types';

interface FilesWorkspaceProps {
  character: CompanionCharacter;
  onOpenInCoding?: (name: string, content: string) => void;
  onOpenInBrowser?: (name: string, content: string) => void;
}

const STORAGE_KEY = 'alya_workspace_files_v1';

const DEFAULT_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    id: 'wf-1',
    name: 'README.md',
    path: '/workspace/README.md',
    type: 'markdown',
    size: 1420,
    updatedAt: new Date().toLocaleDateString(),
    content: `# Alya Workstation v3.8

Welcome to your next-generation productivity hub!

## Included Workspaces:
- **🌐 Approved Browser**: AI Google Search grounding, bookmark hub, and instant article summarizer.
- **💻 Coding IDE**: Live execution engine, console output, live HTML previews, and Gemini code assistant.
- **📁 File Explorer**: Local storage file management, uploads, exports, and document previews.
- **📱 Cyber Apps**: Markdown notes, task boards, scientific calculator, CLI terminal, and AI research slides.

Enjoy hands-free companion automation with Alya and Jarvis! 🌸⚡`,
  },
  {
    id: 'wf-2',
    name: 'quantum_algorithm.js',
    path: '/workspace/projects/quantum_algorithm.js',
    type: 'code',
    size: 890,
    updatedAt: new Date().toLocaleDateString(),
    content: `// Quantum Node Synchronization
export function syncNodes(clusterSize = 8) {
  const telemetry = Array.from({ length: clusterSize }, (_, i) => ({
    nodeId: \`node-\${i + 1}\`,
    status: 'ONLINE',
    latency: Math.floor(Math.random() * 8) + 1 + 'ms'
  }));
  return telemetry;
}`,
  },
  {
    id: 'wf-3',
    name: 'project_spec.json',
    path: '/workspace/documents/project_spec.json',
    type: 'json',
    size: 420,
    updatedAt: new Date().toLocaleDateString(),
    content: JSON.stringify(
      {
        projectName: 'Alya Work Mode 2026',
        version: '3.8.0',
        coreEngine: 'Gemini 3.8 Flash',
        workspaces: ['Browser', 'Coding', 'Files', 'Apps'],
        theme: 'Cyberpunk Neon Pink & Deep Obsidian',
        status: 'Active',
      },
      null,
      2
    ),
  },
  {
    id: 'wf-4',
    name: 'notes.txt',
    path: '/workspace/documents/notes.txt',
    type: 'text',
    size: 310,
    updatedAt: new Date().toLocaleDateString(),
    content: `Alya Work Mode Priorities:
1. Low latency responses and instant feedback
2. Multi-tab browsing with real search grounding
3. Safe coding runner with live preview
4. Full productivity suite with zero loss of Voice Companion features!`,
  },
];

export const FilesWorkspace: React.FC<FilesWorkspaceProps> = ({
  character,
  onOpenInCoding,
  onOpenInBrowser,
}) => {
  const isJarvis = character === 'jarvis';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<WorkspaceFile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return DEFAULT_WORKSPACE_FILES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [previewModalFile, setPreviewModalFile] = useState<WorkspaceFile | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch {}
  }, [files]);

  const handleCreateFile = () => {
    const name = prompt('Enter filename (e.g. notes.txt, demo.js, styles.css):', 'new_file.txt');
    if (!name || !name.trim()) return;

    let type: FileType = 'text';
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.html')) {
      type = 'code';
    } else if (name.endsWith('.md')) {
      type = 'markdown';
    } else if (name.endsWith('.json')) {
      type = 'json';
    }

    const newFile: WorkspaceFile = {
      id: `wf-${Date.now()}`,
      name: name.trim(),
      path: `/workspace/${name.trim()}`,
      type,
      size: 120,
      updatedAt: new Date().toLocaleDateString(),
      content: `// Content for ${name.trim()}\n`,
    };

    setFiles((prev) => [newFile, ...prev]);
    setSelectedFile(newFile);
  };

  const handleDeleteFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
    if (previewModalFile?.id === id) setPreviewModalFile(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    const reader = new FileReader();
    const isImage = uploaded.type.startsWith('image/');

    reader.onload = () => {
      const content = reader.result as string;
      const newFile: WorkspaceFile = {
        id: `wf-${Date.now()}`,
        name: uploaded.name,
        path: `/workspace/uploads/${uploaded.name}`,
        type: isImage ? 'image' : 'text',
        size: uploaded.size,
        updatedAt: new Date().toLocaleDateString(),
        content,
      };
      setFiles((prev) => [newFile, ...prev]);
      setSelectedFile(newFile);
    };

    if (isImage) {
      reader.readAsDataURL(uploaded);
    } else {
      reader.readAsText(uploaded);
    }
  };

  const handleDownloadFile = (file: WorkspaceFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenPreview = (file: WorkspaceFile) => {
    setPreviewModalFile(file);
    setEditingContent(file.content || '');
  };

  const handleSavePreviewEdit = () => {
    if (!previewModalFile) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === previewModalFile.id
          ? { ...f, content: editingContent, size: editingContent.length, updatedAt: new Date().toLocaleDateString() }
          : f
      )
    );
    setPreviewModalFile(null);
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'code':
        return <FileCode size={20} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />;
      case 'markdown':
        return <FileText size={20} className="text-amber-400" />;
      case 'json':
        return <FileText size={20} className="text-emerald-400" />;
      case 'image':
        return <ImageIcon size={20} className="text-purple-400" />;
      default:
        return <File size={20} className="text-slate-400" />;
    }
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-transparent">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. TOP CONTROLS & UTILITIES */}
      <div className="flex flex-wrap items-center justify-between p-3 border-b border-white/10 bg-[#0c051a]/90 backdrop-blur-xl gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="relative flex-1 flex items-center">
            <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspace files..."
              className="w-full bg-black/40 border border-white/10 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
            />
          </div>

          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? (isJarvis ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300') : 'text-slate-400'
              }`}
              title="Grid View"
            >
              <Grid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? (isJarvis ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300') : 'text-slate-400'
              }`}
              title="List View"
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCreateFile}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              isJarvis
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_12px_rgba(255,38,159,0.4)]'
            }`}
          >
            <FilePlus size={13} />
            <span>New File</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Upload Local File"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 pl-2 font-mono">
            <HardDrive size={13} className={isJarvis ? 'text-cyan-400' : 'text-pink-400'} />
            <span>{(totalBytes / 1024).toFixed(1)} KB / 512 MB</span>
          </div>
        </div>
      </div>

      {/* 2. FILES DISPLAY CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
            <Folder size={36} className="opacity-40" />
            <p className="text-sm font-semibold text-slate-300">No files match your search</p>
            <p className="text-xs">Create a new file or upload a document to get started.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  onDoubleClick={() => handleOpenPreview(file)}
                  className={`group relative p-3.5 rounded-2xl border backdrop-blur-xl flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? isJarvis
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.2)]'
                        : 'bg-pink-950/60 border-pink-400 shadow-[0_0_20px_rgba(255,38,159,0.2)]'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center shadow-inner">
                      {getFileIcon(file.type)}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(file);
                        }}
                        className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                        title="View / Edit"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadFile(file, e)}
                        className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                        title="Download"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(file.id, e)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-bold text-white truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>{file.updatedAt}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Updated</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    onDoubleClick={() => handleOpenPreview(file)}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 flex items-center gap-2 font-medium text-white truncate max-w-xs">
                      {getFileIcon(file.type)}
                      <span className="truncate">{file.name}</span>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-slate-400">
                      {file.type}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {file.updatedAt}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(file);
                          }}
                          className="p-1 hover:text-white"
                          title="Preview"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadFile(file, e)}
                          className="p-1 hover:text-white"
                          title="Download"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. FILE PREVIEW & EDIT MODAL */}
      {previewModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div
            className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border p-5 backdrop-blur-2xl shadow-2xl flex flex-col space-y-3 ${
              isJarvis
                ? 'bg-[#08152c] border-cyan-500/40 shadow-[0_0_35px_rgba(0,229,255,0.2)]'
                : 'bg-[#18082c] border-pink-500/40 shadow-[0_0_35px_rgba(255,38,159,0.2)]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                {getFileIcon(previewModalFile.type)}
                <div>
                  <h3 className="text-sm font-bold text-white">{previewModalFile.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    {previewModalFile.path} • {(previewModalFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onOpenInCoding && previewModalFile.type !== 'image' && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInCoding(previewModalFile.name, editingContent);
                      setPreviewModalFile(null);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    <span>Coding IDE</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewModalFile(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Preview or Editor Content */}
            <div className="flex-1 overflow-y-auto min-h-[220px]">
              {previewModalFile.type === 'image' ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewModalFile.content}
                    alt={previewModalFile.name}
                    className="max-h-[60vh] rounded-xl object-contain border border-white/10"
                  />
                </div>
              ) : (
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="w-full h-full min-h-[260px] p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-slate-200 focus:outline-none focus:border-pink-400 resize-none leading-relaxed"
                />
              )}
            </div>

            {/* Footer Buttons */}
            {previewModalFile.type !== 'image' && (
              <div className="flex items-center justify-between pt-2 border-t border-white/10 shrink-0">
                <span className="text-[11px] text-slate-400">
                  {editingContent.split('\n').length} lines • {editingContent.length} chars
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalFile(null)}
                    className="px-3 py-1.5 rounded-xl text-xs bg-white/10 hover:bg-white/20 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreviewEdit}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isJarvis
                        ? 'bg-cyan-500 text-white shadow-md'
                        : 'bg-pink-500 text-white shadow-md'
                    }`}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
