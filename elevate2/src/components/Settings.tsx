import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Bot, User, Volume2, Upload, Wand2, Loader2, Download, Trash2, AlertTriangle, Sparkles, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';

export const Settings: React.FC = () => {
  const { aiSettings, updateAISettings, userProfile, updateUserProfile, habits, tasks, aiMemory, notes, importData, resetData, forceSave } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [showGKey, setShowGKey] = useState(!aiSettings.apiKey);
  const [showQKey, setShowQKey] = useState(!aiSettings.groqApiKey);

  const personas = ['Coach', 'Teacher', 'Trainer', 'Partner', 'Friend', 'Wife', 'Girlfriend'];
  const voices = ['Puck', 'Kore', 'Zephyr', 'Charon', 'Fenrir'];
  const themes = [
    { id: 'default', name: 'Default', color: '#10b981' },
    { id: 'blue', name: 'Ocean', color: '#3b82f6' },
    { id: 'purple', name: 'Royal', color: '#a855f7' },
    { id: 'red', name: 'Fire', color: '#ef4444' },
    { id: 'gold', name: 'Gold', color: '#f59e0b' },
  ];

  const handleForceSave = async () => {
    setIsSaving(true);
    try { await forceSave(); setSaveOk(true); setTimeout(() => setSaveOk(false), 3000); } catch {}
    finally { setIsSaving(false); }
  };

  const handleGenerateAvatar = async () => {
    if (!aiSettings.apiKey) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: { parts: [{ text: 'Square avatar for AI named ' + aiSettings.name + ', persona: ' + aiSettings.persona + '. Digital art style, dark background, professional and modern.' }] },
        config: { responseModalities: ['TEXT', 'IMAGE'] as any }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) {
          updateAISettings({ avatar: 'data:image/png;base64,' + (part as any).inlineData.data });
          break;
        }
      }
    } catch {} finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white p-4 md:p-6 no-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize your experience</p>
        </div>

        {/* API Keys */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={16} className="text-emerald-400" />
            <h3 className="font-semibold text-sm font-display">API Keys</h3>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Gemini API Key</label>
              {aiSettings.apiKey && <button onClick={() => setShowGKey(!showGKey)} className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300">{showGKey ? 'Hide' : 'Set - Change'}</button>}
            </div>
            {showGKey ? (
              <div>
                <input type="password" value={aiSettings.apiKey || ''} onChange={e => updateAISettings({ apiKey: e.target.value })}
                  onBlur={() => { if (aiSettings.apiKey) setShowGKey(false); }}
                  placeholder="Enter Gemini API Key"
                  className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all font-mono" />
                <p className="mt-1 text-[10px] text-gray-600">Get free key at aistudio.google.com</p>
              </div>
            ) : (
              <div className="h-10 px-4 bg-white/3 border border-white/5 rounded-xl flex items-center">
                <span className="text-sm text-gray-600 font-mono">API key is set</span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Groq API Key</label>
              {aiSettings.groqApiKey && <button onClick={() => setShowQKey(!showQKey)} className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300">{showQKey ? 'Hide' : 'Set - Change'}</button>}
            </div>
            {showQKey ? (
              <div>
                <input type="password" value={aiSettings.groqApiKey || ''} onChange={e => updateAISettings({ groqApiKey: e.target.value })}
                  onBlur={() => { if (aiSettings.groqApiKey) setShowQKey(false); }}
                  placeholder="Enter Groq API Key"
                  className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all font-mono" />
                <p className="mt-1 text-[10px] text-gray-600">Get free key at console.groq.com</p>
              </div>
            ) : (
              <div className="h-10 px-4 bg-white/3 border border-white/5 rounded-xl flex items-center">
                <span className="text-sm text-gray-600 font-mono">API key is set</span>
              </div>
            )}
          </div>
        </section>

        {/* Profile */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={16} className="text-blue-400" />
            <h3 className="font-semibold text-sm font-display">Your Profile</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/6 flex items-center justify-center overflow-hidden flex-shrink-0">
              {userProfile?.avatar ? <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User size={28} className="text-gray-600" />}
            </div>
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/8 transition-all">
              <Upload size={13} /> Upload Photo
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onloadend = () => updateUserProfile({ avatar: r.result as string }); r.readAsDataURL(f);
              }} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Name</label>
              <input type="text" value={userProfile?.name || ''} onChange={e => updateUserProfile({ name: e.target.value })}
                className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 transition-all" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">Date of Birth</label>
              <input type="date" value={userProfile?.dob || ''} onChange={e => updateUserProfile({ dob: e.target.value })}
                className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">About Me</label>
            <textarea value={userProfile?.about || ''} onChange={e => updateUserProfile({ about: e.target.value })} rows={2}
              className="w-full p-3 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all resize-none"
              placeholder="Tell your AI about yourself..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">My Goals</label>
            <textarea value={userProfile?.goals || ''} onChange={e => updateUserProfile({ goals: e.target.value })} rows={2}
              className="w-full p-3 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all resize-none"
              placeholder="What are you working toward?" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Rest Days</label>
            <div className="flex gap-2">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <button key={i} onClick={() => {
                  const cur = userProfile?.offDays || [];
                  updateUserProfile({ offDays: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] });
                }}
                  className={cn('w-9 h-9 rounded-xl text-xs font-bold transition-all', userProfile?.offDays?.includes(i) ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-600 hover:text-white hover:bg-white/8')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* AI Identity */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={16} className="text-purple-400" />
            <h3 className="font-semibold text-sm font-display">AI Identity</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/6 flex items-center justify-center overflow-hidden flex-shrink-0">
              {aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={24} className="text-gray-600" />}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all">
                <Upload size={12} /> Upload
                <input type="file" className="hidden" accept="image/*" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader(); r.onloadend = () => updateAISettings({ avatar: r.result as string }); r.readAsDataURL(f);
                }} />
              </label>
              <button onClick={handleGenerateAvatar} disabled={isGenerating || !aiSettings.apiKey}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50">
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">AI Name</label>
            <input type="text" value={aiSettings.name || ''} onChange={e => updateAISettings({ name: e.target.value })}
              className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 transition-all" placeholder="e.g. Aria, Nova..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Persona</label>
            <div className="flex flex-wrap gap-2">
              {personas.map(p => (
                <button key={p} onClick={() => updateAISettings({ persona: p })}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border', aiSettings.persona === p ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/5 border-white/6 text-gray-500 hover:text-white hover:bg-white/8')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Behavior</label>
              <button onClick={() => updateAISettings({ behavior: aiSettings.behavior ? '' : 'Motivating, warm, emotionally intelligent, focuses on discipline and growth.' })}
                className="text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400">
                {aiSettings.behavior ? 'Clear' : 'Reset'}
              </button>
            </div>
            <textarea value={aiSettings.behavior || ''} onChange={e => updateAISettings({ behavior: e.target.value })} rows={2}
              className="w-full p-3 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all resize-none"
              placeholder="e.g. Strict, uses my name, very direct..." />
          </div>
        </section>

        {/* Voice */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 size={16} className="text-amber-400" />
            <h3 className="font-semibold text-sm font-display">Voice</h3>
          </div>
          <p className="text-[10px] text-gray-600 mb-3">Switch AI models from the chat header. Choose voice here.</p>
          <div className="flex flex-wrap gap-2">
            {voices.map(v => (
              <button key={v} onClick={() => updateAISettings({ voice: v })}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border', aiSettings.voice === v ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/5 border-white/6 text-gray-500 hover:text-white hover:bg-white/8')}>
                <Volume2 size={11} /> {v}
              </button>
            ))}
          </div>
        </section>

        {/* Theme */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-pink-400" />
            <h3 className="font-semibold text-sm font-display">Theme</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {themes.map(t => {
              const cur = typeof window !== 'undefined' ? (localStorage.getItem('el_theme') || 'default') : 'default';
              return (
                <button key={t.id} onClick={() => { localStorage.setItem('el_theme', t.id); document.documentElement.style.setProperty('--accent', t.color); }}
                  className={cn('flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all', cur === t.id ? 'border-emerald-500/50 bg-emerald-500/8' : 'border-white/6 bg-white/3 hover:bg-white/6')}>
                  <div className="w-5 h-5 rounded-full" style={{ background: t.color }} />
                  <span className="text-[10px] font-semibold text-gray-400">{t.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Data */}
        <section className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm font-display">Data</h3>
            <button onClick={handleForceSave} disabled={isSaving}
              className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50',
                saveOk ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15')}>
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isSaving ? 'Saving...' : saveOk ? 'Saved!' : 'Sync Cloud'}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mb-4">Auto-saves every 1.5 seconds. Use Sync Cloud if changes are not appearing on other devices.</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => {
              const data = { habits, tasks, aiMemory, aiSettings, userProfile, notes };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'elevate-backup.json';
              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            }} className="flex flex-col items-center p-4 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/6 transition-all group">
              <Download className="text-gray-600 group-hover:text-emerald-400 mb-2 transition-colors" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gray-400">Export</span>
            </button>
            <label className="flex flex-col items-center p-4 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/6 transition-all cursor-pointer group">
              <Upload className="text-gray-600 group-hover:text-blue-400 mb-2 transition-colors" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gray-400">Import</span>
              <input type="file" className="hidden" accept=".json" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onload = ev => { try { importData(JSON.parse(ev.target?.result as string)); } catch { alert('Invalid file'); } }; r.readAsText(f);
              }} />
            </label>
            <button onClick={resetData} className="flex flex-col items-center p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-all group">
              <AlertTriangle className="text-red-600 group-hover:text-red-400 mb-2 transition-colors" size={24} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 group-hover:text-red-400">Reset</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};
