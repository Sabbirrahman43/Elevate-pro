import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Bot, Shield, Zap, User, MessageSquare, Volume2, Cpu, Upload, Wand2, Loader2, Image as ImageIcon, Download, FileJson, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";

export const Settings: React.FC = () => {
  const { aiSettings, updateAISettings, userProfile, updateUserProfile, habits, tasks, aiMemory, importData, resetData, forceSave } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(!aiSettings.apiKey);
  const [showGroqKey, setShowGroqKey] = useState(!aiSettings.groqApiKey);

  const personas = [
    { id: 'Coach', name: 'Coach' },
    { id: 'Teacher', name: 'Teacher' },
    { id: 'Trainer', name: 'Trainer' },
    { id: 'Partner', name: 'Partner' },
    { id: 'Friend', name: 'Friend' },
    { id: 'Wife', name: 'Wife' },
    { id: 'Girlfriend', name: 'Girlfriend' },
  ];

  const voices = ['Puck', 'Kore', 'Zephyr'];

  const handleForceSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await forceSave();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateAISettings({ avatar: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAvatar = async () => {
    if (!aiSettings.apiKey) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: { parts: [{ text: `Generate a square avatar for an AI assistant named ${aiSettings.name}, persona: ${aiSettings.persona}. Style: digital art, clean background.` }] },
        config: { responseModalities: ['IMAGE', 'TEXT'] as any }
      });
      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if ((part as any).inlineData) {
            updateAISettings({ avatar: `data:image/png;base64,${(part as any).inlineData.data}` });
            break;
          }
        }
      }
    } catch (error) {
      console.error("Avatar generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionClass = "bg-white dark:bg-[#141414] p-6 md:p-8 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 transition-colors";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2";
  const inputClass = "w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium transition-all";

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#141414] dark:text-[#E4E3E0] transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">Customize your Elevate experience.</p>
        </header>

        <div className="space-y-6 md:space-y-8">

          {/* API Keys */}
          <section className={sectionClass}>
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="text-emerald-500" size={24} />
              <h3 className="text-xl font-bold">API Keys</h3>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Gemini API Key</label>
                  {aiSettings.apiKey && (
                    <button onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400">
                      {showGeminiKey ? 'Hide' : 'Set - Change'}
                    </button>
                  )}
                </div>
                {showGeminiKey ? (
                  <input type="password" value={aiSettings.apiKey || ''}
                    onChange={(e) => updateAISettings({ apiKey: e.target.value })}
                    onBlur={() => { if (aiSettings.apiKey) setShowGeminiKey(false); }}
                    placeholder="Enter your Google Gemini API Key"
                    className={inputClass + " font-mono text-sm"} />
                ) : (
                  <div className="h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center">
                    <span className="font-mono text-sm text-gray-400">API key is set</span>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-gray-400">Free at aistudio.google.com</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Groq API Key</label>
                  {aiSettings.groqApiKey && (
                    <button onClick={() => setShowGroqKey(!showGroqKey)}
                      className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400">
                      {showGroqKey ? 'Hide' : 'Set - Change'}
                    </button>
                  )}
                </div>
                {showGroqKey ? (
                  <input type="password" value={aiSettings.groqApiKey || ''}
                    onChange={(e) => updateAISettings({ groqApiKey: e.target.value })}
                    onBlur={() => { if (aiSettings.groqApiKey) setShowGroqKey(false); }}
                    placeholder="Enter your Groq API Key"
                    className={inputClass + " font-mono text-sm"} />
                ) : (
                  <div className="h-12 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center">
                    <span className="font-mono text-sm text-gray-400">API key is set</span>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-gray-400">Free at console.groq.com -- faster responses</p>
              </div>
            </div>
          </section>

          {/* User Profile */}
          <section className={sectionClass}>
            <div className="flex items-center space-x-3 mb-6">
              <User className="text-emerald-500" size={24} />
              <h3 className="text-xl font-bold">Your Profile</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm shrink-0">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt={userProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={28} className="text-gray-400" />
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center space-x-2">
                    <Upload size={14} />
                    <span>Upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => updateUserProfile({ avatar: reader.result as string });
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  {userProfile?.avatar && (
                    <button onClick={() => updateUserProfile({ avatar: '' })}
                      className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 p-2 rounded-xl transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" value={userProfile?.name || ''} onChange={(e) => updateUserProfile({ name: e.target.value })}
                  placeholder="Your name" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" value={userProfile?.dob || ''} onChange={(e) => updateUserProfile({ dob: e.target.value })}
                  className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Off Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <button key={day} onClick={() => {
                      const current = userProfile?.offDays || [];
                      const updated = current.includes(i) ? current.filter((d: number) => d !== i) : [...current, i];
                      updateUserProfile({ offDays: updated });
                    }}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border",
                        userProfile?.offDays?.includes(i)
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-transparent")}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>About Me</label>
                <textarea value={userProfile?.about || ''} onChange={(e) => updateUserProfile({ about: e.target.value })}
                  rows={3} placeholder="Tell your AI about yourself..."
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium resize-none transition-all" />
              </div>

              <div>
                <label className={labelClass}>Goals</label>
                <textarea value={userProfile?.goals || ''} onChange={(e) => updateUserProfile({ goals: e.target.value })}
                  rows={3} placeholder="What are you working toward?"
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium resize-none transition-all" />
              </div>
            </div>
          </section>

          {/* AI Identity */}
          <section className={sectionClass}>
            <div className="flex items-center space-x-3 mb-6">
              <Bot className="text-emerald-500" size={24} />
              <h3 className="text-xl font-bold">AI Identity</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                  {aiSettings.avatar ? (
                    <img src={aiSettings.avatar} alt={aiSettings.name} className="w-full h-full object-cover" />
                  ) : (
                    <Bot size={28} className="text-gray-400" />
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <label className="cursor-pointer bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center space-x-2">
                    <Upload size={14} /><span>Upload</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleGenerateAvatar} disabled={isGenerating || !aiSettings.apiKey}
                    className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center space-x-2 disabled:opacity-50">
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    <span>Generate</span>
                  </button>
                  {aiSettings.avatar && (
                    <button onClick={() => updateAISettings({ avatar: '' })}
                      className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2 rounded-xl transition-all text-gray-700 dark:text-gray-300">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>AI Name</label>
                <input type="text" value={aiSettings.name || ''} onChange={(e) => updateAISettings({ name: e.target.value })}
                  placeholder="Name your AI" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Persona</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {personas.map(p => (
                    <button key={p.id} onClick={() => updateAISettings({ persona: p.id })}
                      className={cn("p-3 rounded-2xl border text-center transition-all text-sm font-bold",
                        aiSettings.persona === p.id
                          ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/30")}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>Behavior</label>
                  <button onClick={() => updateAISettings({ behavior: aiSettings.behavior ? '' : 'Motivating, warm, uses emojis, focuses on discipline and growth.' })}
                    className="text-[9px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                    {aiSettings.behavior ? 'Clear' : 'Reset Default'}
                  </button>
                </div>
                <textarea value={aiSettings.behavior || ''} onChange={(e) => updateAISettings({ behavior: e.target.value })}
                  rows={3} placeholder="e.g. Motivating, strict, uses emojis..."
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium resize-none transition-all" />
                <p className="text-[9px] text-gray-400 mt-1">Guides your AI personality. Clear to use default.</p>
              </div>
            </div>
          </section>

          {/* Voice */}
          <section className={sectionClass}>
            <div className="flex items-center space-x-3 mb-6">
              <Volume2 className="text-emerald-500" size={24} />
              <h3 className="text-xl font-bold">Voice Profile</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Switch AI models anytime from the chat header.</p>
            <div className="grid grid-cols-3 gap-3">
              {voices.map(voice => (
                <button key={voice} onClick={() => updateAISettings({ voice })}
                  className={cn("p-4 rounded-2xl border flex flex-col items-center space-y-2 transition-all",
                    aiSettings.voice === voice
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 shadow-sm"
                      : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30")}>
                  <Volume2 size={24} className={aiSettings.voice === voice ? "text-emerald-500" : "text-gray-400"} />
                  <span className="font-bold text-xs">{voice}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Themes */}
          <section className={sectionClass}>
            <div className="flex items-center space-x-3 mb-6">
              <Sparkles className="text-emerald-500" size={24} />
              <h3 className="text-xl font-bold">Theme</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'default', name: 'Default', accent: '#10b981', preview: 'bg-gray-900' },
                { id: 'cyber', name: 'Cyber', accent: '#00fff5', preview: 'bg-cyan-950' },
                { id: 'red', name: 'Red', accent: '#ef4444', preview: 'bg-red-950' },
                { id: 'purple', name: 'Purple', accent: '#a855f7', preview: 'bg-purple-950' },
                { id: 'gold', name: 'Gold', accent: '#f59e0b', preview: 'bg-amber-950' },
              ].map(t => {
                const current = typeof window !== 'undefined' ? (localStorage.getItem('elevate_theme') || 'default') : 'default';
                return (
                  <button key={t.id} onClick={() => {
                    localStorage.setItem('elevate_theme', t.id);
                    document.documentElement.setAttribute('data-theme', t.id);
                    window.dispatchEvent(new Event('theme-change'));
                  }}
                    className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                      current === t.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20")}>
                    <div className={cn("w-full h-10 rounded-xl flex items-center justify-center", t.preview)}>
                      <div className="w-4 h-4 rounded-full" style={{ background: t.accent }} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Data Management */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <FileJson className="text-emerald-500" size={24} />
                <h3 className="text-xl font-bold">Data Management</h3>
              </div>
              <button onClick={handleForceSave} disabled={isSaving}
                className={cn("flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                  saveSuccess
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-500 hover:text-white",
                  "disabled:opacity-50")}>
                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : saveSuccess ? <><Save size={14} /> Saved</> : <><Save size={14} /> Sync to Cloud</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Data auto-saves every second. Use Sync to Cloud if changes are not appearing on another device.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => {
                const data = { habits, tasks, aiMemory, aiSettings, userProfile };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `elevate-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
                className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                <Download className="text-gray-400 group-hover:text-emerald-500 mb-3 transition-colors" size={32} />
                <span className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest">Export</span>
              </button>

              <label className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group">
                <Upload className="text-gray-400 group-hover:text-blue-500 mb-3 transition-colors" size={32} />
                <span className="font-bold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest">Import</span>
                <input type="file" className="hidden" accept=".json" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      importData(data);
                    } catch (err) {
                      alert('Invalid backup file');
                    }
                  };
                  reader.readAsText(file);
                }} />
              </label>

              <button onClick={resetData}
                className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors group">
                <AlertTriangle className="text-red-400 group-hover:text-red-600 mb-3 transition-colors" size={32} />
                <span className="font-bold text-xs text-red-700 dark:text-red-400 uppercase tracking-widest">Reset</span>
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}  </div>
);
};
