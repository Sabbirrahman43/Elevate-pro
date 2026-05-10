import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { useNav } from "../App";
import {
  Brain, GraduationCap, ArrowRight, CheckCircle2,
  Loader2, RefreshCw, Star, Image as ImageIcon, X,
  Volume2, Square, Trophy, Clock, RotateCcw, Trash2,
  ChevronDown, ChevronRight
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatWithGemini } from "../lib/gemini";
import { chatWithGroq, speakText, stopSpeech } from "../lib/groq";
import { ChatMessage, Task } from "../types";
import { cn } from "../lib/utils";

// ─── ALL MODELS (updated full list) ──────────────────────────
const MODELS = [
  // Groq FREE — confirmed working May 2026
  { id: "llama-3.3-70b-versatile",                       name: "Llama 3.3 70B",    type: "groq",   tag: "FREE·BEST" },
  { id: "llama-3.1-8b-instant",                          name: "Llama 3.1 8B",     type: "groq",   tag: "FREE·FAST" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct",     name: "Llama 4 Scout",    type: "groq",   tag: "FREE·PDF" },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", type: "groq",   tag: "FREE·VISION" },
  { id: "openai/gpt-oss-120b",                           name: "GPT OSS 120B",     type: "groq",   tag: "FREE·SMART" },
  { id: "openai/gpt-oss-20b",                            name: "GPT OSS 20B",      type: "groq",   tag: "FREE·FAST" },
  // Gemini (needs key)
  { id: "gemini-2.5-flash",                              name: "Gemini 2.5 Flash", type: "gemini", tag: "KEY·FAST" },
  { id: "gemini-2.5-pro",                                name: "Gemini 2.5 Pro",   type: "gemini", tag: "KEY·BEST" },
  { id: "gemini-2.0-flash",                              name: "Gemini 2.0 Flash", type: "gemini", tag: "KEY·PDF" },
];

// ─── QUIZ TYPES ───────────────────────────────────────────────
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];   // A, B, C, D
  correct: number;     // index 0-3
  explanation: string;
  topic: string;
}

interface QuizSession {
  questions: QuizQuestion[];
  answers: (number | null)[];  // user's chosen index per question
  revealed: boolean[];
  score: number | null;
  topic: string;
  createdAt: number;
}

// ─── EXAM RESULT (persists) ──────────────────────────────────
interface ExamResult {
  id: string;
  taskText: string;
  score: number;
  messages: ChatMessage[];
  completedAt: number;
  duration: number;
}

// ─── HELPER: call AI ─────────────────────────────────────────
async function callAI(
  messages: ChatMessage[],
  systemPrompt: string,
  model: typeof MODELS[0],
  data: any
): Promise<string> {
  if (model.type === "gemini") {
    if (!data.settings.geminiKey) throw new Error("No Gemini key. Switch to a Groq model (FREE) or add key in Settings.");
    const result = await chatWithGemini(messages, { ...data, _systemPrompt: systemPrompt } as any, model.id);
    return result.text;
  } else {
    if (!data.settings.groqKey) throw new Error("No Groq key. Get free at console.groq.com → add in Settings → Integrations.");
    const body: any = {
      model: model.id,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ],
      max_tokens: 2048,
      temperature: 0.7,
    };
    if (model.id.includes("gpt-oss") || model.id.includes("qwen3") || model.id.includes("deepseek")) {
      body.reasoning_format = "hidden";
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${data.settings.groqKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error ${res.status}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  }
}

// ─── QUIZ PARSER ─────────────────────────────────────────────
function parseQuiz(text: string, topic: string): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  try {
    // Try JSON block first
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.map((q: any, i: number) => ({
        id: `q${i}`,
        question: q.question || q.q,
        options: q.options || [q.a, q.b, q.c, q.d],
        correct: typeof q.correct === "number" ? q.correct : ["A","B","C","D"].indexOf(q.correct),
        explanation: q.explanation || q.reason || "",
        topic,
      }));
    }
  } catch {}

  // Fallback: parse text format
  const blocks = text.split(/Q\d+[:.]/i).filter(b => b.trim().length > 20);
  blocks.forEach((block, i) => {
    const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
    const question = lines[0];
    const opts: string[] = [];
    let correct = 0;
    let explanation = "";
    lines.forEach(line => {
      const optMatch = line.match(/^([A-D])[.)]\s*(.+)/i);
      if (optMatch) opts.push(optMatch[2]);
      const corrMatch = line.match(/correct[:\s]+([A-D])/i) || line.match(/answer[:\s]+([A-D])/i);
      if (corrMatch) correct = ["A","B","C","D"].indexOf(corrMatch[1].toUpperCase());
      if (line.toLowerCase().includes("explanation") || line.toLowerCase().includes("reason")) {
        explanation = line.replace(/explanation[:\s]*/i, "").replace(/reason[:\s]*/i, "");
      }
    });
    if (question && opts.length >= 2) {
      questions.push({ id: `q${i}`, question, options: opts, correct, explanation, topic });
    }
  });
  return questions;
}

