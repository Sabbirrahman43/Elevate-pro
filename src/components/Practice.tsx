import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import {
  Brain, GraduationCap, ArrowRight, CheckCircle2,
  Loader2, RefreshCw, Star, Image as ImageIcon, X, Volume2, Square
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatWithGemini } from "../lib/gemini";
import { chatWithGroq, speakText, stopSpeech } from "../lib/groq";
import { ChatMessage, Task } from "../types";
import { cn } from "../lib/utils";

// All working models  same as AIIntelligence
const MODELS = [
  { id: "llama-3.3-70b-versatile",                   name: "Llama 3.3 70B",  type: "groq" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout",  type: "groq" },
  { id: "openai/gpt-oss-120b",                       name: "GPT OSS 120B",   type: "groq" },
  { id: "gemini-2.5-flash",                          name: "Gemini Flash",   type: "gemini" },
  { id: "gemini-2.5-pro",                            name: "Gemini Pro",     type: "gemini" },
];

export const Practice: React.FC = () => {
  const { data, updateData } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopFnRef = useRef<(() => void) | null>(null);

  const pendingTasks = data.tasks.filter(t => data.practiceQueue.includes(t.id));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //  Build persona-aware system prompt 
  const buildExaminerPrompt = (task: Task) => {
    const persona = data.settings.ai.identity;
    const profile = data.settings.profile;
    return `You are ${persona.name}, the user's ${persona.persona}.
Behavior: ${persona.behavior}
User name: ${profile.name || "there"}.

EXAM MODE for: "${task.text}"

You are ${persona.name}, a strict but fair examiner. ${persona.behavior}
User: ${profile.name || "student"}. Goals: ${profile.goals || "improve"}.

Present ALL questions at once in this exact format:

---
**Q1** [20 pts]
[Specific question about ${task.text}]

A) [option]
B) [option]  
C) [option]
D) [option]

**Q2** [20 pts]
[Conceptual question]

A) [option]
B) [option]
C) [option]
D) [option]

**Q3** [20 pts]
[Practical application - short answer, no options needed]

**Q4** [20 pts]
[Critical thinking question - short answer]

**Q5** [20 pts]
[Reflection: what was the most important thing you learned from "${task.text}"?]
---

After user answers, evaluate and show:

**Results:**
| Question | Points Earned |
|----------|--------------|
| Q1 | X/20 |
| Q2 | X/20 |
| Q3 | X/20 |
| Q4 | X/20 |
| Q5 | X/20 |

**TOTAL_SCORE: [X]/100**
MASTERED: ${task.id}

Be ${persona.persona}-like. Motivate them. Never break character.`
  };

  //  Call correct AI based on model type 
  const callAI = async (msgs: ChatMessage[], task: Task): Promise<string> => {
    const systemMsg: ChatMessage = {
      id: "system",
      role: "assistant",
      content: buildExaminerPrompt(task),
      timestamp: Date.now(),
    };
    const fullMsgs = [systemMsg, ...msgs];

    if (selectedModel.type === "gemini") {
      if (!data.settings.geminiKey) throw new Error("No Gemini key. Switch to a Groq model or add key in Settings.");
      const result = await chatWithGemini(fullMsgs, data, selectedModel.id);
      return result.text;
    } else {
      if (!data.settings.groqKey) throw new Error("No Groq key. Get free key at console.groq.com  add in Settings.");
      // For Groq, build proper messages with system prompt
      const apiKey = data.settings.groqKey;
      const body: any = {
        model: selectedModel.id,
        messages: [
          { role: "system", content: buildExaminerPrompt(task) },
          ...msgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        ],
        max_tokens: 2048,
        temperature: 0.7,
      };
      if (selectedModel.id.includes("gpt-oss") || selectedModel.id.includes("qwen3")) {
        body.reasoning_format = "hidden";
      }
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Groq error ${res.status}`);
      }
      const json = await res.json();
      return json.choices?.[0]?.message?.content || "";
    }
  };

  //  Start exam 
  const startTest = async (task: Task) => {
    setActiveTask(task);
    setMessages([]);
    setLoading(true);
    try {
      const kickoff: ChatMessage = {
        id: "kickoff",
        role: "user",
        content: `I have completed: "${task.text}". Please begin my evaluation.`,
        timestamp: Date.now(),
      };
      const responseText = await callAI([kickoff], task);
      const aiMsg: ChatMessage = {
        id: "init-response",
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
        model: selectedModel.name,
      };
      setMessages([kickoff, aiMsg]);
      autoSpeak(aiMsg.id, responseText);
    } catch (err: any) {
      const fallback = `I'm ${data.settings.ai.identity.name}, your ${data.settings.ai.identity.persona}. Let's evaluate "${task.text}". Tell me  what was the most important thing you learned?`;
      const msg: ChatMessage = { id: "init-fallback", role: "assistant", content: fallback, timestamp: Date.now() };
      setMessages([msg]);
    } finally {
      setLoading(false);
    }
  };

  //  Send answer 
  const handleSend = async () => {
    if ((!input.trim() && !image) || !activeTask || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input || "See attached image.",
      timestamp: Date.now(),
    };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      const responseText = await callAI(updatedMsgs, activeTask);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: Date.now(),
        model: selectedModel.name,
      };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      autoSpeak(aiMsg.id, responseText);

      // Check if mastered
      if (responseText.includes(`MASTERED: ${activeTask.id}`)) {
        const scoreMatch = responseText.match(/TOTAL_SCORE:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 100;
        const duration = Date.now() - (messages[0]?.timestamp || Date.now());
        updateData({
          practiceQueue: data.practiceQueue.filter(id => id !== activeTask.id),
          history: [...(data.history || []), {
            taskId: activeTask.id,
            taskText: activeTask.text,
            timestamp: Date.now(),
            duration,
            score,
          }],
          stats: {
            totalSessions: (data.stats?.totalSessions || 0) + 1,
            focusTime: (data.stats?.focusTime || 0) + Math.round(duration / 60000),
            dailyMarks: (data.stats?.dailyMarks || 0) + score,
          },
        });
        setTimeout(() => setActiveTask(null), 6000);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: ` ${err.message}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  //  Voice: auto-speak new AI messages 
  const autoSpeak = async (msgId: string, text: string) => {
    stopFnRef.current?.();
    stopSpeech();
    setPlayingId(msgId);
    const stopFn = await speakText(text, data, () => setPlayingId(null));
    stopFnRef.current = stopFn;
  };

  const handleToggleSpeak = async (msgId: string, text: string) => {
    if (playingId === msgId) {
      stopFnRef.current?.();
      stopSpeech();
      setPlayingId(null);
      return;
    }
    await autoSpeak(msgId, text);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-4 bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 border border-amber-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Practice Core</h1>
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">
              Examiner: {data.settings.ai.identity.name}  {data.settings.ai.identity.persona}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Model selector */}
          <div className="flex bg-white rounded-xl border border-slate-200 p-0.5">
            {MODELS.map(m => (
              <button key={m.id} onClick={() => setSelectedModel(m)}
                className={cn("px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all",
                  selectedModel.id === m.id ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}>
                {m.name}
              </button>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700">{data.stats?.dailyMarks || 0} pts</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Task list */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto shrink-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Queue ({pendingTasks.length})</p>
          {pendingTasks.length === 0 && (
            <div className="p-5 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No exams pending</p>
              <p className="text-slate-300 text-xs mt-1">Mark tasks done in Tasks tab first</p>
            </div>
          )}
          {pendingTasks.map(task => (
            <button key={task.id} onClick={() => startTest(task)}
              className={cn("text-left p-4 rounded-2xl border-2 transition-all",
                activeTask?.id === task.id
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-transparent hover:border-slate-200 text-slate-700")}>
              <CheckCircle2 className={cn("w-4 h-4 mb-2", activeTask?.id === task.id ? "text-amber-400" : "text-green-500")} />
              <p className="font-bold text-sm leading-snug">{task.text}</p>
            </button>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-[2.5rem] flex flex-col overflow-hidden border border-slate-100 min-h-0">
          {!activeTask ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4 border border-slate-100">
                <Brain className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-black text-slate-900">Select a task to begin</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
                {data.settings.ai.identity.name} will quiz you on what you've learned, then grade your answers.
              </p>
              {!data.settings.groqKey && !data.settings.geminiKey && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800">
                   Add a Groq (free) or Gemini API key in Settings to enable AI examination
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Exam header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-black">
                    {data.settings.ai.identity.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-900 truncate max-w-xs">{activeTask.text}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {data.settings.ai.identity.name}  {selectedModel.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => startTest(activeTask)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">
                  <RefreshCw className="w-3 h-3" /> Restart
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.filter(m => m.id !== "kickoff").map(msg => (
                  <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[90%] px-5 py-4 rounded-3xl",
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-tr-sm"
                        : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-200")}>
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:font-black prose-table:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                      {msg.role === "assistant" && (
                        <button onClick={() => handleToggleSpeak(msg.id, msg.content)}
                          className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                            playingId === msg.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}>
                          {playingId === msg.id
                            ? <><Square className="w-3 h-3 fill-current" /> Stop</>
                            : <><Volume2 className="w-3 h-3" /> Listen</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-50 px-5 py-4 rounded-3xl rounded-tl-sm border border-slate-200 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {data.settings.ai.identity.name} is thinking
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                {image && (
                  <div className="relative inline-block mb-2 ml-1">
                    <img src={`data:${image.mimeType};base64,${image.base64}`} className="h-16 w-16 object-cover rounded-xl border-2 border-slate-900" />
                    <button onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onloadend = () => setImage({ base64: (r.result as string).split(",")[1], mimeType: f.type });
                    r.readAsDataURL(f);
                  }} />
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-slate-900 transition-colors">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={`Answer ${data.settings.ai.identity.name}`}
                    className="flex-1 bg-transparent py-3 outline-none font-semibold text-sm" />
                  <button onClick={handleSend} disabled={(!input.trim() && !image) || loading}
                    className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all disabled:opacity-40 shrink-0">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
