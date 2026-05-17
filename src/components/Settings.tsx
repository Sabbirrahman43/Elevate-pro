import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "../store/useStore";
import { 
  Lock, 
  User, 
  BrainCircuit, 
  Database, 
  Cloud, 
  Download, 
  Upload, 
  Trash2,
  RotateCcw,
  Camera,
  Wand2,
  Check,
  ChevronRight,
  Monitor,
  Volume2,
  PlayCircle,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { generateSpeech } from "../lib/gemini";

const PERSONAS = ["Coach", "Teacher", "Trainer", "Partner", "Friend", "Mentor", "Therapist"];
const VOICES = ["Puck", "Kore", "Zephyr", "Charon", "Fenrir"];



export const Settings: React.FC = () => {
  const { data, updateData, syncToCloud, hardReset } = useStore();
  const [activeSubTab, setActiveSubTab] = useState("Profile");
  const [showKey, setShowKey] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const playVoiceSample = async (voice: string) => {
    window.speechSynthesis.cancel();
    setPlayingVoice(voice);
    const persona = data.settings.ai.identity.persona;
    const text = `Hello. I am your ${persona}. My name is ${data.settings.ai.identity.name}. I am ready to help you elevate your life.`;
    
    const base64 = await generateSpeech(text, { ...data, settings: { ...data.settings, ai: { ...data.settings.ai, voice: { ...data.settings.ai.voice, selected: voice } } } });
    
    if (base64) {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = audioCtx.createBuffer(1, bytes.length / 2, 24000);
        const channelData = buffer.getChannelData(0);
        const view = new DataView(bytes.buffer);
        
        for (let i = 0; i < channelData.length; i++) {
          // Gemini returns 16-bit PCM at 24kHz
          channelData[i] = view.getInt16(i * 2, true) / 32768.0;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setPlayingVoice(null);
          if (audioCtx.state !== 'closed') {
            audioCtx.close();
          }
        };
        source.start();
      } catch (err) {
        console.error("Audio Context Error:", err);
        setPlayingVoice(null);
        fallbackSample(voice);
      }
    } else {
      setPlayingVoice(null);
      fallbackSample(voice);
    }
  };

  const fallbackSample = (voiceName: string) => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const premiumVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Neural')) && v.lang.startsWith('en')) || 
                        voices.find(v => v.lang.startsWith('en'));

    const text = `High-quality AI service is at capacity. Using system voice for ${voiceName}. I am ready to help you elevate your life.`;
    const ut = new SpeechSynthesisUtterance(text);
    if (premiumVoice) ut.voice = premiumVoice;
    ut.rate = 1.25; 
    ut.pitch = 1.0;
    ut.onend = () => setPlayingVoice(null);
    synth.speak(ut);
  };

  const sections = [
    { id: "Profile", icon: User },
    { id: "AI Companion", icon: BrainCircuit },
    { id: "Integrations", icon: Monitor },
    { id: "Data & Storage", icon: Database },
  ];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "elevate_data.json";
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        updateData(imported);
        alert("Data imported successfully!");
      } catch (err) { alert("Invalid data file"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-8">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Ecosystem Control</h1>
        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Configure your digital existence</p>
      </div>

      <div className="flex-1 flex gap-8">
        {/* Sub-nav */}
        <div className="w-64 space-y-1">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSubTab(s.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold",
                activeSubTab === s.id ? "bg-white shadow-lg text-blue-600 shadow-blue-500/5" : "text-gray-400 hover:bg-gray-200/50"
              )}
            >
              <s.icon className="w-5 h-5" />
              <span>{s.id}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 overflow-y-auto">
          {activeSubTab === "Profile" && (
            <div className="space-y-10">
              <div className="flex items-center gap-10">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {data.settings.profile.avatar ? (
                      <img src={data.settings.profile.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Upload className="w-5 h-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => updateData({ settings: { ...data.settings, profile: { ...data.settings.profile, avatar: reader.result as string } } });
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900">Personal Identity</h3>
                  <p className="text-gray-400 font-bold text-sm">How Pranto AI knows you</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Display Name</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all"
                    value={data.settings.profile.name}
                    onChange={(e) => updateData({ settings: { ...data.settings, profile: { ...data.settings.profile, name: e.target.value } } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Date of Birth</label>
                  <input 
                    type="date"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all"
                    value={data.settings.profile.dob}
                    onChange={(e) => updateData({ settings: { ...data.settings, profile: { ...data.settings.profile, dob: e.target.value } } })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">About You</label>
                   <textarea 
                     className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all min-h-[100px]"
                     value={data.settings.profile.about}
                     placeholder="Tell Pranto AI about your background..."
                     onChange={(e) => updateData({ settings: { ...data.settings, profile: { ...data.settings.profile, about: e.target.value } } })}
                   />
                </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">North Star Goals</label>
                   <textarea 
                     className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all min-h-[100px]"
                     value={data.settings.profile.goals}
                     placeholder="What are your big dreams?"
                     onChange={(e) => updateData({ settings: { ...data.settings, profile: { ...data.settings.profile, goals: e.target.value } } })}
                   />
                </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Off-Day Protocol</label>
                   <div className="flex gap-2">
                     {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                       <button
                         key={day}
                         onClick={() => {
                           const current = data.offDays || [];
                           const next = current.includes(day) 
                             ? current.filter(d => d !== day)
                             : [...current, day];
                           updateData({ offDays: next });
                         }}
                         className={cn(
                           "flex-1 py-4 rounded-xl font-black text-xs transition-all border",
                           data.offDays?.includes(day)
                             ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20"
                             : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100"
                         )}
                       >
                         {day.slice(0, 3)}
                       </button>
                     ))}
                   </div>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 ml-1">Days without mandatory task quotas</p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "AI Companion" && (
            <div className="space-y-10">
              <div className="flex items-center gap-10">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl bg-blue-600 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {data.settings.ai.identity.avatar ? (
                      <img src={data.settings.ai.identity.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <BrainCircuit className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <label className="bg-white p-3 rounded-2xl text-blue-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all border border-gray-100 cursor-pointer">
                      <Camera className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => updateData({ settings: { ...data.settings, ai: { ...data.settings.ai, identity: { ...data.settings.ai.identity, avatar: reader.result as string } } } });
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                    <button className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Wand2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900">Synthesis Core</h3>
                  <p className="text-gray-400 font-bold text-sm">Define your partner's essence</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Name</label>
                  <input 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all"
                    value={data.settings.ai.identity.name}
                    onChange={(e) => updateData({ settings: { ...data.settings, ai: { ...data.settings.ai, identity: { ...data.settings.ai.identity, name: e.target.value } } } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Persona</label>
                  <select 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all"
                    value={data.settings.ai.identity.persona}
                    onChange={(e) => updateData({ settings: { ...data.settings, ai: { ...data.settings.ai, identity: { ...data.settings.ai.identity, persona: e.target.value as any } } } })}
                  >
                    {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Base Logic / Behavior</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-all min-h-[100px]"
                    value={data.settings.ai.identity.behavior}
                    onChange={(e) => updateData({ settings: { ...data.settings, ai: { ...data.settings.ai, identity: { ...data.settings.ai.identity, behavior: e.target.value } } } })}
                  />
                </div>
                <div className="col-span-2 space-y-4">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest px-1">Voice Selection</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-6">
                    {VOICES.map(v => (
                       <div key={v} className="flex flex-col gap-2">
                         <button
                           onClick={() => updateData({ settings: { ...data.settings, ai: { ...data.settings.ai, voice: { ...data.settings.ai.voice, selected: v } } } })}
                           className={cn(
                             "flex items-center gap-3 px-6 py-3 rounded-2xl font-bold border-2 transition-all",
                             data.settings.ai.voice.selected === v ? "border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10" : "border-gray-100 text-gray-400 hover:border-gray-200"
                           )}
                         >
                           <Volume2 className="w-5 h-5" />
                           {v}
                         </button>
                         <button 
                           onClick={() => playVoiceSample(v)}
                           className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1"
                         >
                           {playingVoice === v ? <RefreshCw className="w-2 h-2 animate-spin" /> : <PlayCircle className="w-2 h-2" />}
                           Test Sample
                         </button>
                       </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "Integrations" && (
            <div className="space-y-12">
              {/* Security notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Key Security Notice</p>
                  <p className="text-xs font-bold text-amber-700 leading-relaxed">
                    Your API keys are stored only on this device — never shared with anyone. Never share your keys with other people or paste them into untrusted websites. Keys are for your personal use only.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600">G</div>
                  <h3 className="text-xl font-black text-gray-900">Gemini Key</h3>
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                    className="ml-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-xl transition-all">
                    Get Free Key →
                  </a>
                </div>
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg text-indigo-500">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type={showKey ? "text" : "password"}
                      className="w-full bg-transparent border-b-2 border-gray-200 outline-none p-2 font-mono text-lg font-bold tracking-widest focus:border-indigo-500 transition-all"
                      value={data.settings.geminiKey}
                      onChange={(e) => updateData({ settings: { ...data.settings, geminiKey: e.target.value } })}
                      placeholder="Enter AI Studio Key..."
                      autoComplete="off"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-indigo-600 hover:underline"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {data.settings.geminiKey && (
                  <div className="flex items-center gap-2 text-green-600 text-xs font-black">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">✓</span>
                    Gemini key saved — vision, TTS, and Gemini models are active
                  </div>
                )}
              </div>

              {/* Dashboard Theme */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <span className="text-indigo-600 font-black text-sm"></span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Dashboard Style</h3>
                    <p className="text-xs text-gray-400 font-bold">Pick your vibe  switch anytime</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    { id: "glass", label: "Glass Command", desc: "Dark  Futuristic  Cyber", preview: "bg-slate-900", accent: "bg-blue-500" },
                    { id: "sport", label: "Sport Energy",  desc: "White  Bold  Score-based", preview: "bg-white border border-slate-200", accent: "bg-blue-600" },
                    { id: "zen",   label: "Minimal Zen",   desc: "Cream  Clean  Typography", preview: "bg-stone-100", accent: "bg-stone-900" },
                  ] as const).map(theme => {
                    const active = ((data.settings as any).dashboardTheme || "glass") === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => updateData({ settings: { ...data.settings, dashboardTheme: theme.id } as any })}
                        className={`relative p-5 rounded-[2rem] border-2 text-left transition-all ${active ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-gray-100 hover:border-gray-300"}`}
                      >
                        {active && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-black"></div>
                        )}
                        <div className={`w-full h-14 ${theme.preview} rounded-2xl mb-4 overflow-hidden flex items-end gap-1 p-2`}>
                          <div className={`w-3 h-8 ${theme.accent} rounded-sm opacity-80`} />
                          <div className={`w-3 h-5 ${theme.accent} rounded-sm opacity-50`} />
                          <div className={`w-3 h-10 ${theme.accent} rounded-sm opacity-80`} />
                          <div className={`w-3 h-6 ${theme.accent} rounded-sm opacity-50`} />
                        </div>
                        <div className="font-black text-gray-900 text-sm leading-tight">{theme.label}</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">{theme.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-gray-100" />

                            {/* Groq  free, works on Vercel & everywhere */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <span className="text-amber-600 font-black text-sm">G</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Groq API Key</h3>
                    <p className="text-xs text-gray-400 font-bold">Free  Works on Vercel, Windows app, everywhere</p>
                  </div>
                  <a href="https://console.groq.com" target="_blank" rel="noreferrer"
                    className="ml-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl transition-all">
                    Get Free Key 
                  </a>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-amber-800">
                    Groq gives you <strong>free access</strong> to Llama 3.3 70B, Mixtral, Gemma and more.
                    Unlike Ollama, it works on any device  no local install needed.
                    Sign up at console.groq.com  API Keys  Create Key  paste below.
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="gsk_..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-amber-500 transition-all"
                    value={data.settings.groqKey || ""}
                    onChange={(e) => updateData({ settings: { ...data.settings, groqKey: e.target.value } })}
                  />
                </div>
                {data.settings.groqKey && (
                  <div className="flex items-center gap-2 text-green-600 text-xs font-black">
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center"></span>
                    Groq key saved  switch to any Groq model in the AI chat
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "Data & Storage" && (
            <div className="space-y-12">
               <div className="p-10 bg-blue-600 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
                      <Cloud className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black">Cloud Sync</h3>
                      <p className="font-bold opacity-60">Last synced: {data.lastSync ? new Date(data.lastSync).toLocaleString() : "Never"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={syncToCloud}
                    className="w-full bg-white text-blue-600 font-black py-5 rounded-2xl shadow-lg hover:bg-gray-50 active:scale-95 transition-all text-lg"
                  >
                    Transmit to Cloud Now
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-6">
                 <button 
                   onClick={() => {
                     if (confirm("Are you sure you want to clear your entire chat history?")) {
                       updateData({ messages: [] });
                     }
                   }}
                   className="flex items-center gap-4 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all group"
                 >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-red-600 transition-colors shadow-sm">
                     <Trash2 className="w-6 h-6" />
                   </div>
                   <div className="flex flex-col items-start">
                     <span className="font-black text-xs uppercase tracking-widest text-gray-400 group-hover:text-gray-900 transition-colors">Clear Conversations</span>
                     <p className="text-[10px] font-bold text-gray-400">Permanently delete all messages</p>
                   </div>
                 </button>
                 
               </div>

               <div className="grid grid-cols-3 gap-6">
                 <button 
                   onClick={handleExport}
                   className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all group"
                 >
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors shadow-sm">
                     <Download className="w-6 h-6" />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-gray-400 group-hover:text-gray-900 transition-colors">Export JSON</span>
                 </button>
                 
                 <label className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all group cursor-pointer">
                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-amber-600 transition-colors shadow-sm">
                     <Upload className="w-6 h-6" />
                   </div>
                   <span className="font-black text-xs uppercase tracking-widest text-gray-400 group-hover:text-gray-900 transition-colors">Import JSON</span>
                   <input type="file" className="hidden" onChange={handleImport} />
                 </label>

                 <button 
                   onClick={() => {
                     if(confirm("DANGER: This will permanently delete ALL your data from this device AND the cloud. You will be logged out. Proceed?")) {
                       hardReset();
                     }
                   }}
                   className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-red-50 hover:border-red-100 hover:shadow-xl transition-all group"
                 >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors shadow-sm">
                      <RotateCcw className="w-6 h-6" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest text-gray-400 group-hover:text-red-900 transition-colors">Hard Reset</span>
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
