import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, subDays } from 'date-fns';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = ['Health', 'Mind', 'Fitness', 'Finance', 'Skills', 'Social', 'Other'];
const ICONS = ['*', '+', '~', '>', '<', '=', '#', '@', '&', '%'];

export const HabitGrid: React.FC = () => {
  const { habits, addHabit, deleteHabit, toggleHabitLog } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Health');
  const [icon, setIcon] = useState('*');
  const today = format(new Date(), 'yyyy-MM-dd');
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
    label: i === 6 ? 'Today' : format(subDays(new Date(), 6 - i), 'EEE'),
    short: format(subDays(new Date(), 6 - i), 'd'),
  }));

  const handleAdd = () => {
    if (!name.trim()) return;
    addHabit(name.trim(), category, icon);
    setName(''); setShowAdd(false);
  };

  const todayDone = habits.filter(h => h.logs.includes(today)).length;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white p-4 md:p-6 no-scrollbar">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight">Habits</h1>
            <p className="text-sm text-gray-500 mt-0.5">{todayDone}/{habits.length} done today</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all">
            <Plus size={14} /> Add Habit
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-[#111] border border-white/6 rounded-2xl p-4 space-y-3">
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Habit name..." autoFocus
                className="w-full h-10 px-4 bg-white/5 border border-white/6 rounded-xl text-sm text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all" />
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                      category === c ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500 hover:text-white')}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {ICONS.map(i => (
                    <button key={i} onClick={() => setIcon(i)}
                      className={cn('w-7 h-7 rounded-lg text-xs font-bold transition-all', icon === i ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500 hover:text-white')}>
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)} className="p-1.5 text-gray-600 hover:text-white"><X size={14} /></button>
                  <button onClick={handleAdd} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all">Add</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {habits.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">*</p>
            <p className="text-gray-600 font-medium text-sm">No habits yet</p>
            <p className="text-gray-700 text-xs mt-1">Click Add Habit to get started</p>
          </div>
        ) : (
          <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
            {/* Day headers */}
            <div className="grid border-b border-white/5" style={{ gridTemplateColumns: '1fr ' + days.map(() => '36px').join(' ') + ' 36px' }}>
              <div className="p-3 text-[10px] text-gray-600 uppercase tracking-widest font-bold">Habit</div>
              {days.map(d => (
                <div key={d.date} className={cn('p-2 text-center text-[9px] font-bold uppercase tracking-widest', d.label === 'Today' ? 'text-emerald-400' : 'text-gray-600')}>
                  <div>{d.label === 'Today' ? 'T' : d.label.charAt(0)}</div>
                  <div className="text-[8px] text-gray-700">{d.short}</div>
                </div>
              ))}
              <div className="p-2" />
            </div>
            {/* Habits */}
            {habits.map((habit, idx) => (
              <div key={habit.id} className={cn('grid items-center group', idx < habits.length - 1 && 'border-b border-white/4')}
                style={{ gridTemplateColumns: '1fr ' + days.map(() => '36px').join(' ') + ' 36px' }}>
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">{habit.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-200 truncate">{habit.name}</p>
                    <p className="text-[9px] text-gray-600">{habit.category}</p>
                  </div>
                </div>
                {days.map(d => {
                  const logged = habit.logs.includes(d.date);
                  return (
                    <button key={d.date} onClick={() => toggleHabitLog(habit.id, d.date)}
                      className={cn('mx-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                        logged ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-white/4 hover:bg-white/8',
                        d.label === 'Today' && !logged && 'border border-emerald-500/20')}>
                      {logged && <Check size={11} strokeWidth={3} className="text-white" />}
                    </button>
                  );
                })}
                <button onClick={() => deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 mx-auto p-1 text-gray-700 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
