import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fmsebqqwmsvurgbqwvvv.supabase.co';
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6Z6oL3pgtMDbUVzaqGXYxg_8TljNqWn';
const supabase = createClient(SUPA_URL, SUPA_KEY);

export type Habit = {
  id: string; name: string; category: string; icon: string; logs: string[];
};
export type Task = {
  id: string; name: string; date: string; completed: boolean;
};
export type AIMemory = {
  id: string; content: string; type: string; date: string;
};
export type ChatMessage = {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: string;
};
export type Note = {
  id: string; title: string; content: string; date: string;
};
export type UserProfile = {
  id?: string; email?: string; name: string; about: string; goals: string;
  dob?: string; avatar?: string; offDays: number[]; messageCount: number;
};
export type AISettings = {
  apiKey: string; groqApiKey: string; provider: 'gemini' | 'groq';
  name: string; persona: string; behavior: string;
  model: string; groqModel: string; voice: string; avatar: string;
  mode: 'chat' | 'research' | 'supporter' | 'planner';
};

type Ctx = {
  habits: Habit[]; tasks: Task[]; aiMemory: AIMemory[];
  aiSettings: AISettings; userProfile: UserProfile;
  chatHistory: ChatMessage[]; notes: Note[];
  theme: string; setTheme: (t: string) => void;
  isAuthenticated: boolean; isLoading: boolean;
  activeTab: string; setActiveTab: (t: string) => void;
  login: (e: string, p: string) => Promise<void>;
  signup: (e: string, p: string, n: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  addHabit: (n: string, c: string, i: string) => void;
  updateHabit: (id: string, u: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitLog: (id: string, date: string) => void;
  addTask: (n: string, d: string) => void;
  updateTask: (id: string, u: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addMemory: (c: string, t: string) => void;
  deleteMemory: (id: string) => void;
  updateAISettings: (u: Partial<AISettings>) => void;
  updateUserProfile: (u: Partial<UserProfile>) => void;
  setChatHistory: (m: ChatMessage[]) => void;
  clearChatHistory: () => void;
  incrementMessageCount: () => void;
  addNote: () => string;
  updateNote: (id: string, u: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  importData: (d: any) => void;
  resetData: () => void;
  getAllUsers: () => Promise<any[]>;
  forceSave: () => Promise<void>;
};

const defaultProfile: UserProfile = {
  name: '', about: '', goals: '', offDays: [], messageCount: 0,
};
const defaultAI: AISettings = {
  apiKey: '', groqApiKey: '', provider: 'gemini',
  name: 'Aria', persona: 'Coach',
  behavior: 'Motivating, warm, emotionally intelligent, focuses on discipline and growth.',
  model: 'auto', groqModel: 'auto',
  voice: 'Zephyr', avatar: '', mode: 'chat',
};

const AppContext = createContext<Ctx>({} as Ctx);
export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMemory, setAiMemory] = useState<AIMemory[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettings>(defaultAI);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [chatHistory, setChatHistoryState] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [theme, setThemeState] = useState('dark');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const setTheme = (t: string) => {
    setThemeState(t);
    if (t === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  };

  const syncToSupabase = useCallback(async (state: any, userId: string) => {
    try {
      await supabase.from('user_data').upsert({ id: userId, data: state }, { onConflict: 'id' });
    } catch {}
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const { data } = await supabase.from('user_data').select('data').eq('id', session.user.id).single();
        if (data?.data) {
          const d = data.data;
          setHabits(d.habits || []);
          setTasks(d.tasks || []);
          setAiMemory(d.aiMemory || []);
          setAiSettings({ ...defaultAI, ...(d.aiSettings || {}) });
          setUserProfile({ ...defaultProfile, ...(d.userProfile || {}), id: session.user.id, email: session.user.email });
          setChatHistoryState(d.chatHistory || []);
          setNotes(d.notes || []);
          if (d.theme) setTheme(d.theme);
        } else {
          setUserProfile(p => ({ ...p, id: session.user.id, email: session.user.email }));
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userProfile.id) return;
    const t = setTimeout(() => {
      syncToSupabase({ habits, tasks, aiMemory, aiSettings, userProfile, chatHistory: chatHistory.slice(-100), notes, theme }, userProfile.id!);
    }, 1500);
    return () => clearTimeout(t);
  }, [habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, notes, theme, isAuthenticated]);

  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const today = () => format(new Date(), 'yyyy-MM-dd');

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    setUserProfile(p => ({ ...p, name }));
  };
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };
  const logout = async () => {
    await supabase.auth.signOut();
    setHabits([]); setTasks([]); setAiMemory([]);
    setAiSettings(defaultAI); setUserProfile(defaultProfile);
    setChatHistoryState([]); setNotes([]);
  };

  const addHabit = (n: string, c: string, i: string) => setHabits(p => [...p, { id: genId(), name: n, category: c, icon: i, logs: [] }]);
  const updateHabit = (id: string, u: Partial<Habit>) => setHabits(p => p.map(h => h.id === id ? { ...h, ...u } : h));
  const deleteHabit = (id: string) => setHabits(p => p.filter(h => h.id !== id));
  const toggleHabitLog = (id: string, date: string) => setHabits(p => p.map(h => h.id === id ? { ...h, logs: h.logs.includes(date) ? h.logs.filter(l => l !== date) : [...h.logs, date] } : h));

  const addTask = (n: string, d: string) => setTasks(p => [...p, { id: genId(), name: n, date: d || today(), completed: false }]);
  const updateTask = (id: string, u: Partial<Task>) => setTasks(p => p.map(t => t.id === id ? { ...t, ...u } : t));
  const deleteTask = (id: string) => setTasks(p => p.filter(t => t.id !== id));
  const toggleTask = (id: string) => setTasks(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  const addMemory = (c: string, t: string) => setAiMemory(p => [...p.slice(-99), { id: genId(), content: c, type: t, date: new Date().toISOString() }]);
  const deleteMemory = (id: string) => setAiMemory(p => p.filter(m => m.id !== id));

  const updateAISettings = (u: Partial<AISettings>) => setAiSettings(p => ({ ...p, ...u }));
  const updateUserProfile = (u: Partial<UserProfile>) => setUserProfile(p => ({ ...p, ...u }));

  const setChatHistory = (m: ChatMessage[]) => setChatHistoryState(m);
  const clearChatHistory = () => setChatHistoryState([]);
  const incrementMessageCount = () => setUserProfile(p => ({ ...p, messageCount: (p.messageCount || 0) + 1 }));

  const addNote = () => {
    const id = genId();
    setNotes(p => [{ id, title: 'Untitled', content: '', date: new Date().toISOString() }, ...p]);
    return id;
  };
  const updateNote = (id: string, u: Partial<Note>) => setNotes(p => p.map(n => n.id === id ? { ...n, ...u, date: new Date().toISOString() } : n));
  const deleteNote = (id: string) => setNotes(p => p.filter(n => n.id !== id));

  const importData = (d: any) => {
    if (d.habits) setHabits(d.habits);
    if (d.tasks) setTasks(d.tasks);
    if (d.aiMemory) setAiMemory(d.aiMemory);
    if (d.aiSettings) setAiSettings({ ...defaultAI, ...d.aiSettings });
    if (d.userProfile) setUserProfile({ ...defaultProfile, ...d.userProfile });
    if (d.notes) setNotes(d.notes);
  };
  const resetData = () => {
    if (window.confirm('Reset all data? This cannot be undone.')) {
      setHabits([]); setTasks([]); setAiMemory([]);
      setAiSettings(defaultAI);
      setUserProfile(p => ({ ...defaultProfile, id: p.id, email: p.email, name: p.name }));
      setChatHistoryState([]); setNotes([]);
    }
  };
  const getAllUsers = async () => {
    const { data } = await supabase.from('user_data').select('*');
    return data || [];
  };
  const forceSave = async () => {
    if (userProfile.id) {
      await syncToSupabase({ habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, notes, theme }, userProfile.id);
    }
  };

  return (
    <AppContext.Provider value={{
      habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, notes,
      theme, setTheme, isAuthenticated, isLoading, activeTab, setActiveTab,
      login, signup, loginWithGoogle, logout,
      addHabit, updateHabit, deleteHabit, toggleHabitLog,
      addTask, updateTask, deleteTask, toggleTask,
      addMemory, deleteMemory,
      updateAISettings, updateUserProfile,
      setChatHistory, clearChatHistory, incrementMessageCount,
      addNote, updateNote, deleteNote,
      importData, resetData, getAllUsers, forceSave,
    }}>
      {children}
    </AppContext.Provider>
  );
};
