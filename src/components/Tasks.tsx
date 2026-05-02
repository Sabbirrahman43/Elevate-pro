import React, { useState, useRef } from "react";
import { useStore } from "../store/useStore";
import {
  Plus, Trash2, Calendar, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, X, PartyPopper, Coffee,
  GraduationCap, Flame, Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { cn, generateId, getTodayDate } from "../lib/utils";

// ── SOUND FX ──────────────────────────────────────────────────────────
function playSound(type: "check" | "complete" | "streak") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const g = ctx.createGain();
    g.connect(ctx.destination);

    if (type === "check") {
      // Soft tick — task checked
      const o = ctx.createOscillator();
      o.connect(g);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      o.start(); o.stop(ctx.currentTime + 0.15);

    } else if (type === "complete") {
      // Victory chord — all tasks done
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.connect(gn); gn.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "sine";
        const t = ctx.currentTime + i * 0.1;
        gn.gain.setValueAtTime(0, t);
        gn.gain.linearRampToValueAtTime(0.2, t + 0.05);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.start(t); o.stop(t + 0.5);
      });

    } else if (type === "streak") {
      // Streak sound — ascending arpeggio
      [440, 554, 659, 880].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.connect(gn); gn.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = "triangle";
        const t = ctx.currentTime + i * 0.08;
        gn.gain.setValueAtTime(0.2, t);
        gn.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.3);
      });
    }
  } catch {}
}

