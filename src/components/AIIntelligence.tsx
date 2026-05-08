import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import {
  Send, Mic, Phone, PhoneOff, Image as ImageIcon,
  Trash2, Copy, Volume2, Brain, Loader2, Square,
  StopCircle, MicOff, BookOpen, ChevronRight, ChevronLeft,
  Plus, X, RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { chatWithGemini } from "../lib/gemini";
import { chatWithGroq, speakText, stopSpeech } from "../lib/groq";
import { ChatMessage, Flashcard } from "../types";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── MODELS ───────────────────────────────────────────────────
const ALL_MODELS = [
  // Auto — always first
  { id: "auto",                                           name: "Auto",              type: "auto"   as const, dot: "bg-gradient-to-r from-blue-500 to-purple-500" },
  // Gemini (needs key)
  { id: "gemini-2.5-flash",                              name: "Gemini 2.5 Flash",  type: "gemini" as const, dot: "bg-blue-500"   },
  { id: "gemini-2.5-pro",                                name: "Gemini 2.5 Pro",    type: "gemini" as const, dot: "bg-purple-500" },
  { id: "gemini-2.0-flash",                              name: "Gemini 2.0 Flash",  type: "gemini" as const, dot: "bg-indigo-500" },
  // Groq FREE — confirmed working May 2026
  { id: "llama-3.3-70b-versatile",                       name: "Llama 3.3 70B",     type: "groq"   as const, dot: "bg-amber-500"  },
  { id: "llama-3.1-8b-instant",                          name: "Llama 3.1 8B",      type: "groq"   as const, dot: "bg-amber-400"  },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct",     name: "Llama 4 Scout",     type: "groq"   as const, dot: "bg-orange-500" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick",  type: "groq"   as const, dot: "bg-orange-600" },
  { id: "openai/gpt-oss-120b",                           name: "GPT OSS 120B",      type: "groq"   as const, dot: "bg-green-500"  },
  { id: "openai/gpt-oss-20b",                            name: "GPT OSS 20B",       type: "groq"   as const, dot: "bg-green-400"  },
];

// ─── MODES ────────────────────────────────────────────────────
const MODES = [
  { id: "Chat",     emoji: "💬", label: "Chat",     color: "bg-blue-500",   desc: "Casual, warm, like a friend" },
  { id: "Research", emoji: "🔬", label: "Research",  color: "bg-purple-500", desc: "Deep dives, sources, structured" },
  { id: "Support",  emoji: "🫂", label: "Support",   color: "bg-rose-500",   desc: "Listen, empathize, comfort" },
  { id: "Planner",  emoji: "📅", label: "Planner",   color: "bg-amber-500",  desc: "Plans, timelines, action steps" },
  { id: "Learner",  emoji: "🎓", label: "Learner",   color: "bg-emerald-500",desc: "Teach, flashcards, learning paths" },
];

// ─── MODE → DATA KEY ──────────────────────────────────────────
const modeToKey = (mode: string) => {
  if (mode === "Research") return "researchMessages";
  if (mode === "Support")  return "supportMessages";
  if (mode === "Planner")  return "plannerMessages";
  if (mode === "Learner")  return "learnerMessages";
  return "messages";
};

// ─── AI AVATAR ────────────────────────────────────────────────
const AIAvatar: React.FC<{ avatar?: string; name: string; size?: "sm" | "md" | "lg" }> = ({ avatar, name, size = "md" }) => {
  const sz = size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-14 h-14 text-2xl" : "w-10 h-10 text-base";
  if (avatar) return <img src={avatar} className={cn(sz, "rounded-2xl object-cover flex-shrink-0 border-2 border-white shadow-md")} alt={name} />;
  return (
    <div className={cn(sz, "rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-white flex-shrink-0 shadow-md border-2 border-white")}>
      {name.charAt(0)}
    </div>
  );
};

