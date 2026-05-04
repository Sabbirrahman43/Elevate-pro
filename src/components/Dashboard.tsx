import React, { useState, useMemo, useEffect } from "react";
import { useStore } from "../store/useStore";
import {
  Brain, Activity, Flame, Trophy,
  CheckCircle2, Circle, Signal, RotateCcw, ChevronRight, Star
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { cn, getTodayDate } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

// ─── WALL CLOCK ────────────────────────────────────────────────
const WallClock: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours() % 12;
  const secDeg   = s * 6;
  const minDeg   = m * 6 + s * 0.1;
  const hourDeg  = h * 30 + m * 0.5;

  const textColor  = dark ? "text-white"     : "text-slate-900";
  const subColor   = dark ? "text-blue-400"  : "text-blue-600";
  const faceColor  = dark ? "bg-slate-800/60 border-slate-700/60" : "bg-white border-slate-200";
  const tickColor  = dark ? "#475569" : "#cbd5e1";
  const secColor   = dark ? "#ef4444" : "#ef4444";
  const minColor   = dark ? "#ffffff" : "#1e293b";
  const hourColor  = dark ? "#93c5fd" : "#2563eb";

  // 12hr display
  const displayHour = now.getHours() % 12 || 12;
  const displayMin  = now.getMinutes().toString().padStart(2, "0");
  const ampm        = now.getHours() >= 12 ? "PM" : "AM";
  const dateStr     = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const cx = 60; const cy = 60; const r = 52;

  return (
    <div className="flex items-center gap-5">
      {/* Analog clock */}
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Face */}
        <circle cx={cx} cy={cy} r={r} fill={dark ? "#1e293b" : "#f8fafc"} stroke={dark ? "#334155" : "#e2e8f0"} strokeWidth="1.5" />
        {/* Hour ticks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 - 90) * Math.PI / 180;
          const x1 = cx + (r - 6) * Math.cos(a); const y1 = cy + (r - 6) * Math.sin(a);
          const x2 = cx + (r - 2) * Math.cos(a); const y2 = cy + (r - 2) * Math.sin(a);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickColor} strokeWidth="2" strokeLinecap="round" />;
        })}
        {/* Hour hand */}
        {(() => {
          const a = (hourDeg - 90) * Math.PI / 180;
          return <line x1={cx} y1={cy} x2={cx + 28 * Math.cos(a)} y2={cy + 28 * Math.sin(a)} stroke={hourColor} strokeWidth="3.5" strokeLinecap="round" />;
        })()}
        {/* Minute hand */}
        {(() => {
          const a = (minDeg - 90) * Math.PI / 180;
          return <line x1={cx} y1={cy} x2={cx + 40 * Math.cos(a)} y2={cy + 40 * Math.sin(a)} stroke={minColor} strokeWidth="2.5" strokeLinecap="round" />;
        })()}
        {/* Second hand */}
        {(() => {
          const a = (secDeg - 90) * Math.PI / 180;
          return <line x1={cx - 10 * Math.cos(a)} y1={cy - 10 * Math.sin(a)} x2={cx + 44 * Math.cos(a)} y2={cy + 44 * Math.sin(a)} stroke={secColor} strokeWidth="1.5" strokeLinecap="round" />;
        })()}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3.5" fill={secColor} />
      </svg>
      {/* Digital readout */}
      <div>
        <div className={cn("font-mono font-black tabular-nums tracking-tighter leading-none", textColor)}>
          <span className="text-4xl">{displayHour}:{displayMin}</span>
          <span className={cn("text-base ml-1.5", subColor)}>{ampm}</span>
        </div>
        <div className={cn("text-xs font-bold mt-1 uppercase tracking-widest", dark ? "text-slate-500" : "text-slate-400")}>
          {dateStr}
        </div>
      </div>
    </div>
  );
};

// ─── FLASHCARD WIDGET (for Sport dashboard) ───────────────────
const FlashcardWidget: React.FC<{ data: any }> = ({ data }) => {
  const pendingIds: string[] = data.practiceQueue || [];
  const pending = data.tasks.filter((t: any) => pendingIds.includes(t.id));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (pending.length === 0) return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[160px] gap-2">
      <Star className="w-8 h-8 text-slate-200" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No flashcards queued</p>
      <p className="text-[11px] text-slate-300 font-medium">Mark tasks done in Tasks tab to queue them</p>
    </div>
  );

  const card = pending[idx % pending.length];
  const total = pending.length;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Flashcards</div>
        <div className="text-[10px] font-black text-slate-400">{(idx % total) + 1} / {total}</div>
      </div>
      {/* Card */}
      <div
        onClick={() => setFlipped(f => !f)}
        className={cn(
          "relative cursor-pointer rounded-2xl p-5 min-h-[90px] flex items-center justify-center text-center transition-all duration-300 select-none",
          flipped
            ? "bg-slate-900 text-white"
            : "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-slate-800"
        )}
      >
        <div>
          {!flipped && <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Tap to reveal topic</p>}
          <p className="text-sm font-bold leading-snug">{card.text}</p>
          {flipped && <p className="text-[10px] font-black text-white/40 mt-2 uppercase tracking-widest">Tap to flip back</p>}
        </div>
      </div>
      {/* Nav */}
      <div className="flex items-center justify-between mt-3">
        <button onClick={() => { setIdx(i => (i - 1 + total) % total); setFlipped(false); }}
          className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all">
          ← Prev
        </button>
        <button onClick={() => { setIdx(i => (i + 1) % total); setFlipped(false); }}
          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all">
          Next <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ─── DASHBOARD 1: GLASS COMMAND CENTER ────────────────────────
