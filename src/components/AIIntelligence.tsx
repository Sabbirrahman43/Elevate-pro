import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import {
  Send, Mic, Phone, PhoneOff, Image as ImageIcon,
  Settings2, Trash2, Copy, RefreshCw, Search, Users, Calendar,
  Zap, Volume2, Brain, Loader2, Square, StopCircle, MicOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { chatWithGemini } from "../lib/gemini";
import { chatWithGroq, speakText, stopSpeech } from "../lib/groq";
import { ChatMessage } from "../types";
import { cn } from "../lib/utils";

// All models  Gemini + Groq (all verified live April 2026)
const ALL_MODELS = [
  //  Gemini 
  { id: "gemini-2.5-flash",      name: "Gemini Flash",  type: "gemini", dot: "bg-blue-500",   desc: "Fast  Google" },
  { id: "gemini-2.5-pro",        name: "Gemini Pro",    type: "gemini", dot: "bg-purple-500", desc: "Smartest  Google" },
  { id: "gemini-2.5-flash-lite", name: "Gemini Lite",   type: "gemini", dot: "bg-indigo-400", desc: "Cheapest  Google" },
  //  Groq FREE  works on Vercel, Windows, everywhere 
  { id: "llama-3.3-70b-versatile",                   name: "Llama 3.3 70B",  type: "groq" as const, dot: "bg-amber-500",  desc: "Best quality  Free" },
  { id: "llama-3.1-8b-instant",                      name: "Llama 3.1 8B",   type: "groq" as const, dot: "bg-amber-400",  desc: "Instant  Free" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout",  type: "groq" as const, dot: "bg-orange-500", desc: "Latest Meta  Vision" },
  { id: "openai/gpt-oss-120b",                       name: "GPT OSS 120B",   type: "groq" as const, dot: "bg-green-500",  desc: "Most powerful" },
  { id: "openai/gpt-oss-20b",                        name: "GPT OSS 20B",    type: "groq" as const, dot: "bg-green-400",  desc: "Fast reasoning" },
  { id: "qwen/qwen3-32b",                            name: "Qwen 3 32B",     type: "groq" as const, dot: "bg-teal-500",   desc: "Multilingual  Reasoning" },
];

const MODES = [
  { id: "Chat",      icon: Users,    desc: "Warm companion" },
  { id: "Research",  icon: Search,   desc: "Deep & precise" },
  { id: "Support",   icon: Zap,      desc: "Listen & empathize" },
  { id: "Planner",   icon: Calendar, desc: "Break into steps" },
];

export const AIIntelligence: React.FC = () => {
  const { data, updateData } = useStore();
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = data.messages || []; }, [data.messages]);

  const setMessages = (setter: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => {
    const next = typeof setter === "function" ? setter(data.messages || []) : setter;
    updateData({ messages: next });
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => ALL_MODELS[0]);
  const [selectedMode, setSelectedMode] = useState("Chat");
  const [isLive, setIsLive] = useState(false);
  const [bgImage, setBgImage] = useState<string | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const voiceRecRef = useRef<any>(null);

  // TTS per message
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const stopFnRef = useRef<(() => void) | null>(null);

  // Live mode
  const [liveState, setLiveState] = useState<"Listening" | "Thinking" | "Speaking">("Listening");
  const [liveTimer, setLiveTimer] = useState(0);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data.messages]);

  useEffect(() => {
    if (!isLive) { setLiveTimer(0); return; }
    const t = setInterval(() => setLiveTimer(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  //  Task actions 
  const handleTaskAction = (args: any) => {
    const { action, text, taskId } = args;
    if (action === "create" && text) {
      updateData({ tasks: [...data.tasks, { id: Date.now().toString(), text, completed: false, date: new Date().toISOString().split("T")[0], createdAt: Date.now() }] });
    } else if (action === "delete" && taskId) {
      updateData({ tasks: data.tasks.filter(t => t.id !== taskId) });
    } else if (action === "toggle" && taskId) {
      updateData({ tasks: data.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) });
    }
  };

  //  SPEAK: Groq Orpheus TTS  Gemini TTS  browser fallback 
  const handleSpeak = async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      stopFnRef.current?.();
      stopSpeech();
      setPlayingMsgId(null);
      setTtsLoading(null);
      return;
    }
    stopFnRef.current?.();
    stopSpeech();
    setPlayingMsgId(msgId);
    setTtsLoading(msgId);

    const stopFn = await speakText(text, data, () => {
      setPlayingMsgId(null);
      setTtsLoading(null);
    });
    setTtsLoading(null);
    stopFnRef.current = stopFn;
  };

  //  Send message 
  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now() };
    const currentMessages = [...(messagesRef.current), userMsg];
    setMessages(currentMessages);
    setInput("");
    setLoading(true);
    if (isLive) setLiveState("Thinking");

    try {
      let responseText = "";
      let usedModel = selectedModel.name;

      if (selectedModel.type === "gemini") {
        if (!data.settings.geminiKey) throw new Error("No Gemini key. Add it in Settings  Integrations, or switch to a Groq model (free).");
        const result = await chatWithGemini(currentMessages, data, selectedModel.id, undefined, handleTaskAction);
        responseText = result.text;
      } else {
        // Groq  works on Vercel, Windows app, everywhere
        if (!data.settings.groqKey) throw new Error("No Groq key. Get one free at console.groq.com  Add it in Settings  Integrations.");
        const result = await chatWithGroq(currentMessages, data, selectedModel.id, handleTaskAction);
        responseText = result.text;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
        model: usedModel,
      };
      const finalMessages = [...currentMessages, aiMsg];
      setMessages(finalMessages);

      // Auto-speak in live mode
      if (isLive) {
        setLiveState("Speaking");
        const stopFn = speakBrowser(responseText.substring(0, 500), data.settings.ai.voice.selected, () => {
          setLiveState("Listening");
          recognitionRef.current?.start();
        });
        stopFnRef.current = stopFn;
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: ` ${err.message || "Something went wrong."}`,
        timestamp: Date.now(),
      }]);
      if (isLive) setLiveState("Listening");
    } finally {
      setLoading(false);
    }
  };

  //  Voice recording 
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input needs Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => setIsRecording(true);
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    voiceRecRef.current = rec;
    rec.start();
  };
  const stopVoice = () => { try { voiceRecRef.current?.stop(); } catch {} };

  //  Live Mode 
  const startLive = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Live mode needs Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      if (transcript) handleSend(transcript);
    };
    rec.onend = () => { if (isLive && liveState === "Listening") { try { rec.start(); } catch {} } };
    recognitionRef.current = rec;
    setIsLive(true);
    setLiveState("Listening");
    rec.start();
  };

  const stopLive = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopSpeech();
    setIsLive(false);
    setLiveState("Listening");
    setPlayingMsgId(null);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const hasKey = selectedModel.type === "gemini" ? !!data.settings.geminiKey : !!data.settings.groqKey;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative rounded-[3rem] overflow-hidden bg-white shadow-2xl border border-gray-100">
      {bgImage && <div className="absolute inset-0 z-0 opacity-15 blur-3xl scale-110 pointer-events-none" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: "cover" }} />}

      {/* Header */}
      <div className="relative z-10 p-5 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">Intelligence</h2>
              <div className={cn("w-2 h-2 rounded-full", selectedModel.dot)} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedModel.name}</p>
          </div>
          {/* Mode tabs */}
          <div className="hidden md:flex gap-1 p-1 bg-gray-50 rounded-2xl border border-gray-100">
            {MODES.map(mode => (
              <button key={mode.id} onClick={() => setSelectedMode(mode.id)}
                className={cn("px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all text-xs",
                  selectedMode === mode.id ? "bg-white text-blue-600 shadow-sm font-bold" : "text-gray-400 hover:text-gray-600")}>
                <mode.icon className="w-3.5 h-3.5" />{mode.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Model selector  stays on what user picks */}
          <select
            className="bg-gray-100 border-none rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer hover:bg-gray-200 transition-all max-w-[160px]"
            value={selectedModel.id}
            onChange={(e) => { const m = ALL_MODELS.find(m => m.id === e.target.value); if (m) setSelectedModel(m); }}
          >
            <optgroup label=" Gemini (needs Gemini key)">
              {ALL_MODELS.filter(m => m.type === "gemini").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
            <optgroup label=" Groq FREE (works everywhere)">
              {ALL_MODELS.filter(m => m.type === "groq").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </optgroup>
          </select>
          <button onClick={startLive} className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-90">
            <Phone className="w-4 h-4" />
          </button>
          <button onClick={() => setMessages([])} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* No key warning */}
      {!hasKey && (
        <div className="relative z-10 mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <span className="text-amber-500 text-lg"></span>
          <div>
            <p className="text-xs font-black text-amber-800">
              {selectedModel.type === "groq"
                ? "No Groq key  get a FREE one at console.groq.com, then add in Settings  Integrations"
                : "No Gemini key  add in Settings  Integrations, or switch to a Groq model (free)"}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto p-6 space-y-5">
        {(!data.messages || data.messages.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto gap-6">
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center">
              <Brain className="w-10 h-10 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">How can I help?</h3>
              <p className="text-gray-500 font-bold mt-2">I'm {data.settings.ai.identity.name}, your {data.settings.ai.identity.persona}.</p>
            </div>
            {/* Model info cards */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <div className="bg-blue-50 rounded-2xl p-4 text-left">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Gemini</p>
                <p className="text-xs text-blue-800 font-bold">Needs Google API key. High quality TTS voice included.</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-left">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Groq FREE </p>
                <p className="text-xs text-amber-800 font-bold">Free key at console.groq.com. Works on Vercel & everywhere.</p>
              </div>
            </div>
          </div>
        )}

        {data.messages?.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] px-5 py-4 rounded-[2rem] relative group/msg shadow-sm",
              msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200")}>
              <p className="text-base leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
              <div className={cn("mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40",
                msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.model && <span>{msg.model}</span>}
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {msg.role === "assistant" && (
                  <button onClick={() => handleSpeak(msg.id, msg.content)}
                    className={cn("ml-1 p-1.5 rounded-lg transition-all opacity-100",
                      playingMsgId === msg.id ? "bg-blue-500 text-white" : "hover:text-blue-600 hover:bg-blue-50 text-gray-400")}
                    title={playingMsgId === msg.id ? "Stop" : "Speak"}>
                    {ttsLoading === msg.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : playingMsgId === msg.id
                        ? <Square className="w-3 h-3 fill-current" />
                        : <Volume2 className="w-3 h-3" />}
                  </button>
                )}
                {msg.role === "assistant" && (
                  <button onClick={() => navigator.clipboard.writeText(msg.content)}
                    className="p-1.5 rounded-lg hover:text-blue-600 hover:bg-blue-50 text-gray-400 transition-all opacity-0 group-hover/msg:opacity-100">
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-5 py-4 rounded-[2rem] rounded-tl-sm border border-gray-200">
              <div className="flex gap-1.5">
                {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 p-5 bg-white/90 backdrop-blur-md border-t border-gray-100">
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-3xl p-2 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
          <input type="file" id="bg-upload" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const r = new FileReader(); r.onload = (ev) => setBgImage(ev.target?.result as string); r.readAsDataURL(file);
          }} />
          <label htmlFor="bg-upload" className="p-2.5 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors flex-shrink-0">
            <ImageIcon className="w-5 h-5" />
          </label>
          <input type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isRecording ? "Listening release to send" : `Message ${data.settings.ai.identity.name}`}
            className="flex-1 bg-transparent px-1 py-3 outline-none font-bold text-base"
          />
          <button
            onMouseDown={startVoice} onMouseUp={stopVoice}
            onTouchStart={startVoice} onTouchEnd={stopVoice}
            className={cn("w-11 h-11 flex items-center justify-center rounded-2xl transition-all flex-shrink-0",
              isRecording ? "bg-red-500 text-white animate-pulse scale-110" : "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600")}>
            {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={() => handleSend()} disabled={!input.trim() || loading}
            className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center rounded-2xl hover:bg-black transition-all disabled:opacity-40 flex-shrink-0 active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Live mode overlay */}
      <AnimatePresence>
        {isLive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-between py-16 text-white overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
            </div>
            <div className="relative z-10 text-center">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-blue-500/40">
                <Brain className="text-white w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Live  {fmt(liveTimer)}</p>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <div className="w-52 h-52 rounded-full border border-white/10 flex items-center justify-center bg-slate-800/60 backdrop-blur-3xl shadow-2xl relative">
                {liveState === "Listening" && <div className="absolute inset-0 rounded-full border-2 border-green-500/40 scale-125 opacity-0 animate-ping" />}
                <div className="flex flex-col items-center gap-3">
                  {liveState === "Listening" && <Mic className="w-16 h-16 text-green-500 animate-pulse" />}
                  {liveState === "Thinking"  && <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />}
                  {liveState === "Speaking"  && <Volume2 className="w-16 h-16 text-blue-500 animate-bounce" />}
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{liveState}</span>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-4xl font-black tracking-tighter">{data.settings.ai.identity.name}</h2>
                <p className="text-sm text-white/40 font-medium mt-1">{selectedModel.name}</p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => { stopSpeech(); setLiveState("Listening"); try { recognitionRef.current?.start(); } catch {} }}
                  className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center border border-white/10 transition-all active:scale-90">
                  <StopCircle className="w-7 h-7 text-white/60" />
                </button>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Interrupt</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={stopLive}
                  className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-105 active:scale-90 transition-all border-4 border-slate-900">
                  <PhoneOff className="w-9 h-9" />
                </button>
                <span className="text-[9px] font-bold text-red-400/60 uppercase tracking-[0.2em]">End Call</span>
              </div>
              <div className="flex flex-col items-center gap-2 opacity-20">
                <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                  <MicOff className="w-7 h-7" />
                </div>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Mute</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