// ─── FLASHCARD PANEL (Learner mode) ───────────────────────────
const FlashcardPanel: React.FC = () => {
  const { data, updateData } = useStore();
  const cards = data.flashcards || [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const deleteCard = (id: string) => {
    updateData({ flashcards: data.flashcards.filter(c => c.id !== id) });
    if (idx >= cards.length - 1) setIdx(Math.max(0, idx - 1));
  };

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center">
        <BookOpen className="w-8 h-8 text-emerald-400" />
      </div>
      <p className="font-black text-slate-400 text-sm">No flashcards yet</p>
      <p className="text-xs text-slate-300 max-w-[200px]">Ask me to explain a topic in Learner mode and say "yes" when I offer to create a flashcard.</p>
    </div>
  );

  const card = cards[idx % cards.length];

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Flashcards · {cards.length}</span>
        <button onClick={() => setShowAll(s => !s)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
          {showAll ? "Show Card" : "Show All"}
        </button>
      </div>

      {showAll ? (
        <div className="flex-1 overflow-y-auto space-y-2">
          {cards.map((c, i) => (
            <div key={c.id} onClick={() => { setIdx(i); setFlipped(false); setShowAll(false); }}
              className="p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{c.front}</p>
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">{c.topic}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteCard(c.id); }}
                className="p-1 text-slate-300 hover:text-red-400 flex-shrink-0 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Card */}
          <div onClick={() => setFlipped(f => !f)}
            className={cn(
              "flex-1 cursor-pointer rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 select-none min-h-[180px] border-2",
              flipped
                ? "bg-slate-900 text-white border-slate-700"
                : "bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200 text-slate-800"
            )}>
            {!flipped && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Tap to reveal answer</p>}
            <p className="font-black text-base leading-snug">{flipped ? card.back : card.front}</p>
            {flipped && <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Tap to flip back</p>}
            <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", flipped ? "text-emerald-400" : "text-blue-400")}>{card.topic}</p>
          </div>
          {/* Nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setIdx(i => (i - 1 + cards.length) % cards.length); setFlipped(false); }}
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center text-xs font-black text-slate-400">{(idx % cards.length) + 1} / {cards.length}</div>
            <button onClick={() => { setFlipped(false); }}
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => { setIdx(i => (i + 1) % cards.length); setFlipped(false); }}
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => deleteCard(card.id)}
            className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest text-center py-1 transition-colors">
            Delete this card
          </button>
        </>
      )}
    </div>
  );
};

// ─── COMMON SENSE SYSTEM PROMPT ──────────────────────────────
function buildSystemPrompt(data: any, mode: string): string {
  const persona = data.settings.ai.identity;
  const profile = data.settings.profile;
  const activeTasks    = data.tasks.filter((t: any) => !t.completed).map((t: any) => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const completedTasks = data.tasks.filter((t: any) => t.completed).slice(-5).map((t: any) => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const habitList      = data.habits.map((h: any) => `- [HABIT:${h.id}] ${h.name}`).join("\n") || "None";
  const flashcards     = (data.flashcards || []).map((f: any) => `- ${f.topic}: ${f.front}`).join("\n") || "None";
  const timeStr        = new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

  const BASE = `You are ${persona.name}, ${profile.name ? `${profile.name}'s` : "the user's"} ${persona.persona}.
${persona.behavior}

RIGHT NOW: ${timeStr}

USER PROFILE:
- Name: ${profile.name || "friend"} | DOB: ${profile.dob || "unknown"}
- Goals: ${profile.goals || "not set"}
- About: ${profile.about || "not set"}

THEIR DATA:
Active tasks:\n${activeTasks}
Recently completed:\n${completedTasks}
Habits:\n${habitList}
Flashcards made:\n${flashcards}

CORE RULES (never break these):
- Never say "Certainly!", "Of course!", "Great question!", "Absolutely!", "As an AI"
- Never guess facts. If you don't know something with confidence, say so directly.
- Never repeat yourself from previous messages in this conversation.
- Be proportional: one-line question → one-paragraph max. Deep question → thorough.
- Use ${profile.name || "their name"} occasionally — not every message.
- Have real opinions. When asked "which is better" → give a direct answer with reasoning.

TASK & HABIT MANAGEMENT — append silent JSON at end when user asks:
{"action":"task_create","text":"description"}
{"action":"task_toggle","taskId":"ID_without_TASK_prefix"}
{"action":"task_delete","taskId":"ID_without_TASK_prefix"}
{"action":"habit_create","name":"name"}
{"action":"habit_log","habitId":"ID_without_HABIT_prefix"}
{"action":"habit_delete","habitId":"ID_without_HABIT_prefix"}`;

  const modePrompts: Record<string, string> = {
    Chat: `${BASE}

MODE: CHAT COMPANION
Tone: Warm, real, casual. Like a trusted friend who actually listens.
- React to their emotional state first before anything else.
- If they're venting — listen. Don't fix unless they ask.
- If they're happy — be happy with them.
- If they joke — be funny back. Don't be stiff.
- Never give unsolicited productivity advice in this mode.
- Short messages get short replies. Match their energy exactly.`,

    Research: `${BASE}

MODE: RESEARCH ANALYST
Tone: Sharp, precise, confident where warranted, honest about uncertainty.
- Think step by step BEFORE giving the final answer.
- Use real structure: headers, bullets, tables — but only when it genuinely helps.
- NEVER make up facts, statistics, or sources. If you're not sure → say "I'm not certain, but..." or "You should verify this."
- Give the most accurate answer you can based on real knowledge.
- Acknowledge different expert perspectives on contested topics.
- End complex answers with: "What would you like to dig deeper on?"`,

    Support: `${BASE}

MODE: MENTAL HEALTH SUPPORT SPECIALIST
Tone: Calm, warm, non-judgmental, clinically informed.
You are trained in evidence-based therapeutic approaches: CBT, motivational interviewing, active listening, trauma-informed care.

STRICT RULES FOR THIS MODE:
- NEVER jump to solutions or advice without permission. Your first job is to make them feel truly heard.
- ALWAYS validate their feelings first: "That sounds really hard." / "It makes sense you'd feel that way."
- Ask ONE gentle open question at a time. Never bombard.
- If they express hopelessness, self-harm thoughts, or crisis: acknowledge with full seriousness, provide the Shundro crisis line (16789) and suggest speaking to a trusted person or professional.
- Reflect back what they said in your own words to show you understood.
- Use "I notice..." and "It sounds like..." instead of "You should..."
- Never minimize feelings ("it's not that bad", "others have it worse").
- If they ask for advice directly → give it thoughtfully, then check how it lands.
- Recognize signs of anxiety, depression, burnout, isolation — respond with appropriate warmth.
- You are NOT a replacement for professional help. If the situation seems serious, gently say so.`,

    Planner: `${BASE}

MODE: STRATEGIC PLANNER
Tone: Practical, structured, direct. No fluff.
- Ask ONE clarifying question before planning if the goal is unclear.
- Break everything into numbered steps with realistic timeframes.
- Use tables for comparisons, timelines for scheduling.
- Flag potential obstacles before the user hits them.
- Prioritize ruthlessly: what matters most? What can wait? What should be dropped?
- Connect plans to their actual goals and tasks — reference what's in their data.
- End with: "What's the first step you can do in the next 24 hours?"`,

    Learner: `${BASE}

MODE: EXPERT TEACHER
Tone: Patient, clear, intellectually curious. Make learning feel easy.
- Explain like the person is smart but new to this topic.
- Use concrete analogies. Abstract concepts need real-world examples.
- Break complex topics into digestible steps.
- Check understanding: "Does this make sense so far?" after key concepts.
- Connect new knowledge to what they already know (check their flashcards above).
- After explaining a concept: naturally offer "Want me to make a flashcard for this?"
- If yes, add this EXACTLY at end of message (nothing after it):
FLASHCARD:{"front":"clear question","back":"concise answer","topic":"specific topic name"}
- Reference their existing flashcards to avoid repeating what they already know.
- Suggest quiz topics from what you've taught them.`,
  };

  return modePrompts[mode] || modePrompts.Chat;
}

// ─── AUTO MODEL RESOLVER ──────────────────────────────────────
const resolveAutoModel = (data: any) => {
  if (data.settings.groqKey) return ALL_MODELS.find(m => m.id === "llama-3.3-70b-versatile")!;
  if (data.settings.geminiKey) return ALL_MODELS.find(m => m.id === "gemini-2.5-flash")!;
  return ALL_MODELS.find(m => m.id === "llama-3.3-70b-versatile")!;
};

// ─── MAIN COMPONENT ───────────────────────────────────────────
export const AIIntelligence: React.FC = () => {
  const { data, updateData } = useStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState("Chat");
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<"Listening" | "Thinking" | "Speaking">("Listening");
  const [liveTimer, setLiveTimer] = useState(0);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voiceRecRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const stopFnRef = useRef<(() => void) | null>(null);

  // Model persisted in store
  const savedModelId = (data.settings as any).selectedModelId || "auto";
  const selectedModel = ALL_MODELS.find(m => m.id === savedModelId) || ALL_MODELS[0];
  const setSelectedModel = (m: typeof ALL_MODELS[0]) => {
    updateData({ settings: { ...data.settings, selectedModelId: m.id } } as any);
  };

  // Per-mode messages
  const msgKey = modeToKey(selectedMode) as keyof typeof data;
  const messages: ChatMessage[] = (data[msgKey] as ChatMessage[]) || [];
  const setMessages = (next: ChatMessage[]) => updateData({ [msgKey]: next } as any);

  const aiAvatar = data.settings.ai.identity.avatar;
  const aiName   = data.settings.ai.identity.name;
  const currentMode = MODES.find(m => m.id === selectedMode)!;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!isLive) { setLiveTimer(0); return; }
    const t = setInterval(() => setLiveTimer(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  // Task + Habit action handler
  const handleTaskAction = (args: any) => {
    const { action, text, name, taskId, habitId } = args;
    const today = new Date().toISOString().split("T")[0];
    // Tasks
    if ((action === "task_create" || action === "create") && text)
      updateData({ tasks: [...data.tasks, { id: Date.now().toString(), text, completed: false, date: today, createdAt: Date.now() }] });
    else if ((action === "task_delete" || action === "delete") && taskId)
      updateData({ tasks: data.tasks.filter((t: any) => t.id !== taskId) });
    else if ((action === "task_toggle" || action === "toggle") && taskId)
      updateData({ tasks: data.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !t.completed } : t) });
    // Habits
    else if (action === "habit_create" && name)
      updateData({ habits: [...data.habits, { id: Date.now().toString(), name, logs: {}, createdAt: Date.now() }] });
    else if (action === "habit_delete" && habitId)
      updateData({ habits: data.habits.filter((h: any) => h.id !== habitId) });
    else if (action === "habit_log" && habitId)
      updateData({ habits: data.habits.map((h: any) => h.id === habitId ? { ...h, logs: { ...h.logs, [today]: !h.logs?.[today] } } : h) });
  };

  // Flashcard extraction from AI response
  const extractFlashcard = (text: string): { clean: string; card: Flashcard | null } => {
    const match = text.match(/FLASHCARD:\s*(\{[^}]+\})/);
    if (!match) return { clean: text, card: null };
    try {
      const parsed = JSON.parse(match[1]);
      const card: Flashcard = {
        id: Date.now().toString(),
        front: parsed.front || "",
        back: parsed.back || "",
        topic: parsed.topic || "General",
        createdAt: Date.now(),
      };
      return { clean: text.replace(/FLASHCARD:\s*\{[^}]+\}/, "").trim(), card };
    } catch { return { clean: text, card: null }; }
  };

  // Send message
  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text, timestamp: Date.now() };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput("");
    setLoading(true);
    if (isLive) setLiveState("Thinking");

    try {
      const systemPrompt = buildSystemPrompt(data, selectedMode);
      let responseText = "";

      const callGroq = async (modelId: string) => {
        const result = await chatWithGroq(currentMessages, { ...data, _systemPrompt: systemPrompt } as any, modelId, handleTaskAction);
        return result.text;
      };
      const callGemini = async (modelId: string) => {
        const result = await chatWithGemini(currentMessages, { ...data, _systemPrompt: systemPrompt } as any, modelId, undefined, handleTaskAction);
        return result.text;
      };

      if (selectedModel.type === "auto") {
        const preferred = resolveAutoModel(data);
        try {
          responseText = preferred.type === "groq"
            ? await callGroq(preferred.id)
            : await callGemini(preferred.id);
        } catch {
          if (data.settings.geminiKey) responseText = await callGemini("gemini-2.5-flash");
          else if (data.settings.groqKey) responseText = await callGroq("llama-3.3-70b-versatile");
          else throw new Error("No API key. Add a free Groq key in Settings → Integrations.");
        }
      } else if (selectedModel.type === "gemini") {
        if (!data.settings.geminiKey) throw new Error("No Gemini key. Add in Settings → Integrations, or switch to a Groq model (free).");
        responseText = await callGemini(selectedModel.id);
      } else {
        if (!data.settings.groqKey) throw new Error("No Groq key. Get free at console.groq.com → Settings → Integrations.");
        responseText = await callGroq(selectedModel.id);
      }

      // Extract flashcard if Learner mode
      let finalText = responseText;
      if (selectedMode === "Learner") {
        const { clean, card } = extractFlashcard(responseText);
        finalText = clean;
        if (card) {
          updateData({ flashcards: [...(data.flashcards || []), card] });
          finalText += `\n\n✅ *Flashcard created! You can review it in the flashcard panel →*`;
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalText,
        timestamp: Date.now(),
        model: selectedModel.name,
      };
      setMessages([...currentMessages, aiMsg]);

      if (isLive) {
        setLiveState("Speaking");
        const stopFn = await speakText(finalText.substring(0, 500), data, () => {
          setLiveState("Listening");
          try { recognitionRef.current?.start(); } catch {}
        });
        stopFnRef.current = stopFn;
      }
    } catch (err: any) {
      setMessages([...currentMessages, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: `⚠️ ${err.message || "Something went wrong."}`, timestamp: Date.now(),
      }]);
      if (isLive) setLiveState("Listening");
    } finally {
      setLoading(false);
    }
  };

  // TTS
  const handleSpeak = async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      stopFnRef.current?.(); stopSpeech(); setPlayingMsgId(null); setTtsLoading(null); return;
    }
    stopFnRef.current?.(); stopSpeech();
    setPlayingMsgId(msgId); setTtsLoading(msgId);
    const stopFn = await speakText(text, data, () => { setPlayingMsgId(null); setTtsLoading(null); });
    setTtsLoading(null);
    stopFnRef.current = stopFn;
  };

  // Voice input
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice input works in Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US";
    rec.onstart = () => setIsRecording(true);
    rec.onresult = (e: any) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
    rec.onend = () => setIsRecording(false);
    rec.onerror = () => setIsRecording(false);
    voiceRecRef.current = rec;
    rec.start();
  };
  const stopVoice = () => { try { voiceRecRef.current?.stop(); } catch {} };

  // Live call
  const startLive = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Live mode needs Chrome or Edge."); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; if (t) handleSend(t); };
    rec.onend = () => { if (isLive && liveState === "Listening") { try { rec.start(); } catch {} } };
    recognitionRef.current = rec;
    setIsLive(true); setLiveState("Listening");
    rec.start();
  };
  const stopLive = () => {
    recognitionRef.current?.stop(); recognitionRef.current = null;
    stopSpeech(); setIsLive(false); setLiveState("Listening"); setPlayingMsgId(null);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const hasKey = selectedModel.type === "auto" ? (!!data.settings.groqKey || !!data.settings.geminiKey)
    : selectedModel.type === "gemini" ? !!data.settings.geminiKey : !!data.settings.groqKey;
  const flashcardCount = (data.flashcards || []).length;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col rounded-3xl overflow-hidden bg-white shadow-xl border border-gray-100">
      {/* ── Header ── */}
      <div className="p-4 border-b border-gray-100 bg-white flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-center gap-3">
          <AIAvatar avatar={aiAvatar} name={aiName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-gray-900">{aiName}</h2>
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", selectedModel.dot)} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{currentMode.emoji} {currentMode.label} · {selectedModel.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedMode === "Learner" && (
              <button onClick={() => setShowFlashcards(s => !s)}
                className={cn("relative px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all",
                  showFlashcards ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}>
                <BookOpen className="w-4 h-4" />
                Cards
                {flashcardCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{flashcardCount}</span>}
              </button>
            )}
            <select
              className="bg-gray-100 border-none rounded-xl px-2 py-2 text-xs font-bold outline-none cursor-pointer max-w-[130px]"
              value={selectedModel.id}
              onChange={(e) => { const m = ALL_MODELS.find(m => m.id === e.target.value); if (m) setSelectedModel(m); }}
            >
              <option value="auto">✨ Auto</option>
              <optgroup label="Gemini">
                {ALL_MODELS.filter(m => m.type === "gemini").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
              <optgroup label="Groq (Free)">
                {ALL_MODELS.filter(m => m.type === "groq").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </optgroup>
            </select>
            <button onClick={startLive} className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-90">
              <Phone className="w-4 h-4" />
            </button>
            <button onClick={() => setMessages([])} className="w-9 h-9 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setSelectedMode(m.id); setShowFlashcards(false); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-shrink-0",
                selectedMode === m.id ? `${m.color} text-white shadow-sm` : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
              <span>{m.emoji}</span>{m.label}
              {modeToKey(m.id) !== "messages" && ((data[modeToKey(m.id) as keyof typeof data] as any[])?.length ?? 0) > 0 && (
                <span className={cn("w-1.5 h-1.5 rounded-full", selectedMode === m.id ? "bg-white/60" : "bg-blue-400")} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── No key warning ── */}
      {!hasKey && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
          <span className="text-amber-500">⚠️</span>
          <p className="text-xs font-bold text-amber-800">
            {selectedModel.type === "groq" ? "No Groq key — get FREE at console.groq.com → Settings → Integrations"
              : selectedModel.type === "gemini" ? "No Gemini key — Settings → Integrations"
              : "Add a Groq (free) or Gemini key in Settings → Integrations"}
          </p>
        </div>
      )}

      {/* ── Body: messages + optional flashcard panel ── */}
      <div className="flex-1 flex min-h-0">
        {/* Messages */}
        <div ref={scrollRef} className={cn("flex-1 overflow-y-auto p-4 space-y-4", showFlashcards && "lg:w-1/2")}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center py-10">
              <AIAvatar avatar={aiAvatar} name={aiName} size="lg" />
              <div>
                <h3 className="text-xl font-black text-gray-900">{currentMode.emoji} {currentMode.label} mode</h3>
                <p className="text-sm text-gray-400 mt-1 font-medium max-w-[260px]">{currentMode.desc}</p>
              </div>
              {selectedMode === "Learner" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 max-w-[280px] text-left">
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">How flashcards work</p>
                  <p className="text-xs text-emerald-600 leading-relaxed">Ask me to teach you anything. When I offer to create a flashcard, say "yes" and it'll be saved here and in the Dashboard.</p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && <AIAvatar avatar={aiAvatar} name={aiName} size="sm" />}
              <div className={cn("max-w-[80%] px-4 py-3 rounded-3xl relative group/msg shadow-sm",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-800 rounded-tl-sm border border-gray-200")}>
                <div className={cn(
                  "text-sm leading-relaxed font-medium",
                  msg.role === "assistant" && "prose prose-sm max-w-none prose-p:my-1 prose-headings:font-black prose-strong:text-gray-900 prose-table:text-xs prose-a:text-blue-600"
                )}>
                  {msg.role === "user"
                    ? <p className="whitespace-pre-wrap">{msg.content}</p>
                    : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  }
                </div>
                <div className={cn("mt-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40",
                  msg.role === "user" ? "justify-end text-white" : "justify-start")}>
                  {msg.model && <span>{msg.model}</span>}
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {msg.role === "assistant" && (<>
                    <button onClick={() => handleSpeak(msg.id, msg.content)}
                      className={cn("ml-1 p-1 rounded-lg transition-all opacity-100",
                        playingMsgId === msg.id ? "bg-blue-500 text-white opacity-100" : "hover:text-blue-600 text-gray-400")}>
                      {ttsLoading === msg.id ? <Loader2 className="w-3 h-3 animate-spin" />
                        : playingMsgId === msg.id ? <Square className="w-3 h-3 fill-current" />
                        : <Volume2 className="w-3 h-3" />}
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="p-1 rounded-lg hover:text-blue-600 text-gray-400 transition-all opacity-0 group-hover/msg:opacity-100">
                      <Copy className="w-3 h-3" />
                    </button>
                  </>)}
                </div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <AIAvatar avatar={aiAvatar} name={aiName} size="sm" />
              <div className="bg-gray-100 px-4 py-3 rounded-3xl rounded-tl-sm border border-gray-200">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map(d => <div key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flashcard side panel (Learner mode) */}
        <AnimatePresence>
          {showFlashcards && selectedMode === "Learner" && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="border-l border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
              <FlashcardPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input ── */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-3xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
          <input type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isRecording ? "🎙️ Listening…" : `Message ${aiName}`}
            className="flex-1 bg-transparent outline-none font-medium text-sm py-1.5 px-1"
          />
          <button
            onMouseDown={startVoice} onMouseUp={() => { stopVoice(); if (input.trim()) handleSend(); }}
            onTouchStart={startVoice} onTouchEnd={() => { stopVoice(); setTimeout(() => { if (input.trim()) handleSend(); }, 200); }}
            title="Hold to speak"
            className={cn("w-9 h-9 flex items-center justify-center rounded-xl transition-all flex-shrink-0",
              isRecording ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600")}>
            {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={() => handleSend()} disabled={!input.trim() || loading}
            className="w-9 h-9 bg-gray-900 text-white flex items-center justify-center rounded-xl hover:bg-black transition-all disabled:opacity-40 flex-shrink-0 active:scale-95">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Live call overlay ── */}
      <AnimatePresence>
        {isLive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-between py-16 text-white">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
            </div>
            <div className="relative z-10 text-center">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Live · {fmt(liveTimer)}</p>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-6">
              <AIAvatar avatar={aiAvatar} name={aiName} size="lg" />
              <div className="w-40 h-40 rounded-full border border-white/10 flex items-center justify-center bg-slate-800/60 backdrop-blur-3xl relative">
                {liveState === "Listening" && <div className="absolute inset-0 rounded-full border-2 border-green-500/40 scale-125 opacity-0 animate-ping" />}
                <div className="flex flex-col items-center gap-2">
                  {liveState === "Listening" && <Mic className="w-12 h-12 text-green-500 animate-pulse" />}
                  {liveState === "Thinking"  && <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />}
                  {liveState === "Speaking"  && <Volume2 className="w-12 h-12 text-blue-500 animate-bounce" />}
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{liveState}</span>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-black">{aiName}</h2>
                <p className="text-sm text-white/40 mt-1">{selectedModel.name}</p>
              </div>
            </div>
            <div className="relative z-10">
              <button onClick={stopLive}
                className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-105 active:scale-90 transition-all">
                <PhoneOff className="w-7 h-7" />
              </button>
              <p className="text-[9px] font-black text-red-400/60 uppercase tracking-widest text-center mt-2">End Call</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
