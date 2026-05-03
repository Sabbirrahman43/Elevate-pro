import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, subDays, eachDayOfInterval, startOfYear } from 'date-fns';
import { Target, Zap, Activity, CheckCircle2, TrendingUp, Brain, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { motion } from 'motion/react';

export const Dashboard: React.FC = () => {
  const { habits, tasks, userProfile, aiMemory, setActiveTab } = useAppContext();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [flipped, setFlipped] = useState(false);

  const todayTasks = tasks.filter(t => t.date === today);
  const completedToday = todayTasks.filter(t => t.completed).length;
  const taskProgress = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.date === d);
    const done = dayTasks.filter(t => t.completed).length;
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), value: dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : 0, date: d };
  });

  const todayHabits = habits.filter(h => h.logs.includes(today)).length;
  const habitStreak = (() => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const ds = format(d, 'yyyy-MM-dd');
      const logged = habits.filter(h => h.logs.includes(ds)).length;
      if (logged === 0 && ds !== today) break;
      if (logged > 0) streak++;
      d = subDays(d, 1);
      if (streak > 365) break;
    }
    return streak;
  })();

  const goalAlignment = (() => {
    if (!userProfile?.goals || todayTasks.length === 0) return null;
    const goalWords = userProfile.goals.toLowerCase().split(/\s+/);
    const matched = todayTasks.filter(t => goalWords.some(w => w.length > 3 && t.name.toLowerCase().includes(w))).length;
    return Math.round((matched / todayTasks.length) * 100);
  })();

  const yearStart = startOfYear(new Date());
  const allDays = eachDayOfInterval({ start: yearStart, end: new Date() });
  const heatmap = allDays.map(d => {
    const ds = format(d, 'yyyy-MM-dd');
    const done = tasks.filter(t => t.date === ds && t.completed).length;
    const total = tasks.filter(t => t.date === ds).length;
    return { date: ds, level: total === 0 ? 0 : done === total ? 4 : done > 0 ? Math.ceil((done / total) * 3) : 1 };
  });

  const quotes = [
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Augusta F. Kantra' },
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  ];
  const quote = quotes[new Date().getDate() % quotes.length];

  const levelColor = (l: number) => ['bg-white/4', 'bg-emerald-900/60', 'bg-emerald-700/70', 'bg-emerald-500/80', 'bg-emerald-400'][l];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] text-white p-4 md:p-6 no-scrollbar">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight">
              {userProfile?.name ? 'Hey, ' + userProfile.name.split(' ')[0] : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <button onClick={() => setActiveTab('ai')} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition-all">
            <Brain size={13} /> Ask AI
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Tasks Done', value: completedToday + '/' + todayTasks.length, sub: taskProgress + '% today', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
            { label: 'Habits Done', value: todayHabits + '/' + habits.length, sub: 'today', icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/8' },
            { label: 'Streak', value: habitStreak + 'd', sub: 'days active', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/8' },
            { label: 'Memories', value: aiMemory.length + '', sub: 'stored', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/8' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                <s.icon size={16} className={s.color} />
              </div>
              <p className="text-xl font-bold font-display">{s.value}</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-700 mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Progress + Quote flip card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Task progress */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-white font-display">Today's Progress</h3>
              <button onClick={() => setActiveTab('tasks')} className="text-[10px] text-gray-600 hover:text-emerald-400 transition-colors flex items-center gap-1">
                View <ChevronRight size={10} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                    strokeDasharray={taskProgress + ' 100'} strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold font-display text-white">{taskProgress}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {todayTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', t.completed ? 'bg-emerald-400' : 'bg-white/10')} />
                    <p className={cn('text-xs truncate', t.completed ? 'line-through text-gray-600' : 'text-gray-300')}>{t.name}</p>
                  </div>
                ))}
                {todayTasks.length === 0 && <p className="text-xs text-gray-600">No tasks today</p>}
                {todayTasks.length > 3 && <p className="text-[10px] text-gray-600">+{todayTasks.length - 3} more</p>}
              </div>
            </div>
            <div className="h-2 bg-white/4 rounded-full overflow-hidden">
              <motion.div className={cn("h-full rounded-full", progress === 0 ? "bg-white/10" : progress < 40 ? "bg-red-500" : progress < 70 ? "bg-amber-500" : "bg-emerald-500")} initial={{ width: 0 }} animate={{ width: taskProgress + '%' }} transition={{ duration: 0.8, delay: 0.3 }} />
            </div>
          </div>

          {/* Flip card - motivation */}
          <div className="relative h-[180px] cursor-pointer" onClick={() => setFlipped(!flipped)} style={{ perspective: '1000px' }}>
            <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              className="w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
              {/* Front */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-[#111] border border-emerald-500/15 rounded-2xl p-5 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden' }}>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Daily Motivation</span>
                </div>
                <div>
                  <p className="text-sm text-gray-200 italic leading-relaxed">"{quote.text}"</p>
                  <p className="text-[10px] text-emerald-400 mt-2 font-semibold">-- {quote.author}</p>
                </div>
                <p className="text-[9px] text-gray-700">Tap to flip</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-[#111] border border-blue-500/15 rounded-2xl p-5 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Your Goal</span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{userProfile?.goals || 'Add your goals in Settings to see them here.'}</p>
                <div className="flex items-center gap-2">
                  {goalAlignment !== null && (
                    <button onClick={e => { e.stopPropagation(); setActiveTab('ai'); }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                      {goalAlignment}% aligned today <ChevronRight size={9} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm font-display">Weekly Performance</h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <Activity size={11} /> Task completion rate
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={last7} barSize={24}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#555' }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v: any) => [v + '%', 'Completion']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {last7.map((_, i) => <Cell key={i} fill={_.value > 0 ? '#10b981' : 'rgba(255,255,255,0.06)'} fillOpacity={_.value === 100 ? 1 : 0.6 + _.value * 0.004} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Habit heatmap */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm font-display">Year Activity</h3>
            <div className="flex items-center gap-1.5 text-[9px] text-gray-600">
              <div className="w-2.5 h-2.5 rounded-sm bg-white/4" /> Less
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> More
            </div>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-0.5" style={{ minWidth: 'max-content' }}>
              {Array.from({ length: Math.ceil(heatmap.length / 7) }, (_, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {heatmap.slice(wi * 7, wi * 7 + 7).map((d, di) => (
                    <div key={di} title={d.date} className={cn('w-2.5 h-2.5 rounded-sm transition-all', levelColor(d.level))} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Add Task', tab: 'tasks', icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Add Habit', tab: 'habits', icon: Target, color: 'text-blue-400' },
          ].map(a => (
            <button key={a.tab} onClick={() => setActiveTab(a.tab)}
              className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/3 hover:border-white/8 transition-all group">
              <a.icon size={18} className={cn(a.color, 'group-hover:scale-110 transition-transform')} />
              <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{a.label}</span>
              <ChevronRight size={14} className="text-gray-700 ml-auto group-hover:text-gray-400 transition-colors" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
