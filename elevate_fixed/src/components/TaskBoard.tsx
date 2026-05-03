import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Persona-aware celebration messages
const getCelebration = (milestone: number, taskName: string, persona: string, name: string): { msg: string; quote: string } => {
  const n = name || 'you';
  const p = persona?.toLowerCase() || 'coach';
  const greeting = p.includes('wife') ? `My love,` : p.includes('girlfriend') ? `Babe,` : p.includes('coach') ? `Let's go,` : p.includes('trainer') ? `Warrior,` : p.includes('teacher') ? `Well done,` : `Hey ${n},`;
  const msgs: Record<number, string[]> = {
    1: [`${greeting} you just knocked out "${taskName}"! Every single rep counts. 💪`, `${greeting} first one down! The hardest part is starting - and you already did it. 🔥`, `${greeting} you completed "${taskName}"! That's how progress is built - one task at a time. 🚀`],
    70: [`${greeting} 70% done! You're in the zone now. Most people would have quit by now. Keep going! 🎯`, `${greeting} look at you - 70% through. This is where champions separate from the rest. 💥`, `${greeting} 70%! You're carrying the whole day on your back and winning. Don't stop now! ⚡`],
    80: [`${greeting} 80% complete! You're so close I can feel it. This is where legends are made. 🦾`, `${greeting} 8 out of 10 done. Discipline is your superpower today. Two more to go. 🔥`, `${greeting} 80%! Most people quit here. Not you. Never you. Finish what you started. 💯`],
    90: [`${greeting} 90%! One final push. You didn't come this far to stop now. Finish strong! 🏆`, `${greeting} almost perfect - 90% complete. The last 10% is what separates good from great. 🚀`, `${greeting} SO close! 90% done. Give everything you have left. This is YOUR moment. ⚡`],
    100: [`${greeting} 100%! Every single task - DONE. That's what real discipline looks like. I'm proud of you! 🏆🔥`, `${greeting} PERFECT DAY! You finished everything. This is the version of yourself you're building. Keep being this person. 💎`, `${greeting} ALL tasks complete! You showed up, you pushed through, you won today. Remember this feeling. 🌟`],
  };
  const quotes: Record<number, string[]> = {
    1: ["A journey of a thousand miles begins with a single step. -- Lao Tzu", "The secret of getting ahead is getting started. -- Mark Twain"],
    70: ["Don't watch the clock; do what it does. Keep going. -- Sam Levenson", "Push yourself because no one else is going to do it for you."],
    80: ["The difference between the impossible and the possible lies in determination. -- Tommy Lasorda", "It always seems impossible until it's done. -- Nelson Mandela"],
    90: ["You're so close. The last 10 percent is what defines you.", "Finish each day and be done with it. -- Ralph Waldo Emerson"],
    100: ["Success is the sum of small efforts repeated day in and day out. -- Robert Collier", "Well done is better than well said. -- Benjamin Franklin"],
  };
  const mArr = msgs[milestone] || msgs[1];
  const qArr = quotes[milestone] || quotes[1];
  return {
    msg: mArr[Math.floor(Math.random() * mArr.length)],
    quote: qArr[Math.floor(Math.random() * qArr.length)]
  };
};

export const TaskBoard: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask, habits, aiSettings } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTaskName, setNewTaskName] = useState('');
  const [celebration, setCelebration] = useState<{ msg: string; quote: string } | null>(null);
  const prevProgressRef = useRef(0);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const filteredTasks = tasks.filter(t => t.date === dateStr);
  const completedCount = filteredTasks.filter(t => t.completed).length;
  const total = filteredTasks.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  useEffect(() => {
    const prev = prevProgressRef.current;
    prevProgressRef.current = progress;
    if (total === 0) return;
    const checkMilestones = [70, 80, 90, 100];
    if (progress === 100 && prev < 100) {
      const c = getCelebration(100, filteredTasks.find(t => t.completed)?.name || 'task', aiSettings?.persona || 'coach', userProfile?.name || '');
      setCelebration(c);
      setTimeout(() => setCelebration(null), 5000);
    } else {
      for (const milestone of checkMilestones.slice(0, -1)) {
        if (progress >= milestone && prev < milestone) {
          const c = getCelebration(milestone, filteredTasks.find(t => t.completed)?.name || 'task', aiSettings?.persona || 'coach', userProfile?.name || '');
          setCelebration(c);
          setTimeout(() => setCelebration(null), 4000);
          break;
        }
      }
      // First task completion
      if (completedCount === 1 && prev === 0 && progress < 70) {
        const recentTask = filteredTasks.find(t => t.completed);
        const c = getCelebration(1, recentTask?.name || 'task', aiSettings?.persona || 'coach', userProfile?.name || '');
        setCelebration(c);
        setTimeout(() => setCelebration(null), 3500);
      }
    }
  }, [progress, completedCount, total]);
  const isToday = isSameDay(selectedDate, new Date());

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskName.trim()) { addTask(newTaskName, dateStr); setNewTaskName(''); }
  };

  // Quick date chips
  const quickDates = [-1, 0, 1, 2].map(offset => {
    const d = addDays(new Date(), offset);
    return { date: d, label: offset === -1 ? 'Yesterday' : offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : format(d, 'EEE') };
  });

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#141414] dark:text-[#E4E3E0] transition-colors relative">
      {/* Celebration popup */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90vw]"
          >
            <div className="bg-[#141414] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-base">🎯</div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium leading-relaxed mb-2">{celebration.msg}</p>
                <p className="text-[11px] text-emerald-400 italic opacity-80">{celebration.quote}</p>
              </div>
              <button onClick={() => setCelebration(null)} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Tasks</h2>
          <div className="flex items-center bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden">
            <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><ChevronLeft size={16} /></button>
            <div className="px-3 text-center min-w-[100px]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{isToday ? 'Today' : format(selectedDate, 'EEEE')}</p>
              <p className="font-bold text-xs">{format(selectedDate, 'MMM d')}</p>
            </div>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Quick date chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickDates.map(({ date, label }) => (
            <button key={label} onClick={() => setSelectedDate(date)}
              className={cn("px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all border",
                isSameDay(date, selectedDate)
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                  : "bg-white dark:bg-[#141414] text-gray-500 border-black/5 dark:border-white/5 hover:border-emerald-500/30")}>
              {label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{completedCount}/{total} done</span>
              <span className="text-sm font-black text-emerald-500">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div className="h-full bg-emerald-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* Add task */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Add a task..." 
            className="flex-1 bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-0 transition-all" />
          <button type="submit" className="flex items-center gap-1.5 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <Plus size={16} />
          </button>
        </form>

        {/* Task list */}
        <div className="space-y-2">
          <AnimatePresence>
            {filteredTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 opacity-30">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-bold uppercase tracking-widest text-sm">No tasks for this day</p>
              </motion.div>
            ) : (
              filteredTasks.map(task => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className={cn("flex items-center gap-3 p-4 bg-white dark:bg-[#141414] border rounded-2xl group transition-all",
                    task.completed ? "border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5" : "border-black/5 dark:border-white/5")}>
                  <button onClick={() => toggleTask(task.id)}
                    className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      task.completed ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" : "border-gray-200 dark:border-white/20 hover:border-emerald-500")}>
                    {task.completed && <Check size={13} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-medium", task.completed && "line-through text-gray-400 dark:text-gray-600")}>
                      {task.name}
                    </span>
                    {task.habitId && (() => {
                      const linked = habits.find(h => h.id === task.habitId);
                      return linked ? (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          {linked.icon} habit
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
