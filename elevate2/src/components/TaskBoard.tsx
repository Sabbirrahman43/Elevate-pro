import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, addDays, subDays } from 'date-fns';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const celebrate = (milestone: number, taskName: string, persona: string, name: string) => {
  const n = name || 'you';
  const p = (persona || 'coach').toLowerCase();
  const g = p.includes('wife') ? 'My love,' : p.includes('girlfriend') ? 'Babe,' : p.includes('coach') ? 'Lets go,' : p.includes('trainer') ? 'Warrior,' : ('Hey ' + n + ',');
  const msgs: Record<number, string> = {
    1: g + ' you just knocked out "' + taskName + '"! That is how it starts. Keep going.',
    70: g + ' 70% done! You are in the zone now. Most people quit here -- not you.',
    80: g + ' 80% complete! This is where legends are made. Two more to go.',
    90: g + ' 90%! One final push. You did not come this far to stop now.',
    100: g + ' 100%! Every single task -- DONE. That is real discipline. Remember this feeling.',
  };
  const qts: Record<number, string> = {
    1: 'A journey begins with a single step.',
    70: 'Do not watch the clock -- do what it does. Keep going.',
    80: 'It always seems impossible until it is done.',
    90: 'The last 10 percent is what defines you.',
    100: 'Success is the sum of small efforts, repeated day in and day out.',
  };
  return { msg: msgs[milestone], quote: qts[milestone] };
};

export const TaskBoard: React.FC = () => {
  const { tasks, addTask, toggleTask, deleteTask, aiSettings, userProfile } = useAppContext();
  const [date, setDate] = useState(new Date());
  const [newTask, setNewTask] = useState('');
  const [popup, setPopup] = useState<{ msg: string; quote: string } | null>(null);
  const prevProg = useRef(0);

  const ds = format(date, 'yyyy-MM-dd');
  const dayTasks = tasks.filter(t => t.date === ds);
  const total = dayTasks.length;
  const done = dayTasks.filter(t => t.completed).length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isToday = ds === format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const prev = prevProg.current;
    prevProg.current = progress;
    if (total === 0) return;
    const milestones = [70, 80, 90, 100];
    if (progress === 100 && prev < 100) {
      const c = celebrate(100, dayTasks.find(t => t.completed)?.name || 'task', aiSettings?.persona || 'Coach', userProfile?.name || '');
      setPopup(c); setTimeout(() => setPopup(null), 5000);
    } else {
      for (const m of [70, 80, 90]) {
        if (progress >= m && prev < m) {
          const c = celebrate(m, dayTasks.find(t => t.completed)?.name || 'task', aiSettings?.persona || 'Coach', userProfile?.name || '');
          setPopup(c); setTimeout(() => setPopup(null), 4000); break;
        }
      }
      if (done === 1 && prev === 0 && progress < 70) {
        const c = celebrate(1, dayTasks.find(t => t.completed)?.name || 'task', aiSettings?.persona || 'Coach', userProfile?.name || '');
        setPopup(c); setTimeout(() => setPopup(null), 3500);
      }
    }
  }, [progress, done, total]);

  const handleAdd = () => {
    if (!newTask.trim()) return;
    addTask(newTask.trim(), ds);
    setNewTask('');
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white p-4 md:p-6 no-scrollbar relative">
      <AnimatePresence>
        {popup && (
          <motion.div initial={{ opacity: 0, y: -60, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm">
            <div className="bg-[#111] border border-emerald-500/25 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 text-sm font-bold text-emerald-400">!</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium leading-relaxed">{popup.msg}</p>
                <p className="text-[11px] text-emerald-400 italic mt-1.5">{popup.quote}</p>
              </div>
              <button onClick={() => setPopup(null)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0"><X size={13} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight">Tasks</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isToday ? 'Today' : format(date, 'EEEE, MMM d')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(d => subDays(d, 1))} className="p-1.5 bg-white/4 hover:bg-white/8 rounded-xl text-gray-500 hover:text-white transition-all"><ChevronLeft size={16} /></button>
            <button onClick={() => setDate(new Date())} className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all', isToday ? 'bg-emerald-500 text-white' : 'bg-white/4 text-gray-400 hover:bg-white/8')}>Today</button>
            <button onClick={() => setDate(d => addDays(d, 1))} className="p-1.5 bg-white/4 hover:bg-white/8 rounded-xl text-gray-500 hover:text-white transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{done}/{total} tasks complete</span>
              <span className="text-sm font-bold text-emerald-400 font-display">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/4 rounded-full overflow-hidden">
              <motion.div className={cn('h-full rounded-full', progress === 100 ? 'bg-emerald-400' : progress >= 70 ? 'bg-emerald-500' : 'bg-emerald-600')}
                animate={{ width: progress + '%' }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}

        {/* Add task */}
        <div className="flex gap-2">
          <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 h-12 px-4 bg-[#111] border border-white/6 rounded-2xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all" />
          <button onClick={handleAdd} className="h-12 w-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20">
            <Plus size={20} />
          </button>
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {dayTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <p className="text-3xl mb-3">*</p>
                <p className="text-gray-600 font-medium text-sm">No tasks for this day</p>
                <p className="text-gray-700 text-xs mt-1">Add one above to get started</p>
              </motion.div>
            ) : dayTasks.map(task => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className={cn('flex items-center gap-3 p-4 rounded-2xl border transition-all group',
                  task.completed ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-[#111] border-white/5 hover:border-white/8')}>
                <button onClick={() => toggleTask(task.id)}
                  className={cn('w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-emerald-500/60')}>
                  {task.completed && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>
                <span className={cn('flex-1 text-sm font-medium transition-all', task.completed ? 'line-through text-gray-600' : 'text-gray-200')}>{task.name}</span>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-700 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
