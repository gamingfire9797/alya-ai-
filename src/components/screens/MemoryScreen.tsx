import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Search, ShieldCheck } from 'lucide-react';
import { MemoryItem } from '../../types';

interface MemoryScreenProps {
  memories: MemoryItem[];
  onAddMemory: (category: MemoryItem['category'], text: string) => void;
  onEditMemory: (id: string, text: string) => void;
  onDeleteMemory: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const MemoryScreen: React.FC<MemoryScreenProps> = ({
  memories,
  onAddMemory,
  onEditMemory,
  onDeleteMemory,
  onTogglePin,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('Preferences');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const categories: string[] = ['All', 'Chats', 'Notes', 'People', 'Preferences'];

  const filteredMemories = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch = m.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveAdd = () => {
    if (!newText.trim()) return;
    onAddMemory(newCategory, newText.trim());
    setNewText('');
    setIsAdding(false);
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    onEditMemory(id, editText.trim());
    setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold font-comfortaa text-white">Memory</h2>
            <span className="text-pink-400 text-sm">({memories.length})</span>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-[0_0_12px_rgba(244,114,182,0.4)] active:scale-95 transition-all font-semibold"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved memories..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 font-quicksand"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-pink-500/30 text-pink-300 border border-pink-400/50 shadow-[0_0_10px_rgba(244,114,182,0.25)]'
                    : 'glass-panel-subtle text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {isAdding && (
        <div className="p-3.5 glass-panel rounded-2xl border border-pink-500/40 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-pink-300">
            <span>Remember something new</span>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
              <X size={15} />
            </button>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400">Category:</span>
            {(['Preferences', 'Notes', 'Chats', 'People'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCategory(c)}
                className={`px-2 py-0.5 rounded-md text-[10px] ${
                  newCategory === c ? 'bg-pink-500 text-white' : 'bg-white/10 text-slate-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g. Speaks Hinglish casually, prefers quick bullet points"
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAdd}
              className="px-3 py-1 rounded-lg text-xs bg-pink-500 text-white font-semibold shadow-sm hover:bg-pink-600"
            >
              Save Memory
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No memories found in this section.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEditing = editingId === mem.id;
            return (
              <div
                key={mem.id}
                className="w-full glass-card rounded-2xl p-3 flex items-center justify-between gap-3 border border-pink-500/20 hover:border-pink-500/40 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(244,114,182,0.3)]">
                  <span className="text-pink-400 text-xs font-bold">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 bg-black/50 border border-pink-400/60 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(mem.id)}
                        className="text-emerald-400 hover:text-emerald-300 p-1"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-300 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-100 font-quicksand">
                        {mem.text}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-pink-300/80 font-medium">
                          {mem.category}
                        </span>
                        <span className="text-[9px] text-slate-500">• {mem.dateAdded}</span>
                      </div>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(mem)}
                      className="p-1 text-slate-400 hover:text-pink-300 transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteMemory(mem.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 rounded-xl glass-panel-subtle border border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck size={15} className="text-emerald-400 flex-shrink-0" />
        <span>Memories personalize your conversations safely. Passwords and credentials are never stored.</span>
      </div>
    </div>
  );
};