// ─── QUIZ COMPONENT ──────────────────────────────────────────
const QuizView: React.FC<{
  session: QuizSession;
  onAnswer: (qIdx: number, aIdx: number) => void;
  onReveal: (qIdx: number) => void;
  onFinish: () => void;
  onReset: () => void;
}> = ({ session, onAnswer, onReveal, onFinish, onReset }) => {
  const answered = session.answers.filter(a => a !== null).length;
  const total = session.questions.length;
  const allAnswered = answered === total;
  const finished = session.score !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Topic + score */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{session.topic}</p>
          <p className="text-sm font-bold text-slate-700 mt-0.5">{answered}/{total} answered</p>
        </div>
        {finished ? (
          <div className="flex items-center gap-3">
            <div className={cn("px-4 py-2 rounded-xl font-black text-lg",
              session.score! >= 80 ? "bg-emerald-100 text-emerald-700" :
              session.score! >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
              {session.score}%
            </div>
            <button onClick={onReset} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        ) : allAnswered ? (
          <button onClick={onFinish} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all">
            Check Results
          </button>
        ) : null}
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {session.questions.map((q, qIdx) => {
          const userAnswer = session.answers[qIdx];
          const revealed = session.revealed[qIdx];
          const isCorrect = userAnswer === q.correct;

          return (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="font-bold text-slate-900 text-sm leading-snug mb-4">
                <span className="text-blue-500 font-black mr-2">Q{qIdx + 1}.</span>{q.question}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oIdx) => {
                  let style = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300";
                  if (userAnswer === oIdx && !revealed) style = "bg-blue-50 border-blue-400 text-blue-800";
                  if (revealed) {
                    if (oIdx === q.correct) style = "bg-emerald-50 border-emerald-400 text-emerald-800";
                    else if (userAnswer === oIdx && oIdx !== q.correct) style = "bg-red-50 border-red-400 text-red-800";
                    else style = "bg-slate-50 border-slate-200 text-slate-400";
                  }
                  const letter = ["A","B","C","D"][oIdx];
                  return (
                    <button key={oIdx}
                      onClick={() => !revealed && onAnswer(qIdx, oIdx)}
                      disabled={revealed}
                      className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all font-medium text-sm", style,
                        !revealed && "cursor-pointer active:scale-[0.98]")}>
                      <span className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[11px] font-black flex-shrink-0 border border-current/20">
                        {letter}
                      </span>
                      {opt}
                      {revealed && oIdx === q.correct && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-500 flex-shrink-0" />}
                      {revealed && userAnswer === oIdx && oIdx !== q.correct && <X className="w-4 h-4 ml-auto text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {/* Reveal button or explanation */}
              {userAnswer !== null && !revealed && (
                <button onClick={() => onReveal(qIdx)}
                  className="mt-3 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-700 transition-colors">
                  Show Answer
                </button>
              )}
              {revealed && q.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    <span className="font-black">💡 </span>{q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── EXAM RESULT CARD ────────────────────────────────────────
const ExamResultCard: React.FC<{ result: ExamResult; onDelete: () => void }> = ({ result, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const mins = Math.round(result.duration / 60000);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0",
          result.score >= 80 ? "bg-emerald-100 text-emerald-700" :
          result.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
          {result.score}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{result.taskText}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" />{mins} min
            </span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              {new Date(result.completedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3 max-h-96 overflow-y-auto bg-slate-50">
          {result.messages.filter(m => m.id !== "kickoff").map(msg => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed",
                msg.role === "user" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-700")}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────
export const Practice: React.FC = () => {
  const { data, updateData } = useStore();
  const { practiceQuizTopic, setPracticeQuizTopic } = useNav();
  const [tab, setTab] = useState<"exam" | "quiz" | "history">("exam");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [image, setImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>(() => {
    try { return JSON.parse(localStorage.getItem("elevate_exam_results") || "[]"); } catch { return []; }
  });
  const [showModelSelect, setShowModelSelect] = useState(false);

  // Quiz state
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizCount, setQuizCount] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopFnRef = useRef<(() => void) | null>(null);

  const pendingTasks = data.tasks.filter(t => data.practiceQueue.includes(t.id));

  // Auto-trigger quiz from Learner AI mode
  useEffect(() => {
    if (practiceQuizTopic) {
      setTab("quiz");
      setQuizTopic(practiceQuizTopic);
      setQuizSession(null);
      setPracticeQuizTopic(null);
      // Auto-generate after a short delay
      setTimeout(() => {
        setQuizLoading(true);
        generateQuizForTopic(practiceQuizTopic, 10);
      }, 400);
    }
  }, [practiceQuizTopic]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist exam results
  useEffect(() => {
    localStorage.setItem("elevate_exam_results", JSON.stringify(examResults));
  }, [examResults]);

  // ── EXAM SYSTEM PROMPT ──────────────────────────────────────
  const buildExamPrompt = (task: Task) => {
    const persona = data.settings.ai.identity;
    const profile = data.settings.profile;
    return `You are ${persona.name}, a strict but fair examiner. ${persona.behavior}
User: ${profile.name || "student"}. Topic: "${task.text}". Goals: ${profile.goals || "improve"}.

Present 5 questions. Mix of multiple choice (Q1, Q2 — with A/B/C/D options) and short answer (Q3, Q4, Q5).
Format exactly:

**Q1** [20 pts]
[question]
A) option  B) option  C) option  D) option

**Q2** [20 pts]
[question]
A) option  B) option  C) option  D) option

**Q3** [20 pts] [Short answer]
[question]

**Q4** [20 pts] [Short answer]
[question]

**Q5** [20 pts] [Reflection]
What was the most important thing you learned from "${task.text}"?

After user answers, grade them, show a results table, then output:
**TOTAL_SCORE: X/100**
MASTERED: ${task.id}`;
  };

  // ── START EXAM ──────────────────────────────────────────────
  const startTest = async (task: Task) => {
    setActiveTask(task);
    setMessages([]);
    setLoading(true);
    setExamStartTime(Date.now());
    try {
      const kickoff: ChatMessage = { id: "kickoff", role: "user", content: `I completed: "${task.text}". Start my evaluation.`, timestamp: Date.now() };
      const text = await callAI([kickoff], buildExamPrompt(task), selectedModel, data);
      const aiMsg: ChatMessage = { id: "init", role: "assistant", content: text, timestamp: Date.now(), model: selectedModel.name };
      setMessages([kickoff, aiMsg]);
      autoSpeak(aiMsg.id, text);
    } catch (err: any) {
      setMessages([{ id: "err", role: "assistant", content: `⚠️ ${err.message}`, timestamp: Date.now() }]);
    } finally { setLoading(false); }
  };

  // ── SEND EXAM ANSWER ────────────────────────────────────────
  const handleSend = async () => {
    if ((!input.trim() && !image) || !activeTask || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input || "See image.", timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput(""); setImage(null); setLoading(true);
    try {
      const text = await callAI(updated, buildExamPrompt(activeTask), selectedModel, data);
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: text, timestamp: Date.now(), model: selectedModel.name };
      const final = [...updated, aiMsg];
      setMessages(final);
      autoSpeak(aiMsg.id, text);

      // Save result if exam completed
      if (text.includes(`MASTERED: ${activeTask.id}`)) {
        const scoreMatch = text.match(/TOTAL_SCORE:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 100;
        const duration = Date.now() - (examStartTime || Date.now());
        const result: ExamResult = { id: Date.now().toString(), taskText: activeTask.text, score, messages: final, completedAt: Date.now(), duration };
        setExamResults(prev => [result, ...prev]);
        updateData({
          practiceQueue: data.practiceQueue.filter(id => id !== activeTask.id),
          history: [...(data.history || []), { taskId: activeTask.id, taskText: activeTask.text, timestamp: Date.now(), duration, score }],
          stats: { totalSessions: (data.stats?.totalSessions || 0) + 1, focusTime: (data.stats?.focusTime || 0) + Math.round(duration / 60000), dailyMarks: (data.stats?.dailyMarks || 0) + score },
        });
        // Don't auto-close — user can review
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: `⚠️ ${err.message}`, timestamp: Date.now() }]);
    } finally { setLoading(false); }
  };

  // ── GENERATE QUIZ ──────────────────────────────────────────
  // Core quiz generator — callable with topic directly (from AI Learner mode)
  const generateQuizForTopic = async (topic: string, count: number) => {
    setQuizLoading(true);
    setQuizSession(null);
    const prompt = `Generate exactly ${count} multiple choice quiz questions about: "${topic}".

Return ONLY a JSON array, no other text:
[
  {
    "question": "question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct": 0,
    "explanation": "Why this answer is correct — teach something specific.",
    "topic": "${topic}"
  }
]

Rules:
- correct is INDEX (0=A, 1=B, 2=C, 3=D)
- Vary question types: definitions, applications, comparisons, scenarios
- All 4 options must be plausible (no obvious wrong answers)
- Explanations must be educational, not just "because X is correct"
- Return ONLY the JSON array, nothing else`;

    try {
      const msgs: ChatMessage[] = [{ id: "1", role: "user", content: prompt, timestamp: Date.now() }];
      const text = await callAI(msgs, "You are a quiz generator. Return only valid JSON arrays, no markdown.", selectedModel, data);
      let questions: QuizQuestion[] = [];
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) questions = JSON.parse(match[0]).map((q: any, i: number) => ({ ...q, id: `q${i}`, topic }));
      } catch { questions = parseQuiz(text, topic); }
      if (questions.length === 0) throw new Error("Could not parse quiz. Try a different model.");
      setQuizSession({ questions, answers: new Array(questions.length).fill(null), revealed: new Array(questions.length).fill(false), score: null, topic, createdAt: Date.now() });
    } catch (err: any) {
      alert(`Quiz failed: ${err.message}`);
    } finally { setQuizLoading(false); }
  };

  const generateQuiz = async () => {
    const topic = quizTopic.trim();
    if (!topic) return;
    await generateQuizForTopic(topic, quizCount);
  };

  const handleQuizAnswer = (qIdx: number, aIdx: number) => {
    if (!quizSession || quizSession.answers[qIdx] !== null) return;
    setQuizSession(prev => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[qIdx] = aIdx;
      return { ...prev, answers };
    });
  };

  const handleReveal = (qIdx: number) => {
    setQuizSession(prev => {
      if (!prev) return prev;
      const revealed = [...prev.revealed];
      revealed[qIdx] = true;
      return { ...prev, revealed };
    });
  };

  const handleFinishQuiz = () => {
    if (!quizSession) return;
    let correct = 0;
    const wrongTopics: string[] = [];
    quizSession.questions.forEach((q, i) => {
      if (quizSession.answers[i] === q.correct) correct++;
      else wrongTopics.push(q.question.substring(0, 60));
    });
    const score = Math.round((correct / quizSession.questions.length) * 100);
    const finalSession = { ...quizSession, score, revealed: quizSession.revealed.map(() => true) };
    setQuizSession(finalSession);

    // Save to exam results history
    const result: ExamResult = {
      id: Date.now().toString(),
      taskText: `Quiz: ${quizSession.topic}`,
      score,
      messages: [],
      completedAt: Date.now(),
      duration: Date.now() - quizSession.createdAt,
    };
    setExamResults(prev => [result, ...prev]);

    // Send quiz result back to Learner AI as context
    const feedbackMsg = {
      id: `quiz_result_${Date.now()}`,
      role: "assistant" as const,
      content: `📊 **Quiz Result — ${quizSession.topic}**\n\nScore: **${score}%** (${correct}/${quizSession.questions.length} correct)\n\n${score >= 80 ? "Great job! You have a solid understanding of this topic." : score >= 60 ? `You're getting there. Focus on reviewing these areas:\n${wrongTopics.map(t => `- ${t}`).join("\n")}` : `You need more practice. Key gaps:\n${wrongTopics.map(t => `- ${t}`).join("\n")}\n\nWant me to explain any of these in more detail?`}`,
      timestamp: Date.now(),
      model: "Quiz System",
    };
    const learnerKey = "learnerMessages";
    const existing = (data as any)[learnerKey] || [];
    updateData({ [learnerKey]: [...existing, feedbackMsg] } as any);
  };

  const autoSpeak = async (msgId: string, text: string) => {
    stopFnRef.current?.(); stopSpeech(); setPlayingId(msgId);
    const stopFn = await speakText(text, data, () => setPlayingId(null));
    stopFnRef.current = stopFn;
  };
  const handleToggleSpeak = async (msgId: string, text: string) => {
    if (playingId === msgId) { stopFnRef.current?.(); stopSpeech(); setPlayingId(null); return; }
    await autoSpeak(msgId, text);
  };

  const hasKey = !!data.settings.groqKey || !!data.settings.geminiKey;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* ── HEADER ── */}
      <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Practice Core</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Examiner: {data.settings.ai.identity.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black text-slate-700">{data.stats?.dailyMarks || 0} pts</span>
            </div>
            {/* Model selector */}
            <div className="relative">
              <button onClick={() => setShowModelSelect(s => !s)}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {selectedModel.name} <ChevronDown className="w-3 h-3" />
              </button>
              {showModelSelect && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 max-h-72 overflow-y-auto">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Groq — Free</p>
                    {MODELS.filter(m => m.type === "groq").map(m => (
                      <button key={m.id} onClick={() => { setSelectedModel(m); setShowModelSelect(false); }}
                        className={cn("w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-all",
                          selectedModel.id === m.id && "bg-slate-100")}>
                        <span className="text-xs font-bold text-slate-800">{m.name}</span>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">{m.tag}</span>
                      </button>
                    ))}
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 mt-1">Gemini — Needs Key</p>
                    {MODELS.filter(m => m.type === "gemini").map(m => (
                      <button key={m.id} onClick={() => { setSelectedModel(m); setShowModelSelect(false); }}
                        className={cn("w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-all",
                          selectedModel.id === m.id && "bg-slate-100")}>
                        <span className="text-xs font-bold text-slate-800">{m.name}</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg">{m.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
          {[
            { id: "exam",    label: "📝 Exam",     desc: "AI examines you" },
            { id: "quiz",    label: "🎯 Quiz",     desc: "Click-to-answer" },
            { id: "history", label: "📊 Results",  desc: "Past results" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn("flex-1 py-2 rounded-xl text-xs font-black transition-all",
                tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hasKey && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-xs font-bold text-amber-800">⚠️ Add a free Groq key at console.groq.com → Settings → Integrations to use AI features.</p>
        </div>
      )}

      {/* ── EXAM TAB ── */}
      {tab === "exam" && (
        <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">
          {/* Task list */}
          <div className="w-52 flex flex-col gap-2 overflow-y-auto shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Queue ({pendingTasks.length})</p>
            {pendingTasks.length === 0 && (
              <div className="p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No exams pending</p>
                <p className="text-slate-300 text-xs mt-1">Mark tasks done in Tasks tab first</p>
              </div>
            )}
            {pendingTasks.map(task => (
              <button key={task.id} onClick={() => startTest(task)}
                className={cn("text-left p-3 rounded-2xl border-2 transition-all",
                  activeTask?.id === task.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-transparent hover:border-slate-200 text-slate-700")}>
                <CheckCircle2 className={cn("w-4 h-4 mb-1.5", activeTask?.id === task.id ? "text-amber-400" : "text-green-500")} />
                <p className="font-bold text-xs leading-snug">{task.text}</p>
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="flex-1 bg-white rounded-3xl flex flex-col overflow-hidden border border-slate-100 min-h-0">
            {!activeTask ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center border border-slate-100">
                  <Brain className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Select a task to begin</h2>
                  <p className="text-slate-400 text-xs mt-1 max-w-[220px] leading-relaxed">
                    {data.settings.ai.identity.name} will quiz you on what you've learned, then grade your answers.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <p className="font-black text-sm text-slate-900 truncate max-w-[200px]">{activeTask.text}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedModel.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startTest(activeTask)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                      <RefreshCw className="w-3 h-3" /> Restart
                    </button>
                    <button onClick={() => setActiveTask(null)}
                      className="p-1.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-400 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.filter(m => m.id !== "kickoff").map(msg => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[90%] px-4 py-3 rounded-3xl shadow-sm",
                        msg.role === "user" ? "bg-slate-900 text-white rounded-tr-sm" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm")}>
                        <div className="prose prose-sm max-w-none prose-p:my-0.5 prose-headings:font-black prose-table:text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.role === "assistant" && (
                          <button onClick={() => handleToggleSpeak(msg.id, msg.content)}
                            className={cn("mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                              playingId === msg.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600")}>
                            {playingId === msg.id ? <><Square className="w-3 h-3 fill-current" /> Stop</> : <><Volume2 className="w-3 h-3" /> Listen</>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-3xl rounded-tl-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-slate-100 shrink-0">
                  {image && (
                    <div className="relative inline-block mb-2">
                      <img src={`data:${image.mimeType};base64,${image.base64}`} className="h-14 w-14 object-cover rounded-xl border-2 border-slate-900" />
                      <button onClick={() => setImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-2.5 h-2.5" /></button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => setImage({ base64: (r.result as string).split(",")[1], mimeType: f.type }); r.readAsDataURL(f); }} />
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-slate-700"><ImageIcon className="w-4 h-4" /></button>
                    <input value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Your answer…"
                      className="flex-1 bg-transparent py-2 outline-none font-semibold text-sm" />
                    <button onClick={handleSend} disabled={(!input.trim() && !image) || loading}
                      className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-black transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── QUIZ TAB ── */}
      {tab === "quiz" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 gap-3">
          {/* Generator */}
          {!quizSession && (
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shrink-0">
              <h3 className="font-black text-slate-900 mb-1">🎯 Generate a Quiz</h3>
              <p className="text-xs text-slate-400 font-medium mb-3">Type any topic or pick one below</p>
              <div className="flex flex-col gap-3">
                <input
                  value={quizTopic}
                  onChange={e => setQuizTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generateQuiz()}
                  placeholder="e.g. Photosynthesis, React hooks, World War 2…"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-medium focus:border-blue-400 transition-all"
                />
                {/* Smart topic suggestions from user goals + knowledge topics */}
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // Knowledge-only keywords — filter out physical/lifestyle tasks
                    const physicalWords = ["workout","pushup","push-up","exercise","gym","run","walk","sleep","eat","food","cook","clean","shower","drink","water","sugar","junk","weight","diet"];
                    const isKnowledgeTopic = (t: string) => !physicalWords.some(w => t.toLowerCase().includes(w));

                    // Pull topics from user's completed tasks (knowledge-based only)
                    const taskTopics = data.tasks
                      .filter(t => t.completed && isKnowledgeTopic(t.text) && t.text.length > 5 && t.text.length < 60)
                      .slice(-4)
                      .map(t => t.text);

                    // Pull from profile goals
                    const goalTopics: string[] = [];
                    const goals = data.settings?.profile?.goals || "";
                    if (goals.toLowerCase().includes("cyber")) goalTopics.push("Cybersecurity basics", "Network security", "Ethical hacking");
                    if (goals.toLowerCase().includes("ielts") || goals.toLowerCase().includes("english")) goalTopics.push("IELTS writing task 2", "English grammar", "Academic vocabulary");
                    if (goals.toLowerCase().includes("python") || goals.toLowerCase().includes("code")) goalTopics.push("Python basics", "Web development");
                    if (goals.toLowerCase().includes("math")) goalTopics.push("Mathematics fundamentals");

                    // Default knowledge topics always available
                    const defaults = [
                      "Cybersecurity basics", "Network security", "Linux commands",
                      "Ethical hacking", "SQL injection", "Cryptography",
                      "Web security", "Firewalls & VPNs", "IELTS writing",
                      "English grammar", "Cloud security", "Python basics",
                    ];

                    // Merge: user task topics first, then goal topics, then defaults (no duplicates)
                    const all = [...new Set([...taskTopics, ...goalTopics, ...defaults])].slice(0, 14);

                    return all.map(topic => (
                      <button key={topic} onClick={() => setQuizTopic(topic)}
                        className={cn("px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                          quizTopic === topic
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-100")}>
                        {topic}
                      </button>
                    ));
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-shrink-0">
                    <span className="text-[10px] font-black text-slate-500">Qs:</span>
                    {[5, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setQuizCount(n)}
                        className={cn("w-7 h-6 rounded-lg text-xs font-black transition-all",
                          quizCount === n ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-200")}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <button onClick={generateQuiz} disabled={!quizTopic.trim() || quizLoading || !hasKey}
                    className="flex-1 h-10 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {quizLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : "Generate Quiz →"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quiz */}
          {quizSession ? (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                <div>
                  <p className="font-black text-sm text-slate-900">🎯 {quizSession.topic}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{quizSession.questions.length} questions</p>
                </div>
                <div className="flex items-center gap-2">
                  {quizSession.score !== null && (
                    <div className={cn("px-3 py-1.5 rounded-xl font-black text-sm",
                      quizSession.score >= 80 ? "bg-emerald-100 text-emerald-700" :
                      quizSession.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                      {quizSession.score}% 🎉
                    </div>
                  )}
                  <button onClick={() => setQuizSession(null)}
                    className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <QuizView
                  session={quizSession}
                  onAnswer={handleQuizAnswer}
                  onReveal={handleReveal}
                  onFinish={handleFinishQuiz}
                  onReset={() => setQuizSession(null)}
                />
              </div>
            </div>
          ) : quizLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Generating {quizCount} questions…</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {examResults.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <Trophy className="w-10 h-10 text-slate-200" />
              <p className="font-black text-slate-400 text-sm">No exam results yet</p>
              <p className="text-xs text-slate-300">Complete an exam to see your results here</p>
            </div>
          )}
          {examResults.map(result => (
            <ExamResultCard key={result.id} result={result}
              onDelete={() => setExamResults(prev => prev.filter(r => r.id !== result.id))} />
          ))}
        </div>
      )}
    </div>
  );
};