// ── STREAK CALCULATOR ─────────────────────────────────────────────────
function calcStreak(tasks: any[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayTasks = tasks.filter(t => t.date === dateStr);
    if (dayTasks.length === 0) { if (i === 0) continue; break; }
    const allDone = dayTasks.every(t => t.completed);
    if (allDone) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export const Tasks: React.FC = () => {
  const { data, updateData } = useStore();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [newTask, setNewTask] = useState("");
  const [showCelebration, setShowCelebration] = useState<{ msg: string; type: string; icon: string } | null>(null);
  const [showPracticePrompt, setShowPracticePrompt] = useState<{ taskId: string; taskText: string } | null>(null);
  const prevStreakRef = useRef(calcStreak(data.tasks));

  const tasks = data.tasks.filter(t => t.date === selectedDate);
  const doneCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const currentStreak = calcStreak(data.tasks);

  const getCelebrationMsg = (p: number, isFirst: boolean): { msg: string; icon: string } | null => {
    const persona = data.settings.ai.identity.persona;
    const name = data.settings.ai.identity.name;
    const msgs: Record<string, string[]> = {
      Coach:    ["First one down! Now keep that momentum!", "70%! You're building real discipline.", "80%! This is what champions look like.", "90%! One final push — don't stop!", "100%! PERFECT execution. I'm proud of you."],
      Teacher:  ["Good start! Learning begins with action.", "70% done — your consistency is showing.", "80%! Almost there, stay focused.", "90% — you're so close, keep going!", "100%! Full marks today. Well done."],
      Trainer:  ["Rep one down! Keep the pace.", "70%! Feel the burn — don't quit.", "80%! Beast mode activated.", "90%! Last few reps — give everything!", "100%! You crushed it today. Respect."],
      Partner:  ["Solid start.", "70% done. On track.", "80%! Efficient as always.", "90% — finish line is right there.", "100%! Mission complete. You delivered."],
      Friend:   ["Nice one! Let's keep it going!", "70%? Not bad at all homie!", "80% done, you're on fire!", "90%! Almost there!", "100%! You absolute legend!"],
      Wife:     ["That's my love! Keep going!", "Doing amazing honey, almost there!", "So proud of you! Nearly done!", "Just a little more sweetheart!", "You did it! I love you so much! 🥰"],
      Girlfriend: ["Yay! You started! Keep going babe!", "70% done, you're doing amazing!", "80%! I knew you could do it!", "Almost there! You got this babe!", "100%! You're literally the best! 💕"],
    };
    const set = msgs[persona] || msgs["Friend"];
    if (isFirst) return { msg: `${name}: ${set[0]}`, icon: "🎯" };
    if (p >= 100) return { msg: `${name}: ${set[4]}`, icon: "🏆" };
    if (p >= 90) return { msg: `${name}: ${set[3]}`, icon: "⚡" };
    if (p >= 80) return { msg: `${name}: ${set[2]}`, icon: "🔥" };
    if (p >= 70) return { msg: `${name}: ${set[1]}`, icon: "💪" };
    return null;
  };

  const handleToggle = (id: string) => {
    const updatedTasks = data.tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    const task = updatedTasks.find(t => t.id === id)!;

    if (task.completed) {
      // Sound: check
      playSound("check");

      // Calculate new progress
      const dayTasks = updatedTasks.filter(t => t.date === selectedDate);
      const dayDone = dayTasks.filter(t => t.completed).length;
      const dayTotal = dayTasks.length;
      const dayPercent = (dayDone / dayTotal) * 100;

      // Celebration popup
      const celeb = getCelebrationMsg(dayPercent, dayDone === 1);
      if (celeb) {
        setShowCelebration({ msg: celeb.msg, type: String(Math.round(dayPercent)), icon: celeb.icon });
        confetti({
          particleCount: dayPercent >= 100 ? 300 : 100,
          spread: dayPercent >= 100 ? 100 : 60,
          origin: { y: 0.6 },
          colors: ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"],
        });
        if (dayPercent >= 100) playSound("complete");
        setTimeout(() => setShowCelebration(null), 5000);
      }

      // Streak check
      const newStreak = calcStreak(updatedTasks);
      if (newStreak > prevStreakRef.current && newStreak > 0 && newStreak % 1 === 0) {
        playSound("streak");
        prevStreakRef.current = newStreak;
      }

      // Add to practice queue — show prompt
      const alreadyInQueue = data.practiceQueue.includes(id);
      if (!alreadyInQueue) {
        setShowPracticePrompt({ taskId: id, taskText: task.text });
      }
    }

    updateData({ tasks: updatedTasks });
  };

  const addToPractice = (taskId: string) => {
    if (!data.practiceQueue.includes(taskId)) {
      updateData({ practiceQueue: [...data.practiceQueue, taskId] });
    }
    setShowPracticePrompt(null);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    updateData({
      tasks: [...data.tasks, {
        id: generateId(),
        text: newTask,
        completed: false,
        date: selectedDate,
        createdAt: Date.now(),
      }],
    });
    setNewTask("");
  };

  const deleteTask = (id: string) => {
    updateData({
      tasks: data.tasks.filter(t => t.id !== id),
      practiceQueue: data.practiceQueue.filter(qid => qid !== id),
    });
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isOffDay = data.offDays.includes(
    new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Streak banner */}
      {currentStreak >= 2 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] p-5 flex items-center gap-4 text-white shadow-lg shadow-orange-500/20">
          <Flame className="w-8 h-8 animate-pulse" />
          <div>
            <div className="font-black text-xl">{currentStreak} Day Streak! 🔥</div>
            <div className="text-xs font-bold opacity-75 uppercase tracking-widest">
              {currentStreak >= 7 ? "Legendary consistency" : currentStreak >= 3 ? "Building momentum" : "You're on a roll"}
            </div>
          </div>
          <Trophy className="w-8 h-8 ml-auto opacity-50" />
        </motion.div>
      )}

      {/* Date nav */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className={cn("text-lg font-black text-gray-900", isOffDay && "text-blue-500")}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {isOffDay && <span className="ml-2 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-xs">Rest Day</span>}
          </h2>
        </div>
        <button onClick={() => changeDate(1)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Progress */}
      <div className={cn("rounded-[2rem] p-7 text-white shadow-xl",
        isOffDay ? "bg-slate-900" : "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/20")}>
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-60">
              {isOffDay ? "Rest Day" : "Today's Progress"}
            </p>
            <h3 className="text-2xl font-black">
              {isOffDay ? "Recovery Active" : `${doneCount} of ${totalCount} done`}
            </h3>
          </div>
          {isOffDay
            ? <Coffee className="w-10 h-10 opacity-30" />
            : <span className="text-5xl font-black opacity-40">{Math.round(percentage)}%</span>}
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: isOffDay ? "100%" : `${percentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          />
        </div>
        {/* Practice queue indicator */}
        {data.practiceQueue.length > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-2 w-fit">
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              {data.practiceQueue.length} task{data.practiceQueue.length > 1 ? "s" : ""} queued for practice
            </span>
          </div>
        )}
      </div>

      {/* Add task */}
      {!isOffDay && (
        <form onSubmit={addTask} className="flex gap-3">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="What do you need to accomplish today?"
            className="flex-1 bg-white border-2 border-transparent focus:border-blue-600 rounded-3xl px-7 py-4 shadow-sm outline-none font-bold text-base transition-all"
          />
          <button type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white w-16 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95">
            <Plus className="w-7 h-7" />
          </button>
        </form>
      )}

      {/* Tasks */}
      <div className="space-y-3">
        {isOffDay ? (
          <div className="text-center py-16 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <Coffee className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h4 className="text-xl font-black text-gray-700">Rest Day — Recharge</h4>
            <p className="text-gray-400 font-bold mt-2 max-w-xs mx-auto">Tasks are paused. Focus on recovery.</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {tasks.map(task => {
                const inQueue = data.practiceQueue.includes(task.id);
                return (
                  <motion.div key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "bg-white p-5 rounded-[2rem] shadow-sm border-2 flex items-center gap-5 group hover:shadow-md transition-all",
                      task.completed ? "border-blue-100 bg-blue-50/30" : "border-gray-100",
                      inQueue && "border-amber-200 bg-amber-50/20"
                    )}>
                    <button onClick={() => handleToggle(task.id)}
                      className={cn("w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0",
                        task.completed ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30" : "border-gray-200 hover:border-blue-400")}>
                      {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-gray-200" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-base font-bold block", task.completed ? "text-gray-400 line-through" : "text-gray-700")}>
                        {task.text}
                      </span>
                      {inQueue && (
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <GraduationCap className="w-3 h-3" /> In practice queue
                        </span>
                      )}
                    </div>
                    {/* Add to practice manually */}
                    {task.completed && !inQueue && (
                      <button onClick={() => addToPractice(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                        title="Add to practice queue">
                        <GraduationCap className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {tasks.length === 0 && (
              <div className="text-center py-16">
                <Plus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <h4 className="text-lg font-black text-gray-300">No tasks yet</h4>
                <p className="text-gray-400 text-sm mt-1">Add something to work on today</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Practice prompt popup */}
      <AnimatePresence>
        {showPracticePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 rounded-3xl p-6 shadow-2xl border border-white/10 max-w-sm w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                  {data.settings.ai.identity.name} says
                </p>
                <p className="text-white font-bold text-sm leading-relaxed">
                  You completed <span className="text-amber-400">"{showPracticePrompt.taskText}"</span> — want me to test you on it?
                </p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => addToPractice(showPracticePrompt.taskId)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-black text-xs uppercase tracking-widest py-2.5 rounded-xl transition-all">
                    Yes, test me!
                  </button>
                  <button onClick={() => setShowPracticePrompt(null)}
                    className="px-4 bg-white/10 hover:bg-white/20 text-white font-black text-xs rounded-xl transition-all">
                    Later
                  </button>
                </div>
              </div>
              <button onClick={() => setShowPracticePrompt(null)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration popup */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="fixed bottom-10 right-10 z-[100] bg-white rounded-3xl p-6 shadow-2xl border-2 border-blue-600 max-w-xs">
            <div className="flex items-start gap-4">
              <div className="text-3xl">{showCelebration.icon}</div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 leading-snug">{showCelebration.msg}</p>
              </div>
              <button onClick={() => setShowCelebration(null)}>
                <X className="w-4 h-4 text-gray-300 hover:text-gray-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