const DashboardGlass: React.FC<{ data: any; updateData: any }> = ({ data, updateData }) => {
  const today = getTodayDate();
  const dayTasks = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress = dayTasks.length > 0 ? (tasksDone / dayTasks.length) * 100 : 0;
  const streak = data.stats?.totalSessions || 0;

  const weeklyData = useMemo(() => Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const tasks = data.tasks.filter((t: any) => t.date === dateStr);
    const done = tasks.filter((t: any) => t.completed).length;
    return { name: d.toLocaleDateString("en-US", { weekday: "short" }), val: tasks.length > 0 ? (done / tasks.length) * 100 : 0 };
  }), [data.tasks]);

  return (
    <div className="h-screen flex flex-col gap-4 p-4 overflow-hidden bg-slate-950 font-sans">
      {/* Header */}
      <div className="relative h-40 bg-slate-900/40 rounded-[2.5rem] px-10 border border-slate-800/60 flex items-center justify-between overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 right-0 w-96 h-full bg-blue-500/5 blur-[100px]" />
        <div className="relative z-10 flex items-center gap-8">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center border border-white/20 shadow-[0_0_35px_rgba(37,99,235,0.4)]">
            <Brain className="text-white w-8 h-8" />
          </div>
          <div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.6em] italic mb-1">Intelligence_OS</div>
            <h1 className="text-5xl font-black text-white tracking-widest uppercase leading-none italic">
              LEVEL<span className="text-blue-500">UP</span>
            </h1>
          </div>
        </div>
        <div className="relative z-10">
          <WallClock dark={true} />
        </div>
      </div>

      {/* Bulletin */}
      <AnimatePresence>
        {!data.hasDismissedBulletin && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
            <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl"><Signal className="w-5 h-5 text-white" /></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Add your Gemini or Groq API key in Settings → Integrations to unlock AI features.
                </p>
              </div>
              <button onClick={() => updateData({ hasDismissedBulletin: true })} className="px-5 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-slate-900/20 p-8 rounded-[2.5rem] border border-slate-800/40 overflow-y-auto space-y-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-2">Core_Analytics</div>
            {[
              { label: "Sessions",  value: data.stats?.totalSessions || 0, color: "text-blue-400",    border: "border-blue-500/30" },
              { label: "Completed", value: data.tasks.filter((t: any) => t.completed).length, color: "text-amber-400",   border: "border-amber-500/30" },
              { label: "Streak",    value: streak, color: "text-emerald-400", border: "border-emerald-500/30" },
            ].map((s, i) => (
              <div key={i} className={cn("p-6 rounded-[2rem] border bg-slate-900/40", s.border)}>
                <div className={cn("text-4xl font-black font-mono tracking-tighter", s.color)}>{s.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="h-32 bg-slate-900/20 p-6 rounded-[2rem] border border-slate-800/40 flex flex-col justify-center">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Activity</div>
            <div className="flex justify-between gap-1.5">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className={cn("flex-1 h-10 rounded-xl border flex items-center justify-center text-[11px] font-black",
                  data.offDays?.includes(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i])
                    ? "bg-blue-600 border-white/20 text-white" : "bg-slate-950 border-slate-800 text-slate-700")}>
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-slate-900/20 p-10 rounded-[3rem] border border-slate-800/40 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Activity className="w-6 h-6 text-blue-500" /></div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-widest uppercase italic">Performance_Sync</h3>
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
                  <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 900, fontSize: 11, fill: "#475569", letterSpacing: "0.3em" }} dy={12} />
                <Bar dataKey="val" radius={[10, 10, 4, 4]} barSize={60}>
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

// ─── DASHBOARD 2: SPORT ENERGY ────────────────────────────────
const DashboardSport: React.FC<{ data: any; updateData: any }> = ({ data, updateData }) => {
  const today = getTodayDate();
  const dayTasks = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress = dayTasks.length > 0 ? Math.round((tasksDone / dayTasks.length) * 100) : 0;
  const streak = data.stats?.totalSessions || 0;
  const name = data.settings.profile.name || "there";
  const aiName = data.settings.ai.identity.name;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-5 overflow-y-auto font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{getGreeting()}, {name} 👋</h1>
        </div>
        <WallClock dark={false} />
      </div>

      {/* Bulletin */}
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
          <div className="text-7xl font-black tracking-tight leading-none mb-1">
            {progress}<span className="text-3xl text-slate-500">%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full mt-4 mb-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs font-bold text-slate-400">{tasksDone} of {dayTasks.length} tasks done</div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="text-2xl font-black text-blue-400">{streak}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Streak</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="text-2xl font-black text-amber-400">{data.tasks.filter((t: any) => t.completed).length}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Done</div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Today's Tasks</div>
          <div className="space-y-1">
            {dayTasks.length === 0 && <p className="text-sm text-slate-400 font-medium">No tasks today — add some!</p>}
            {dayTasks.slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                {t.completed
                  ? <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />}
                <span className={cn("text-sm font-semibold", t.completed ? "line-through text-slate-400" : "text-slate-800")}>{t.text}</span>
              </div>
            ))}
            {dayTasks.length > 6 && <div className="text-xs font-bold text-slate-400 pl-3">+{dayTasks.length - 6} more</div>}
          </div>
        </div>

        {/* Habits */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Habits This Week</div>
          <div className="space-y-2">
            {data.habits.length === 0 && <p className="text-sm text-slate-400 font-medium">No habits yet.</p>}
            {data.habits.slice(0, 5).map((h: any) => {
              const days = Object.values(h.logs || {}).filter(Boolean).length;
              return (
                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-700">{h.name}</span>
                  <span className="text-sm font-black text-orange-500 flex items-center gap-1"><Flame className="w-4 h-4" />{days}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flashcard widget — the missing piece! */}
        <FlashcardWidget data={data} />

        {/* AI widget */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0">
            {aiName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-slate-900 text-sm">{aiName}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              {progress >= 80 ? "Amazing work today! 🔥" : progress >= 50 ? "You're halfway there! Keep going! 💪" : "Let's get those tasks done! 🚀"}
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white flex flex-col justify-between">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">All Time</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-3xl font-black text-blue-400">{data.stats?.totalSessions || 0}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Sessions</div>
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-400">{data.stats?.focusTime || 0}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Focus mins</div>
            </div>
            <div>
              <div className="text-3xl font-black text-amber-400">{data.tasks.filter((t: any) => t.completed).length}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Tasks done</div>
            </div>
            <div>
              <div className="text-3xl font-black text-purple-400">{data.stats?.dailyMarks || 0}</div>
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD 3: MINIMAL ZEN ──────────────────────────────────
const DashboardZen: React.FC<{ data: any; updateData: any }> = ({ data, updateData }) => {
  const today = getTodayDate();
  const dayTasks = data.tasks.filter((t: any) => t.date === today);
  const tasksDone = dayTasks.filter((t: any) => t.completed).length;
  const progress = dayTasks.length > 0 ? Math.round((tasksDone / dayTasks.length) * 100) : 0;
  const name = data.settings.profile.name || "there";
  const aiName = data.settings.ai.identity.name;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5) return "Still up?";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] p-7 overflow-y-auto font-sans">
      <div className="flex items-end justify-between pb-7 border-b border-stone-200 mb-7">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">
            {getGreeting()}, <span className="text-stone-400">{name}.</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <WallClock dark={false} />
          <div className="text-right">
            <div className="text-5xl font-black text-stone-900 tracking-tight leading-none">{progress}<span className="text-2xl text-stone-400">%</span></div>
            <div className="text-xs font-bold text-stone-400 mt-1">today's progress</div>
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

      <div className="max-w-2xl space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Tasks done", value: `${tasksDone}/${dayTasks.length}` },
            { label: "Streak",     value: `${data.stats?.totalSessions || 0} days` },
            { label: "Total done", value: data.tasks.filter((t: any) => t.completed).length },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="text-3xl font-black text-stone-900 tracking-tight">{s.value}</div>
              <div className="text-xs font-bold text-stone-400 mt-1">{s.label}</div>
              <div className="h-1 bg-stone-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-stone-900 rounded-full" style={{ width: i === 0 ? `${progress}%` : "60%" }} />
              </div>
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

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Habits</div>
          {data.habits.length === 0 && <p className="text-sm text-stone-400">No habits yet.</p>}
          {data.habits.slice(0, 5).map((h: any) => {
            const days = Object.values(h.logs || {}).filter(Boolean).length;
            return (
              <div key={h.id} className="flex items-center justify-between py-2.5 border-b border-stone-50 last:border-0">
                <span className="text-sm font-semibold text-stone-700">{h.name}</span>
                <span className="text-xs font-black text-stone-400">{days} days</span>
              </div>
            );
          })}
        </div>

        <div className="bg-stone-900 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-black text-white text-base flex-shrink-0">
            {aiName.charAt(0)}
          </div>
          <div>
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{aiName} · Your AI</div>
            <div className="text-sm font-semibold text-white/70 leading-relaxed">
              {progress >= 80 ? `Great work! You've completed ${progress}% of your goals.` : `You have ${dayTasks.length - tasksDone} tasks left. Want help planning?`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN EXPORT ───────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { data, updateData } = useStore();
  const theme = (data.settings as any).dashboardTheme || "glass";
  return (
    <>
      {theme === "glass" && <DashboardGlass data={data} updateData={updateData} />}
      {theme === "sport" && <DashboardSport data={data} updateData={updateData} />}
      {theme === "zen"   && <DashboardZen   data={data} updateData={updateData} />}
    </>
  );
};
