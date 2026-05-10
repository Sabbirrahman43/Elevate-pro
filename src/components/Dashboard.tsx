import React, { useState, useMemo, useEffect } from "react";
import { useStore } from "../store/useStore";
import {
  Brain, Activity, Flame, Trophy, BookOpen,
  CheckCircle2, Circle, Signal, ChevronRight,
  Star, Calendar, TrendingUp, Clock, Trash2
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { cn, getTodayDate } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

// ─── WALL CLOCK ────────────────────────────────────────────────
const WallClock: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
  const secDeg = s * 6, minDeg = m * 6 + s * 0.1, hourDeg = h * 30 + m * 0.5;
  const textColor = dark ? "text-white" : "text-slate-900";
  const subColor  = dark ? "text-blue-400" : "text-blue-600";
  const cx = 60, cy = 60, r = 52;
  const displayHour = now.getHours() % 12 || 12;
  const displayMin  = now.getMinutes().toString().padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const hand = (deg: number, len: number, w: number, color: string) => {
    const a = (deg - 90) * Math.PI / 180;
    return <line x1={cx} y1={cy} x2={cx + len * Math.cos(a)} y2={cy + len * Math.sin(a)} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill={dark ? "#1e293b" : "#f8fafc"} stroke={dark ? "#334155" : "#e2e8f0"} strokeWidth="1.5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          return <line key={i} x1={cx + (r-6)*Math.cos(a)} y1={cy + (r-6)*Math.sin(a)} x2={cx + (r-2)*Math.cos(a)} y2={cy + (r-2)*Math.sin(a)} stroke={dark?"#475569":"#cbd5e1"} strokeWidth="2" strokeLinecap="round" />;
        })}
        {hand(hourDeg, 28, 3.5, dark ? "#93c5fd" : "#2563eb")}
        {hand(minDeg,  40, 2.5, dark ? "#ffffff" : "#1e293b")}
        {hand(secDeg,  44, 1.5, "#ef4444")}
        <circle cx={cx} cy={cy} r="3.5" fill="#ef4444" />
      </svg>
      <div>
        <div className={cn("font-mono font-black tabular-nums tracking-tighter leading-none", textColor)}>
          <span className="text-4xl">{displayHour}:{displayMin}</span>
          <span className={cn("text-base ml-1.5", subColor)}>{ampm}</span>
        </div>
        <div className={cn("text-xs font-bold mt-1 uppercase tracking-widest", dark ? "text-slate-500" : "text-slate-400")}>{dateStr}</div>
      </div>
    </div>
  );
};

// ─── DAILY PROGRESS SAVER ─────────────────────────────────────
interface DailyRecord {
  date: string;
  tasksDone: number;
  tasksTotal: number;
  habitsLogged: number;
  habitsTotal: number;
  score: number; // 0-100
  note?: string;
}

// ─── FLASHCARD WIDGET ─────────────────────────────────────────
const FlashcardWidget: React.FC<{ data: any }> = ({ data }) => {
  const cards = data.flashcards || [];
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (cards.length === 0) return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[160px] gap-2">
      <BookOpen className="w-8 h-8 text-slate-200" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No flashcards yet</p>
      <p className="text-[11px] text-slate-300 font-medium text-center">AI → Learner mode → ask to teach you something</p>
    </div>
  );
  const card = cards[idx % cards.length];
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-500" /><span className="text-xs font-black text-slate-400 uppercase tracking-widest">Flashcards</span></div>
        <div className="text-[10px] font-black text-slate-400">{(idx % cards.length) + 1} / {cards.length}</div>
      </div>
      <div onClick={() => setFlipped(f => !f)} className={cn("cursor-pointer rounded-2xl p-5 min-h-[90px] flex items-center justify-center text-center transition-all duration-300 select-none", flipped ? "bg-slate-900 text-white" : "bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-100 text-slate-800")}>
        <div>
          {!flipped && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Tap to reveal answer</p>}
          <p className="text-sm font-bold leading-snug">{flipped ? card.back : card.front}</p>
          <p className={cn("text-[10px] font-black mt-2 uppercase tracking-widest", flipped ? "text-emerald-400" : "text-blue-400")}>{card.topic}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button onClick={() => { setIdx(i => (i - 1 + cards.length) % cards.length); setFlipped(false); }} className="text-[10px] font-black text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all">← Prev</button>
        <button onClick={() => { setIdx(i => (i + 1) % cards.length); setFlipped(false); }} className="flex items-center gap-1 text-[10px] font-black text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all">Next <ChevronRight className="w-3 h-3" /></button>
      </div>
    </div>
  );
};

