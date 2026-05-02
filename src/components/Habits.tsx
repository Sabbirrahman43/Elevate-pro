import React, { useState } from "react";
import { useStore } from "../store/useStore";
import { 
  Plus, 
  Trash2, 
  Flame, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, generateId } from "../lib/utils";

export const Habits: React.FC = () => {
  const { data, updateData } = useStore();
  const [newHabit, setNewHabit] = useState("");

  const getDayLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getPast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: getDayLabel(d),
        date: d.toISOString().split("T")[0],
        dayNum: d.getDate()
      });
    }
    return days;
  };

  const days = getPast7Days();

  const toggleHabit = (habitId: string, date: string) => {
    const d = new Date(date);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    if (data.offDays.includes(dayLabel)) return; // Prevent toggle on off-days

    const updatedHabits = data.habits.map(h => {
      if (h.id === habitId) {
        const newLogs = { ...h.logs };
        newLogs[date] = !newLogs[date];
        return { ...h, logs: newLogs };
      }
      return h;
    });
    updateData({ habits: updatedHabits });
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    const habit: any = {
      id: generateId(),
      name: newHabit,
      createdAt: Date.now(),
      logs: {}
    };
    updateData({ habits: [...data.habits, habit] });
    setNewHabit("");
  };

  const deleteHabit = (id: string) => {
    updateData({ habits: data.habits.filter(h => h.id !== id) });
  };

  const getHabitStreak = (habit: any) => {
    let streak = 0;
    let curr = new Date();
    while (true) {
      const d = curr.toISOString().split("T")[0];
      if (habit.logs[d]) {
        streak++;
        curr.setDate(curr.getDate() - 1);
      } else if (data.offDays.includes(curr.toLocaleDateString('en-US', { weekday: 'short' }))) {
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getAverageConsistency = () => {
    if (data.habits.length === 0) return 0;
    
    // Calculate based on the last 7 days available in the 'days' array
    const totalPossiblePoints = data.habits.length * days.length;
    let actualPoints = 0;
    
    data.habits.forEach(habit => {
      days.forEach(day => {
        if (habit.logs[day.date]) actualPoints++;
      });
    });

    if (totalPossiblePoints === 0) return 0;
    return Math.round((actualPoints / totalPossiblePoints) * 100);
  };

  const getMaxStreak = () => {
    if (data.habits.length === 0) return 0;
    return Math.max(...data.habits.map(h => getHabitStreak(h)));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Daily Rituals</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Build habits that stick</p>
        </div>
        <form onSubmit={addHabit} className="flex gap-2">
          <input 
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="New habit name..."
            className="bg-white border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 shadow-sm outline-none font-bold transition-all w-64"
          />
          <button 
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/20 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>
      </div>

      {/* Habit Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
            <Flame className="text-orange-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Focus</p>
            <h4 className="text-xl font-black text-gray-900">{data.habits.length} Ritual(s)</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-green-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
            <TrendingUp className="text-green-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Consistency</p>
            <h4 className="text-xl font-black text-gray-900">{getAverageConsistency()}% Average</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Award className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Top Streak</p>
            <h4 className="text-xl font-black text-gray-900">{getMaxStreak()} Days</h4>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 min-w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="pb-6 pr-8 text-xs font-black text-gray-400 uppercase tracking-widest min-w-[200px]">Ritual Name</th>
              {days.map(d => (
                <th key={d.date} className="pb-6 text-center px-2">
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      data.offDays.includes(d.label) ? "text-blue-400" : "text-gray-400"
                    )}>{d.label}</span>
                    <span className="text-lg font-black text-gray-900">{d.dayNum}</span>
                  </div>
                </th>
              ))}
              <th className="pb-6 pl-8 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Streak</th>
              <th className="pb-6 pl-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {data.habits.map((habit) => (
                <motion.tr 
                  key={habit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="border-b border-gray-50 group transition-colors hover:bg-gray-50/50"
                >
                  <td className="py-6 pr-8">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-600 shadow-lg shadow-orange-600/50" />
                      <span className="text-xl font-black text-gray-800">{habit.name}</span>
                    </div>
                  </td>
                  {days.map(d => {
                    const isOffDay = data.offDays.includes(d.label);
                    return (
                      <td key={d.date} className="py-6 text-center px-1">
                        <button 
                          disabled={isOffDay}
                          onClick={() => toggleHabit(habit.id, d.date)}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                            isOffDay 
                              ? "bg-gray-50 text-gray-300 cursor-not-allowed border-2 border-dashed border-gray-200" 
                              : habit.logs[d.date] 
                                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30 scale-100" 
                                : "bg-gray-100 text-transparent scale-[0.85] hover:scale-100 hover:bg-orange-100"
                          )}
                        >
                          {isOffDay ? <TrendingUp className="w-5 h-5 opacity-20" /> : <Check className="w-6 h-6 stroke-[3px]" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-6 pl-8 text-right font-black text-2xl text-orange-600 italic">
                    {getHabitStreak(habit)}
                  </td>
                  <td className="py-6 pl-4 text-right">
                    <button 
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {data.habits.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-orange-50 rounded-[2rem] mx-auto flex items-center justify-center mb-8">
              <Plus className="text-orange-200 w-12 h-12" />
            </div>
            <h4 className="text-2xl font-black text-gray-400">Your Ritual List is Empty</h4>
            <p className="text-gray-500 font-bold mt-2">Success is defined by what you do daily.</p>
          </div>
        )}
      </div>
    </div>
  );
};
