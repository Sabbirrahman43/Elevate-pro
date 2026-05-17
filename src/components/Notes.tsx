import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { Plus, Trash2, FileText, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const Notes: React.FC = () => {
  const { data, updateData } = useStore();
  const notes = data.notes || [];
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(false);

  const selected = notes.find(n => n.id === selectedId) ?? null;

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const addNote = () => {
    const newNote = {
      id: generateId(),
      title: "Untitled Note",
      content: "",
      updatedAt: Date.now(),
    };
    updateData({ notes: [newNote, ...notes] });
    setSelectedId(newNote.id);
  };

  const updateNote = (id: string, patch: Partial<{ title: string; content: string }>) => {
    updateData({
      notes: notes.map(n =>
        n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
      ),
    });
  };

  const deleteNote = (id: string) => {
    const remaining = notes.filter(n => n.id !== id);
    updateData({ notes: remaining });
    setSelectedId(remaining[0]?.id ?? null);
  };

  return (
    <div className="h-full flex gap-0 bg-gray-100 rounded-3xl overflow-hidden border border-gray-200">
      {/* Sidebar list */}
      <div className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:bg-gray-100 transition-all"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={addNote}
            className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-700 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {filteredNotes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest">No notes yet</p>
              </div>
            )}
            {filteredNotes.map(note => (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => setSelectedId(note.id)}
                className={cn(
                  "w-full text-left px-4 py-4 border-b border-gray-50 transition-all",
                  note.id === selectedId
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50 border-l-4 border-l-transparent"
                )}
              >
                <p className={cn("font-black text-sm truncate", note.id === selectedId ? "text-blue-700" : "text-gray-800")}>
                  {note.title || "Untitled"}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate font-medium">
                  {note.content.substring(0, 60) || "Empty note..."}
                </p>
                <p className="text-[10px] text-gray-300 mt-1 font-bold">
                  {new Date(note.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white">
              <button
                onClick={() => setPreview(p => !p)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  preview ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                {preview ? "✎ Edit" : "👁 Preview"}
              </button>
              <span className="text-xs text-gray-300 font-bold ml-auto">
                {selected.content.length} chars · supports **markdown**
              </span>
              <button
                onClick={() => deleteNote(selected.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <input
              className="px-8 pt-6 pb-2 text-2xl font-black text-gray-900 bg-white outline-none border-none placeholder:text-gray-200 w-full"
              value={selected.title}
              onChange={e => updateNote(selected.id, { title: e.target.value })}
              placeholder="Note title..."
            />

            {/* Body */}
            {preview ? (
              <div className="flex-1 overflow-y-auto px-8 py-4 bg-white prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selected.content || "*Nothing written yet...*"}
                </ReactMarkdown>
              </div>
            ) : (
              <textarea
                className="flex-1 px-8 py-4 bg-white outline-none resize-none font-mono text-sm text-gray-700 leading-relaxed placeholder:text-gray-200"
                value={selected.content}
                onChange={e => updateNote(selected.id, { content: e.target.value })}
                placeholder={"Write anything here...\n\nSupports **bold**, *italic*, # headings, - lists, and more markdown."}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 bg-white">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">Select a note or create one</p>
            <button
              onClick={addNote}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-xs font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> New Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
