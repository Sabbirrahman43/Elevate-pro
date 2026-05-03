import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Trash2, FileText, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export const Notepad: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = useAppContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  const active = notes.find(n => n.id === activeId);

  useEffect(() => {
    if (active) { setTitle(active.title); setContent(active.content); }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      updateNote(activeId, { title: title || 'Untitled', content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
    return () => clearTimeout(t);
  }, [title, content]);

  const handleNew = () => {
    const id = addNote();
    setActiveId(id);
    setTitle('Untitled');
    setContent('');
  };

  return (
    <div className="h-full flex bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-[#0d0d0d] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-emerald-400" />
            <span className="font-semibold text-sm font-display">Notes</span>
          </div>
          <button onClick={handleNew} className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white transition-all">
            <Plus size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          <AnimatePresence>
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={28} className="mx-auto mb-2 text-gray-700" />
                <p className="text-xs text-gray-600">No notes yet</p>
              </div>
            ) : notes.map(note => (
              <motion.button key={note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setActiveId(note.id)}
                className={cn('w-full text-left p-3 rounded-xl transition-all group relative',
                  activeId === note.id ? 'bg-emerald-500/10 border border-emerald-500/15' : 'hover:bg-white/4')}>
                <p className={cn('text-xs font-semibold truncate', activeId === note.id ? 'text-emerald-300' : 'text-gray-300')}>{note.title || 'Untitled'}</p>
                <p className="text-[10px] text-gray-600 mt-0.5 truncate">{note.content ? note.content.substring(0, 35) : 'Empty'}</p>
                <p className="text-[9px] text-gray-700 mt-0.5">{format(new Date(note.date), 'MMM d')}</p>
                <button onClick={e => { e.stopPropagation(); deleteNote(note.id); if (activeId === note.id) { setActiveId(null); setTitle(''); setContent(''); } }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all">
                  <X size={9} />
                </button>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <>
            <div className="px-6 py-3 bg-[#0d0d0d] border-b border-white/5 flex items-center justify-between">
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-lg font-bold font-display text-white placeholder-gray-700 mr-4"
                placeholder="Note title..." />
              <div className="flex items-center gap-3">
                <span className={cn('text-[9px] font-bold uppercase tracking-widest transition-all', saved ? 'text-emerald-400' : 'text-gray-700')}>
                  {saved ? 'Saved' : 'Auto-saving'}
                </span>
                <button onClick={() => { deleteNote(activeId); setActiveId(null); }} className="p-1.5 text-gray-700 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Start writing... This is your personal space."
              className="flex-1 p-6 bg-transparent border-none outline-none resize-none text-sm text-gray-300 leading-relaxed placeholder-gray-700 no-scrollbar" />
            <div className="px-6 py-2 border-t border-white/5 flex justify-between">
              <p className="text-[9px] text-gray-700">{content.split(/\s+/).filter(Boolean).length} words</p>
              <p className="text-[9px] text-gray-700">{format(new Date(active?.date || new Date()), 'MMMM d, yyyy HH:mm')}</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <FileText size={40} className="text-gray-800 mb-4" />
            <p className="text-gray-600 font-medium text-sm mb-2">Select a note or create one</p>
            <p className="text-gray-700 text-xs text-center max-w-xs leading-relaxed mb-6">
              This is your personal space. Write down thoughts, goals, fears, plans -- anything you need to remember.
            </p>
            <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all">
              <Plus size={15} /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
