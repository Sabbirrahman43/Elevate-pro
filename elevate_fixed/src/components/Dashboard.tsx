import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Zap, Globe, Quote, Calendar, CheckCircle2, Cpu, Activity, X, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { quotes } from '../constants/quotes';
import { motion, AnimatePresence } from 'motion/react';
import { eachDayOfInterval, startOfYear, endOfYear } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { habits, tasks, userProfile, setActiveTab, setChatHistory, chatHistory } = useAppContext();
  const [showYearly, setShowYearly] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [note, setNote] = useState(() => localStorage.getItem('elevate_dashboard_note') || '');
  const [editingNote, setEditingNote] = useState(false);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const completedTodayTasks = todayTasks.filter(t => t.completed).length;
  const taskProgress = todayTasks.length > 0 ? Math.round((completedTodayTasks / todayTasks.length) * 100) : 0;
  const activeHabits = habits.length;
  const habitCompletionsToday = habits.filter(h => h.logs[todayStr]).length;
  const habitProgress = activeHabits > 0 ? Math.round((habitCompletionsToday / activeHabits) * 100) : 0;
  const completedTotalTasks = tasks.filter(t => t.completed).length;
  const totalTaskProgress = tasks.length > 0 ? Math.round((completedTotalTasks / tasks.length) * 100) : 0;
  const totalHabitLogs = habits.reduce((acc, h) => acc + Object.keys(h.logs).length, 0);
  const totalHabitProgress = habits.length > 0 ? Math.min(100, Math.round((totalHabitLogs / (habits.length * 30)) * 100)) : 0;
  const overallProgress = Math.round((totalTaskProgress + totalHabitProgress) / 2);

  const getDaysActive = () => {
    const allDates = [...tasks.map(t => t.date), ...habits.flatMap(h => Object.keys(h.logs))].sort();
    if (allDates.length === 0) return 1;
    return Math.ceil(Math.abs(new Date().getTime() - new Date(allDates[0]).getTime()) / 86400000) || 1;
  };

  const hash = Array.from(format(today, 'yyyyMMdd')).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const dailyQuote = quotes[hash % quotes.length];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    return {
      name: format(d, 'EEE'),
      habits: habits.filter(h => h.logs[dateStr]).length,
      tasks: tasks.filter(t => t.date === dateStr && t.completed).length,
    };
  });

  const yearlyData = eachDayOfInterval({ start: startOfYear(today), end: endOfYear(today) }).map(day => {
    const dStr = format(day, 'yyyy-MM-dd');
    const total = habits.filter(h => h.logs[dStr]).length + tasks.filter(t => t.date === dStr && t.completed).length;
    return { date: day, intensity: total === 0 ? 0 : total < 2 ? 1 : total < 4 ? 2 : total < 6 ? 3 : 4 };
  });

  const getGoalAlignment = () => {
    if (!userProfile?.goals || todayTasks.length === 0) return null;
    const keywords = userProfile.goals.toLowerCase().split(/[\s,\.]+/).filter(w => w.length > 3);
    const matched = todayTasks.filter(t => keywords.some(k => t.name.toLowerCase().includes(k))).length;
    return Math.round((matched / todayTasks.length) * 100);
  };
  const goalAlignment = getGoalAlignment();

  const GaugeCard = ({ label, value, color, icon: Icon, sub }: any) => (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a1a1a" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${value} 100`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black text-white">{value}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-white font-bold text-sm mt-0.5 truncate">{sub}</p>
      </div>
      <Icon size={16} style={{ color }} className="flex-shrink-0 opacity-50" />
    </motion.div>
  );

  return (
    <div className="h-full overflow-y-auto bg-[#050505] text-[#E4E3E0]">
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 pb-8">

        {/* Header */}
        <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <Activity size={11} className="animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]">System Online</span>
            </div>
            <h2 className="text-xl md:text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
              {userProfile?.name || 'OPERATIVE'}<span className="text-emerald-500">.</span>
            </h2>
            <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest mt-1">{format(today, 'eeee · dd.MM.yyyy')}</p>
          </div>
          <div className="flex gap-3 text-right">
            <div>
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Efficiency</p>
              <p className="text-xl md:text-2xl font-black text-white">{overallProgress}%</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Days</p>
              <p className="text-xl md:text-2xl font-black text-white">{getDaysActive()}</p>
            </div>
          </div>
        </motion.header>

        {/* Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GaugeCard label="Daily Tasks" value={taskProgress} color="#10b981" icon={Target} sub={`${completedTodayTasks}/${todayTasks.length} done`} />
          <GaugeCard label="Habits Today" value={habitProgress} color="#3b82f6" icon={Zap} sub={`${habitCompletionsToday}/${activeHabits} logged`} />
          <GaugeCard label="Overall" value={overallProgress} color="#8b5cf6" icon={Globe} sub={`${completedTotalTasks + totalHabitLogs} actions`} />
        </div>

        {/* Chart + Quote + Note */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-white text-sm uppercase italic">{showYearly ? 'Yearly Matrix' : 'Weekly Performance'}</h3>
                <p className="text-[9px] text-gray-600 uppercase tracking-widest">Activity visualization</p>
              </div>
              <button onClick={() => setShowYearly(!showYearly)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                <Calendar size={11} className="text-emerald-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{showYearly ? 'Weekly' : 'Yearly'}</span>
              </button>
            </div>
            <div className="h-44 md:h-56">
              {showYearly ? (
                <div className="h-full flex flex-col justify-center">
                  <div className="overflow-x-auto pb-2">
                    <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ width: 'max-content' }}>
                      {yearlyData.map((day, i) => (
                        <div key={i} title={`${format(day.date, 'MMM dd')}: ${day.intensity}`}
                          className={cn("w-2.5 h-2.5 rounded-sm",
                            day.intensity === 0 && "bg-white/5",
                            day.intensity === 1 && "bg-emerald-500/20",
                            day.intensity === 2 && "bg-emerald-500/40",
                            day.intensity === 3 && "bg-emerald-500/70",
                            day.intensity === 4 && "bg-emerald-500")} />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] font-bold text-gray-600 uppercase">
                    {['Jan','Mar','May','Jul','Sep','Nov','Dec'].map(m => <span key={m}>{m}</span>)}
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 9, fontWeight: 800 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 9 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0a0a0a', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="habits" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {!showYearly && (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Habits</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Tasks</span></div>
              </div>
            )}
          </div>

          {/* Quote + Note */}
          <div className="space-y-3">
            {/* Quote card */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5">
              <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Daily Directive</h3>
              <Quote className="text-emerald-500 opacity-20 mb-2" size={20} />
              <p className="text-sm font-medium italic leading-relaxed text-gray-300">&quot;{dailyQuote.text}&quot;</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mt-2">-- {dailyQuote.author}</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Goal Clarity', val: userProfile?.goals ? 100 : 0, text: userProfile?.goals ? 'Set' : 'Pending', color: 'bg-emerald-500' },
                  { label: 'Task Quality', val: totalTaskProgress, text: `${totalTaskProgress}%`, color: 'bg-blue-500' },
                ].map(item => (
                  <div key={item.label} className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
                      <span className="text-[9px] font-bold text-white">{item.text}</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} transition-all`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
                {goalAlignment !== null && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Goal Alignment</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold ${goalAlignment >= 60 ? 'text-emerald-400' : goalAlignment >= 30 ? 'text-amber-400' : 'text-red-400'}`}>{goalAlignment}%</span>
                        {goalAlignment < 80 && (
                          <button onClick={() => setShowWhyModal(true)}
                            className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full hover:bg-amber-500/30 transition-all">
                            Why?
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${goalAlignment >= 60 ? 'bg-emerald-500' : goalAlignment >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${goalAlignment}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Note card */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Quick Note</h3>
                <button onClick={() => setEditingNote(!editingNote)} className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400">
                  {editingNote ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingNote ? (
                <textarea
                  value={note}
                  onChange={e => { setNote(e.target.value); localStorage.setItem('elevate_dashboard_note', e.target.value); }}
                  placeholder="Write something... a thought, a reminder, a goal for today."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-300 resize-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  rows={4}
                />
              ) : (
                <p className="text-xs text-gray-400 leading-relaxed min-h-[60px]">
                  {note || <span className="opacity-40 italic">No note yet. Tap Edit to add one.</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Why Modal */}
        <AnimatePresence>
          {showWhyModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowWhyModal(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
                className="bg-[#141414] border border-white/10 rounded-2xl p-5 max-w-sm w-full"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Goal Alignment</h3>
                  </div>
                  <button onClick={() => setShowWhyModal(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                  Your goal: <span className="text-white font-medium">&quot;{userProfile?.goals}&quot;</span>
                  <br /><br />
                  Some tasks today may not be directly moving you toward this goal. Ask your AI to help you figure out which tasks actually matter.
                </p>
                <button onClick={() => {
                  setShowWhyModal(false);
                  const todayT = tasks.filter(t => t.date === format(new Date(), 'yyyy-MM-dd'));
                  const msg = { id: `goal-q-${Date.now()}`, role: 'user' as const, content: `My goal is: "${userProfile?.goals}". Today's tasks: ${todayT.map(t => t.name).join(', ')}. Goal alignment: ${goalAlignment}%. Why don't my tasks match my goal?`, timestamp: new Date().toISOString() };
                  setChatHistory([...chatHistory, msg]);
                  setActiveTab('ai');
                }}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
                  Ask AI
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Habits grid */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-white text-sm uppercase italic">Active Habits</h3>
            <button onClick={() => setActiveTab('habits')} className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">View All</button>
          </div>
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 opacity-30">
              <Cpu size={32} className="mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">No Active Habits</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {habits.map(habit => (
                <div key={habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-base flex-shrink-0">{habit.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{habit.name}</div>
                    <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{habit.category}</div>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all",
                    habit.logs[todayStr] ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/10 text-transparent")}>
                    <CheckCircle2 size={10} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
