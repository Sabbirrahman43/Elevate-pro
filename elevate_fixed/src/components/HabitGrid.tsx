import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';
import { Check, Plus, Trash2, ChevronLeft, ChevronRight, Grid, Table } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const HabitGrid: React.FC = () => {
  const { habits, toggleHabitLog, addHabit, deleteHabit, userProfile } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('✨');
  const [newHabitCategory, setNewHabitCategory] = useState('General');
  const [view, setView] = useState<'cards' | 'table'>('table');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitName.trim()) {
      addHabit(newHabitName, newHabitCategory, newHabitIcon);
      setNewHabitName('');
    }
  };

  const getStreak = (habit: any) => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const s = format(d, 'yyyy-MM-dd');
      if (!habit.logs[s]) break;
      streak++;
      d = new Date(d.getTime() - 86400000);
    }
    return streak;
  };

  const getMonthProgress = (habit: any) => {
    const done = daysInMonth.filter(d => habit.logs[format(d, 'yyyy-MM-dd')]).length;
    return Math.round((done / daysInMonth.length) * 100);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#141414] dark:text-[#E4E3E0] transition-colors">
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Habits</h2>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-xl p-0.5">
              <button onClick={() => setView('cards')} className={cn("p-1.5 rounded-lg transition-all", view === 'cards' ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-gray-600")}><Grid size={14} /></button>
              <button onClick={() => setView('table')} className={cn("p-1.5 rounded-lg transition-all", view === 'table' ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-gray-600")}><Table size={14} /></button>
            </div>
            {/* Month nav */}
            <div className="flex items-center bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-xl overflow-hidden">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><ChevronLeft size={15} /></button>
              <span className="text-xs font-bold uppercase tracking-widest px-2 min-w-[80px] text-center">{format(currentDate, 'MMM yyyy')}</span>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        </div>

        {/* Add habit form */}
        <form onSubmit={handleAddHabit} className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-2">
          <input value={newHabitIcon} onChange={e => setNewHabitIcon(e.target.value)} className="w-14 text-center text-2xl bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" maxLength={2} />
          <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="New habit..." className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-0" />
          <select value={newHabitCategory} onChange={e => setNewHabitCategory(e.target.value)} className="bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {['General','Health','Mind','Finance','Learning','Social','Fitness'].map(c => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors flex-shrink-0">
            <Plus size={15} /> Add
          </button>
        </form>

        {habits.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <div className="text-5xl mb-4">🌱</div>
            <p className="font-bold uppercase tracking-widest text-sm">No habits yet</p>
          </div>
        ) : view === 'cards' ? (
          /* Card view - mobile friendly */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {habits.map((habit, idx) => {
              const progress = getMonthProgress(habit);
              const streak = getStreak(habit);
              const doneToday = !!habit.logs[todayStr];
              const last7 = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(Date.now() - i * 86400000);
                return habit.logs[format(d, 'yyyy-MM-dd')];
              }).reverse();

              return (
                <motion.div key={habit.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl p-4 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{habit.icon}</span>
                      <div>
                        <p className="font-bold text-sm">{habit.name}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{habit.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleHabitLog(habit.id, todayStr)}
                        className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all font-bold text-sm shadow-sm",
                          doneToday ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-500/10")}>
                        {doneToday ? <Check size={16} /> : '+'}
                      </button>
                      <button onClick={() => deleteHabit(habit.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Last 7 days mini strip */}
                  <div className="flex gap-1 mb-3">
                    {last7.map((done, i) => (
                      <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-all",
                        done ? "bg-emerald-500" : "bg-gray-100 dark:bg-white/5")} />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div><span className="font-black text-emerald-500">{streak}</span><span className="text-gray-400 ml-1 text-[10px]">streak</span></div>
                      <div><span className="font-black text-blue-500">{progress}%</span><span className="text-gray-400 ml-1 text-[10px]">this month</span></div>
                    </div>
                    <div className="w-16 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Table view -- desktop, scrollable */
          <div className="bg-white dark:bg-[#141414] border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-widest text-gray-500 sticky left-0 z-10 bg-gray-50 dark:bg-[#1a1a1a] border-r border-gray-100 dark:border-white/5 min-w-[140px]">Habit</th>
                    {daysInMonth.map(day => (
                      <th key={day.toISOString()} className={cn("px-1 py-3 text-center min-w-[30px] font-bold", isSameDay(day, new Date()) && "text-emerald-500")}>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] opacity-50">{format(day, 'E').charAt(0)}</span>
                          <span className="text-[11px]">{format(day, 'd')}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-widest text-gray-500 min-w-[60px]">%</th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map(habit => {
                    const progress = getMonthProgress(habit);
                    return (
                      <tr key={habit.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/5 group transition-colors">
                        <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-[#141414] group-hover:bg-gray-50 dark:group-hover:bg-[#1a1a1a] border-r border-gray-50 dark:border-white/5 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base flex-shrink-0">{habit.icon}</span>
                              <span className="text-xs font-bold truncate">{habit.name}</span>
                            </div>
                            <button onClick={() => deleteHabit(habit.id)} className="text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-all"><Trash2 size={11} /></button>
                          </div>
                        </td>
                        {daysInMonth.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const done = !!habit.logs[dateStr];
                          const isToday = isSameDay(day, new Date());
                          return (
                            <td key={dateStr} className={cn("px-1 py-3 text-center", isToday && "bg-emerald-500/5")}>
                              <button onClick={() => toggleHabitLog(habit.id, dateStr)}
                                className={cn("w-6 h-6 rounded-md mx-auto flex items-center justify-center transition-all",
                                  done ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-white/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10")}>
                                {done && <Check size={10} />}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <span className="text-xs font-black text-emerald-500">{progress}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