// ─── HISTORY TAB ──────────────────────────────────────────────
const HistoryTab: React.FC<{ data: any; updateData: any }> = ({ data, updateData }) => {
  const records: DailyRecord[] = (data as any).dailyHistory || [];
  const today = getTodayDate();
  const dayTasks  = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const habitsTotal  = data.habits.length;
  const habitsLogged = data.habits.filter((h: any) => h.logs?.[today]).length;
  const score = Math.round(((tasksDone / Math.max(dayTasks.length, 1)) * 0.6 + (habitsLogged / Math.max(habitsTotal, 1)) * 0.4) * 100);
  const [note, setNote] = useState("");

  const saveToday = () => {
    const existing = records.find(r => r.date === today);
    const record: DailyRecord = { date: today, tasksDone, tasksTotal: dayTasks.length, habitsLogged, habitsTotal, score, note: note || existing?.note };
    const updated = existing ? records.map(r => r.date === today ? record : r) : [record, ...records];
    updateData({ dailyHistory: updated.slice(0, 90) } as any); // keep 90 days
    setNote("");
  };

  const deleteRecord = (date: string) => updateData({ dailyHistory: records.filter(r => r.date !== date) } as any);

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-600 bg-emerald-50" : s >= 60 ? "text-amber-600 bg-amber-50" : s >= 40 ? "text-orange-600 bg-orange-50" : "text-red-600 bg-red-50";

  return (
    <div className="min-h-screen bg-slate-50 p-5 overflow-y-auto">
      <h2 className="text-2xl font-black text-slate-900 mb-5">📅 Daily History</h2>

      {/* Save today */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Today · {today}</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{score}<span className="text-lg text-slate-400">%</span></p>
          </div>
          <div className="flex gap-4">
            <div className="text-center"><p className="text-2xl font-black text-blue-600">{tasksDone}/{dayTasks.length}</p><p className="text-[10px] font-black text-slate-400 uppercase">Tasks</p></div>
            <div className="text-center"><p className="text-2xl font-black text-orange-500">{habitsLogged}/{habitsTotal}</p><p className="text-[10px] font-black text-slate-400 uppercase">Habits</p></div>
          </div>
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note about today (optional)..."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none mb-3 focus:border-blue-400 transition-all" />
        <button onClick={saveToday} className="w-full py-3 bg-slate-900 text-white font-black text-sm rounded-2xl hover:bg-black transition-all">
          Save Today's Progress
        </button>
      </div>

      {/* History list */}
      {records.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-black text-sm">No history yet</p>
          <p className="text-xs mt-1">Save today's progress to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.date} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0", scoreColor(r.score))}>
                {r.score}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 text-sm">{new Date(r.date).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-[10px] font-black text-blue-500">✓ {r.tasksDone}/{r.tasksTotal} tasks</span>
                  <span className="text-[10px] font-black text-orange-500">🔥 {r.habitsLogged}/{r.habitsTotal} habits</span>
                </div>
                {r.note && <p className="text-xs text-slate-400 mt-1 truncate">{r.note}</p>}
              </div>
              <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.score}%` }} />
              </div>
              <button onClick={() => deleteRecord(r.date)} className="p-2 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── WEEKLY SCORE ─────────────────────────────────────────────
function calcWeeklyScore(data: any): number {
  const records: DailyRecord[] = (data as any).dailyHistory || [];
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = records.filter(r => new Date(r.date) >= weekAgo);
  if (thisWeek.length === 0) return 0;
  return Math.round(thisWeek.reduce((a, r) => a + r.score, 0) / thisWeek.length);
}

function calcOverallScore(data: any): number {
  const records: DailyRecord[] = (data as any).dailyHistory || [];
  if (records.length === 0) return 0;
  return Math.round(records.reduce((a, r) => a + r.score, 0) / records.length);
}

// ─── DASHBOARD GLASS ──────────────────────────────────────────
const DashboardGlass: React.FC<{ data: any; updateData: any; onTab: (t: string) => void }> = ({ data, updateData, onTab }) => {
  const today = getTodayDate();
  const dayTasks  = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress  = dayTasks.length > 0 ? (tasksDone / dayTasks.length) * 100 : 0;
  const weeklyScore  = calcWeeklyScore(data);
  const overallScore = calcOverallScore(data);

  const weeklyData = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split("T")[0];
    const t = data.tasks.filter((t: any) => t.date === ds);
    const done = t.filter((t: any) => t.completed).length;
    return { name: d.toLocaleDateString("en-US", { weekday: "short" }), val: t.length > 0 ? (done / t.length) * 100 : 0 };
  }), [data.tasks]);

  return (
    <div className="h-screen flex flex-col gap-4 p-4 overflow-hidden bg-slate-950 font-sans">
      {/* Header */}
      <div className="relative h-44 bg-slate-900/40 rounded-[2.5rem] px-8 border border-slate-800/60 flex items-center justify-between overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center border border-white/20 shadow-[0_0_35px_rgba(37,99,235,0.4)]">
            <Brain className="text-white w-8 h-8" />
          </div>
          <div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.6em] italic mb-1">Intelligence_OS</div>
            <h1 className="text-4xl font-black text-white tracking-widest uppercase leading-none italic">LEVEL<span className="text-blue-500">UP</span></h1>
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-end gap-3">
          <WallClock dark={true} />
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-400">{weeklyScore}%</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Weekly</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-400">{overallScore}%</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Overall</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulletin */}
      <AnimatePresence>
        {!data.hasDismissedBulletin && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
            <div className="p-5 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl"><Signal className="w-5 h-5 text-white" /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Add your Groq (free) or Gemini API key in Settings → Integrations to unlock AI.</p>
              </div>
              <button onClick={() => updateData({ hasDismissedBulletin: true })} className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-slate-900/20 p-6 rounded-[2.5rem] border border-slate-800/40 overflow-y-auto space-y-3">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">Core_Analytics</div>
            {[
              { label: "Today",    value: `${Math.round(progress)}%`,                              color: "text-blue-400",    border: "border-blue-500/30"    },
              { label: "Weekly",   value: `${weeklyScore}%`,                                       color: "text-amber-400",   border: "border-amber-500/30"   },
              { label: "Overall",  value: `${overallScore}%`,                                      color: "text-emerald-400", border: "border-emerald-500/30" },
              { label: "Sessions", value: data.stats?.totalSessions || 0,                          color: "text-purple-400",  border: "border-purple-500/30"  },
              { label: "Done",     value: data.tasks.filter((t: any) => t.completed).length,       color: "text-cyan-400",    border: "border-cyan-500/30"    },
            ].map((s, i) => (
              <div key={i} className={cn("p-5 rounded-[2rem] border bg-slate-900/40", s.border)}>
                <div className={cn("text-3xl font-black font-mono tracking-tighter", s.color)}>{s.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {/* History button */}
          <button onClick={() => onTab("history")} className="h-14 bg-slate-900/40 border border-slate-800/40 rounded-[2rem] text-slate-400 hover:text-white hover:border-blue-500/40 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" /> View History
          </button>
        </div>
        <div className="lg:col-span-3 bg-slate-900/20 p-8 rounded-[3rem] border border-slate-800/40 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Activity className="w-6 h-6 text-blue-500" /></div>
              <div>
                <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Performance_Sync</h3>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">7-Day Historical</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white font-mono">{Math.round(progress)}</span>
              <span className="text-xl font-bold text-blue-500">%</span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} /></linearGradient>
                  <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} /></linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 900, fontSize: 11, fill: "#475569", letterSpacing: "0.3em" }} dy={12} />
                <Bar dataKey="val" radius={[10, 10, 4, 4]} barSize={50}>
                  {weeklyData.map((e, i) => <Cell key={i} fill={e.val < 40 ? "url(#cg2)" : "url(#cg1)"} stroke={e.val < 40 ? "#ef4444" : "#3b82f6"} strokeWidth={1.5} />)}
                </Bar>
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} contentStyle={{ background: "rgba(2,6,23,0.9)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", padding: 16 }} itemStyle={{ color: "#fff", fontSize: 12, fontWeight: 900 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD SPORT ──────────────────────────────────────────
const DashboardSport: React.FC<{ data: any; updateData: any; onTab: (t: string) => void }> = ({ data, updateData, onTab }) => {
  const today = getTodayDate();
  const dayTasks  = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress  = dayTasks.length > 0 ? Math.round((tasksDone / dayTasks.length) * 100) : 0;
  const weeklyScore  = calcWeeklyScore(data);
  const overallScore = calcOverallScore(data);
  const name   = data.settings.profile.name || "there";
  const aiName = data.settings.ai.identity.name;
  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  return (
    <div className="min-h-screen bg-slate-50 p-5 overflow-y-auto font-sans">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{getGreeting()}, {name} 👋</h1>
        <WallClock dark={false} />
      </div>
      <AnimatePresence>
        {!data.hasDismissedBulletin && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-xs font-bold text-blue-800">Add your API key in Settings → Integrations to unlock AI features.</p>
            <button onClick={() => updateData({ hasDismissedBulletin: true })} className="text-[10px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-7 text-white">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Daily Score</div>
          <div className="text-6xl font-black tracking-tight leading-none mb-1">{progress}<span className="text-2xl text-slate-500">%</span></div>
          <div className="h-2 bg-white/10 rounded-full mt-4 mb-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs font-bold text-slate-400 mb-4">{tasksDone} of {dayTasks.length} tasks done</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-xl font-black text-amber-400">{weeklyScore}%</div>
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Weekly avg</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3">
              <div className="text-xl font-black text-emerald-400">{overallScore}%</div>
              <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Overall avg</div>
            </div>
          </div>
          <button onClick={() => onTab("history")} className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> View History
          </button>
        </div>
        {/* Tasks */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Today's Tasks</div>
          {dayTasks.length === 0 && <p className="text-sm text-slate-400 font-medium">No tasks today — add some!</p>}
          {dayTasks.slice(0, 6).map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              {t.completed ? <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />}
              <span className={cn("text-sm font-semibold", t.completed ? "line-through text-slate-400" : "text-slate-800")}>{t.text}</span>
            </div>
          ))}
        </div>
        {/* Habits */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Habits This Week</div>
          {data.habits.length === 0 && <p className="text-sm text-slate-400 font-medium">No habits yet.</p>}
          {data.habits.slice(0, 5).map((h: any) => {
            const days = Object.values(h.logs || {}).filter(Boolean).length;
            return (
              <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl mb-2">
                <span className="text-sm font-bold text-slate-700">{h.name}</span>
                <span className="text-sm font-black text-orange-500 flex items-center gap-1"><Flame className="w-4 h-4" />{days}</span>
              </div>
            );
          })}
        </div>
        <FlashcardWidget data={data} />
        {/* AI widget */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 flex items-center gap-4">
          {data.settings.ai.identity.avatar
            ? <img src={data.settings.ai.identity.avatar} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" alt={aiName} />
            : <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0">{aiName.charAt(0)}</div>
          }
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-900 text-sm">{aiName}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {progress >= 80 ? "Amazing work today! 🔥" : progress >= 50 ? "Halfway there! Keep going! 💪" : "Let's get those tasks done! 🚀"}
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">All Time</div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-2xl font-black text-blue-400">{data.stats?.totalSessions || 0}</div><div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Sessions</div></div>
            <div><div className="text-2xl font-black text-emerald-400">{data.tasks.filter((t: any) => t.completed).length}</div><div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Tasks done</div></div>
            <div><div className="text-2xl font-black text-amber-400">{weeklyScore}%</div><div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Weekly score</div></div>
            <div><div className="text-2xl font-black text-purple-400">{overallScore}%</div><div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Overall score</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ZEN ────────────────────────────────────────────
const DashboardZen: React.FC<{ data: any; updateData: any; onTab: (t: string) => void }> = ({ data, updateData, onTab }) => {
  const today = getTodayDate();
  const dayTasks  = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress  = dayTasks.length > 0 ? Math.round((tasksDone / dayTasks.length) * 100) : 0;
  const weeklyScore  = calcWeeklyScore(data);
  const overallScore = calcOverallScore(data);
  const name   = data.settings.profile.name || "there";
  const aiName = data.settings.ai.identity.name;
  const getGreeting = () => { const h = new Date().getHours(); if (h < 5) return "Still up?"; if (h < 12) return "Good morning"; if (h < 17) return "Good afternoon"; if (h < 21) return "Good evening"; return "Good night"; };

  return (
    <div className="min-h-screen bg-[#fafaf9] p-7 overflow-y-auto font-sans">
      <div className="flex items-end justify-between pb-7 border-b border-stone-200 mb-7">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">{getGreeting()}, <span className="text-stone-400">{name}.</span></h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WallClock dark={false} />
          <div className="flex gap-4 text-right">
            <div><div className="text-2xl font-black text-stone-900">{progress}%</div><div className="text-xs font-bold text-stone-400">today</div></div>
            <div><div className="text-2xl font-black text-amber-600">{weeklyScore}%</div><div className="text-xs font-bold text-stone-400">weekly</div></div>
            <div><div className="text-2xl font-black text-emerald-600">{overallScore}%</div><div className="text-xs font-bold text-stone-400">overall</div></div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {!data.hasDismissedBulletin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-7 p-5 bg-stone-100 border border-stone-200 rounded-2xl flex items-center justify-between gap-4">
            <p className="text-xs font-bold text-stone-600">Add your API key in Settings → Integrations to unlock AI.</p>
            <button onClick={() => updateData({ hasDismissedBulletin: true })} className="text-[10px] font-black text-stone-500 uppercase tracking-widest whitespace-nowrap">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-2xl space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Tasks done",    value: `${tasksDone}/${dayTasks.length}` },
            { label: "Weekly score",  value: `${weeklyScore}%` },
            { label: "Overall score", value: `${overallScore}%` },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="text-2xl font-black text-stone-900 tracking-tight">{s.value}</div>
              <div className="text-xs font-bold text-stone-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Today's Focus</div>
          {dayTasks.length === 0 && <p className="text-sm text-stone-400">No tasks for today yet.</p>}
          {dayTasks.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 py-3 border-b border-stone-50 last:border-0">
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", t.completed ? "bg-emerald-500" : "bg-stone-200")} />
              <span className={cn("text-sm font-semibold", t.completed ? "line-through text-stone-300" : "text-stone-700")}>{t.text}</span>
            </div>
          ))}
        </div>
        <button onClick={() => onTab("history")} className="w-full py-3 bg-white border border-stone-200 rounded-2xl text-sm font-black text-stone-600 hover:bg-stone-50 transition-all flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" /> View Progress History
        </button>
        <div className="bg-stone-900 rounded-2xl p-6 flex items-center gap-4">
          {data.settings.ai.identity.avatar
            ? <img src={data.settings.ai.identity.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt={aiName} />
            : <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0">{aiName.charAt(0)}</div>
          }
          <div>
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{aiName}</div>
            <div className="text-sm font-semibold text-white/70 leading-relaxed">
              {progress >= 80 ? `Great work! ${progress}% done today.` : `${dayTasks.length - tasksDone} tasks left. Want help planning?`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN EXPORT ──────────────────────────────────────────────
// ─── WEEKLY EXAM ──────────────────────────────────────────────
const WeeklyExam: React.FC<{ data: any; onBack: () => void }> = ({ data, onBack }) => {
  const records: DailyRecord[] = (data as any).dailyHistory || [];
  const last7 = records.slice(0, 7);
  const tasks = data.tasks.filter((t: any) => t.completed).slice(-20);
  const flashcards = data.flashcards || [];
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  const generateExam = async () => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});

    const topicList = tasks.map((t: any) => t.text).join(", ") || "general productivity";
    const flashTopics = flashcards.map((f: any) => f.topic).filter(Boolean).slice(0, 5).join(", ");
    const avgScore = last7.length > 0 ? Math.round(last7.reduce((a: number, r: DailyRecord) => a + r.score, 0) / last7.length) : 0;

    const prompt = `You are a weekly progress examiner. Generate 5 multiple choice questions based on:
- Topics the user studied this week: ${topicList}
- Flashcard topics: ${flashTopics || "none"}
- Their average score this week: ${avgScore}%

Return ONLY a JSON array:
[{"q":"question?","options":["A","B","C","D"],"correct":0,"explanation":"why"}]
correct = index 0-3. Make questions relevant to their actual topics.`;

    try {
      const groqKey = data.settings.groqKey;
      if (!groqKey) throw new Error("Add Groq key in Settings");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000, temperature: 0.7,
        }),
      });
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) setQuestions(JSON.parse(match[0]));
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally { setLoading(false); }
  };

  const submit = () => {
    let correct = 0;
    questions.forEach((q, i) => { if (parseInt(answers[i] || "-1") === q.correct) correct++; });
    setScore(Math.round((correct / questions.length) * 100));
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5 overflow-y-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-100 transition-all">← Back</button>
        <h2 className="text-2xl font-black text-slate-900">📝 Weekly Exam</h2>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">This Week's Summary</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-2xl">
            <p className="text-2xl font-black text-blue-600">{last7.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase">Days saved</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-2xl">
            <p className="text-2xl font-black text-amber-600">
              {last7.length > 0 ? Math.round(last7.reduce((a, r) => a + r.score, 0) / last7.length) : 0}%
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase">Avg score</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-2xl">
            <p className="text-2xl font-black text-emerald-600">{flashcards.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase">Flashcards</p>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 font-bold text-sm mb-4">AI will create 5 questions based on your week's topics and flashcards.</p>
          <button onClick={generateExam} disabled={loading}
            className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all disabled:opacity-40 flex items-center gap-2 mx-auto">
            {loading ? "Generating…" : "Start Weekly Exam →"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {submitted && (
            <div className={cn("p-5 rounded-3xl text-center font-black text-2xl border-2",
              score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              score >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>
              {score}% — {score >= 80 ? "Excellent week! 🔥" : score >= 60 ? "Good progress! 💪" : "Keep pushing! 🚀"}
            </div>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="font-bold text-slate-900 text-sm mb-3"><span className="text-blue-500 font-black">Q{i+1}. </span>{q.q}</p>
              <div className="space-y-2">
                {q.options.map((opt: string, j: number) => {
                  let style = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                  if (submitted) {
                    if (j === q.correct) style = "bg-emerald-50 border-emerald-400 text-emerald-800";
                    else if (answers[i] === String(j)) style = "bg-red-50 border-red-400 text-red-800";
                    else style = "bg-slate-50 border-slate-200 text-slate-400";
                  } else if (answers[i] === String(j)) style = "bg-blue-50 border-blue-400 text-blue-800";
                  return (
                    <button key={j} onClick={() => !submitted && setAnswers(a => ({...a, [i]: String(j)}))}
                      disabled={submitted}
                      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all", style)}>
                      <span className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-[11px] font-black border border-current/20 flex-shrink-0">
                        {["A","B","C","D"][j]}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700 font-medium">💡 {q.explanation}</p>
                </div>
              )}
            </div>
          ))}
          {!submitted && (
            <button onClick={submit} disabled={Object.keys(answers).length < questions.length}
              className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all disabled:opacity-40">
              Submit Exam
            </button>
          )}
          {submitted && (
            <button onClick={() => { setQuestions([]); setSubmitted(false); setAnswers({}); }}
              className="w-full py-3 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-all">
              Take Another Exam
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── MAIN EXPORT ──────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { data, updateData } = useStore();
  const theme = (data.settings as any).dashboardTheme || "glass";
  const [subTab, setSubTab] = useState<"main" | "history" | "weekly">("main");

  if (subTab === "history") return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => setSubTab("main")} className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-200 transition-all">← Back</button>
        <h2 className="font-black text-slate-900">📅 Progress History</h2>
        <button onClick={() => setSubTab("weekly")} className="ml-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-black transition-all">Weekly Exam →</button>
      </div>
      <HistoryTab data={data} updateData={updateData} />
    </div>
  );

  if (subTab === "weekly") return (
    <div className="h-full overflow-y-auto">
      <WeeklyExam data={data} onBack={() => setSubTab("history")} />
    </div>
  );

  return (
    <>
      {theme === "glass" && <DashboardGlass data={data} updateData={updateData} onTab={t => setSubTab(t as any)} />}
      {theme === "sport" && <DashboardSport data={data} updateData={updateData} onTab={t => setSubTab(t as any)} />}
      {theme === "zen"   && <DashboardZen   data={data} updateData={updateData} onTab={t => setSubTab(t as any)} />}
    </>
  );
};
