import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Habit = { id: string; name: string; category: string; icon: string; logs: Record<string, boolean>; };
export type Task = { id: string; name: string; date: string; completed: boolean; habitId?: string; };
export type AIMemory = { id: string; date: string; content: string; type: 'auto' | 'manual'; };
export type AISettings = { apiKey: string; groqApiKey: string; provider: 'gemini' | 'groq'; name: string; persona: string; behavior: string; model: string; groqModel: string; voice: string; avatar: string; mode: 'chat' | 'research' | 'supporter' | 'planner'; };
export type Notification = { id: string; title: string; message: string; date: string; read: boolean; };
export type UserProfile = { id?: string; email?: string; name: string; dob: string; about: string; goals: string; instagram: string; avatar: string; messageCount: number; offDays: number[]; notifications: Notification[]; };
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; timestamp: string; };

type AppContextType = {
  habits: Habit[]; tasks: Task[]; aiMemory: AIMemory[]; aiSettings: AISettings;
  userProfile: UserProfile; chatHistory: ChatMessage[]; theme: 'light' | 'dark';
  notes: string; setNotes: (n: string) => void;
  isAuthenticated: boolean; isLoading: boolean; activeTab: string;
  setActiveTab: (tab: string) => void; setTheme: (theme: 'light' | 'dark') => void;
  addHabit: (name: string, category: string, icon: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void; toggleHabitLog: (id: string, date: string) => void;
  addTask: (name: string, date: string) => void; updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void; toggleTask: (id: string) => void;
  addMemory: (content: string, type?: 'auto' | 'manual') => void;
  updateMemory: (id: string, content: string) => void; deleteMemory: (id: string) => void;
  updateAISettings: (updates: Partial<AISettings>) => void; updateUserProfile: (updates: Partial<UserProfile>) => void;
  setChatHistory: (messages: ChatMessage[]) => void; clearChatHistory: () => void;
  incrementMessageCount: () => void; addNotification: (title: string, message: string) => void;
  markNotificationsRead: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void; importData: (data: any) => void; resetData: () => void;
  getAllUsers: () => Promise<any[]>;
  forceSave: () => Promise<void>;
};

const defaultSettings: AISettings = { apiKey: '', groqApiKey: '', provider: 'gemini', name: 'Elevate AI', persona: 'Coach', behavior: 'Motivating and strict.', model: 'gemini-2.5-flash', groqModel: 'llama-3.3-70b-versatile', voice: 'Zephyr', avatar: '', mode: 'chat' };
const defaultUserProfile: UserProfile = { name: 'User', dob: '', about: '', goals: '', instagram: '', avatar: '', messageCount: 0, offDays: [], notifications: [] };

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMemory, setAiMemory] = useState<AIMemory[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettings>(defaultSettings);
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultUserProfile);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('elevate_active_tab') || 'dashboard');

  useEffect(() => { localStorage.setItem('elevate_active_tab', activeTab); }, [activeTab]);

  const loadUserData = (userId: string, email: string, data: any) => {
    setHabits(data.habits || []);
    setTasks(data.tasks || []);
    setAiMemory(data.aiMemory || []);
    setAiSettings({ ...defaultSettings, ...(data.aiSettings || {}) });
    setUserProfile({ ...defaultUserProfile, ...data.userProfile, id: userId, email, messageCount: data.messageCount || 0, offDays: data.userProfile?.offDays || [], notifications: data.userProfile?.notifications || [] });
    setTheme(data.theme || 'light');
    setNotes(data.notes || '');
    setChatHistory(data.chatHistory || []);
    setIsAuthenticated(true);
  };

  const fetchAndLoadUser = async (userId: string, email: string) => {
    const { data, error } = await supabase.from('user_data').select('data').eq('id', userId).single();
    if (error || !data) {
      const welcome: Notification = { id: uuidv4(), title: 'Welcome to Elevate!', message: 'Your personal OS is ready. Start by setting your goals.', date: new Date().toISOString(), read: false };
      const defaultData = { habits: [], tasks: [], aiMemory: [], aiSettings: defaultSettings, userProfile: { ...defaultUserProfile, notifications: [welcome] }, chatHistory: [], theme: 'light', messageCount: 0 };
      await supabase.from('user_data').upsert({ id: userId, data: defaultData });
      loadUserData(userId, email, defaultData);
    } else {
      loadUserData(userId, email, data.data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchAndLoadUser(session.user.id, session.user.email || '').finally(() => setIsLoading(false));
      else { setIsAuthenticated(false); setIsLoading(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchAndLoadUser(session.user.id, session.user.email || '').finally(() => setIsLoading(false));
      else { setIsAuthenticated(false); setIsLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncToSupabase = useCallback(async (state: any, userId: string) => {
    await supabase.from('user_data').upsert({ id: userId, data: state, updated_at: new Date().toISOString() });
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading && userProfile.id) {
      const timeout = setTimeout(() => {
        syncToSupabase({ habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, theme, messageCount: userProfile.messageCount, notes }, userProfile.id!);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, theme, notes, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
      const missed = tasks.filter(t => t.date === yesterdayStr && !t.completed);
      if (missed.length > 0 && localStorage.getItem('last_notified_missed') !== yesterdayStr) {
        addNotification('Missed Objectives', `You missed ${missed.length} tasks yesterday. Let's make today count!`);
        localStorage.setItem('last_notified_missed', yesterdayStr);
      }
      if (userProfile.offDays.includes(today.getDay()) && localStorage.getItem('last_notified_offday') !== todayStr) {
        addNotification('Rest Day Active', `Today is your scheduled off day. Recharge!`);
        localStorage.setItem('last_notified_offday', todayStr);
      }
    }
  }, [isAuthenticated, isLoading, tasks, userProfile.offDays]);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  // --- Auth ---
  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw new Error(error.message);
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    localStorage.removeItem('elevate_active_tab');
    window.location.href = '/';
  };

  const getAllUsers = async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from('user_data').select('id, data');
      if (error || !data) return [];
      return data.map((row: any) => ({
        id: row.id,
        name: row.data?.userProfile?.name || 'Unknown',
        email: row.data?.userProfile?.email || 'No email',
        messageCount: row.data?.userProfile?.messageCount || 0,
        habits: row.data?.habits?.length || 0,
        tasks: row.data?.tasks?.length || 0,
      }));
    } catch { return []; }
  };

  // --- Data ---
  const addHabit = (name: string, category: string, icon: string) => {
    const habitId = uuidv4();
    const today = new Date().toISOString().split('T')[0];
    setHabits(prev => [...prev, { id: habitId, name, category, icon, logs: {} }]);
    setTasks(prev => [...prev, { id: uuidv4(), name, date: today, completed: false, habitId }]);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    if (updates.name) setTasks(prev => prev.map(t => t.habitId === id ? { ...t, name: updates.name! } : t));
  };

  const deleteHabit = (id: string) => { setHabits(prev => prev.filter(h => h.id !== id)); setTasks(prev => prev.filter(t => t.habitId !== id)); };

  const toggleHabitLog = (id: string, date: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const newLogs = { ...h.logs };
      const isCompleted = !newLogs[date];
      if (newLogs[date]) delete newLogs[date]; else newLogs[date] = true;
      setTasks(prev => prev.map(t => (t.habitId === id && t.date === date) ? { ...t, completed: isCompleted } : t));
      return { ...h, logs: newLogs };
    }));
  };

  const addTask = (name: string, date: string) => setTasks(prev => [...prev, { id: uuidv4(), name, date, completed: false }]);
  const updateTask = (id: string, updates: Partial<Task>) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newCompleted = !t.completed;
      if (t.habitId) setHabits(prev => prev.map(h => { if (h.id !== t.habitId) return h; const l = { ...h.logs }; if (newCompleted) l[t.date] = true; else delete l[t.date]; return { ...h, logs: l }; }));
      return { ...t, completed: newCompleted };
    }));
  };

  const addMemory = (content: string, type: 'auto' | 'manual' = 'manual') => setAiMemory(prev => [{ id: uuidv4(), date: new Date().toISOString(), content, type }, ...prev]);
  const updateMemory = (id: string, content: string) => setAiMemory(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  const deleteMemory = (id: string) => setAiMemory(prev => prev.filter(m => m.id !== id));
  const updateAISettings = (updates: Partial<AISettings>) => setAiSettings(prev => ({ ...prev, ...updates }));
  const updateUserProfile = (updates: Partial<UserProfile>) => setUserProfile(prev => ({ ...prev, ...updates }));
  const incrementMessageCount = () => setUserProfile(prev => ({ ...prev, messageCount: prev.messageCount + 1 }));

  const addNotification = (title: string, message: string) => {
    const n: Notification = { id: uuidv4(), title, message, date: new Date().toISOString(), read: false };
    setUserProfile(prev => ({ ...prev, notifications: [n, ...(prev.notifications || [])] }));
  };

  const markNotificationsRead = () => setUserProfile(prev => ({ ...prev, notifications: (prev.notifications || []).map(n => ({ ...n, read: true })) }));
  const importData = (data: any) => { if (data.habits) setHabits(data.habits); if (data.tasks) setTasks(data.tasks); if (data.aiMemory) setAiMemory(data.aiMemory); if (data.aiSettings) setAiSettings(data.aiSettings); if (data.userProfile) setUserProfile(prev => ({ ...prev, ...data.userProfile })); };
  const resetData = () => { if (window.confirm('Reset all data?')) { setHabits([]); setTasks([]); setAiMemory([]); setAiSettings(defaultSettings); setUserProfile(prev => ({ ...defaultUserProfile, id: prev.id, email: prev.email, name: prev.name })); } };
  const clearChatHistory = () => setChatHistory([]);
  const forceSave = async () => {
    if (userProfile.id) {
      await syncToSupabase({ habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, theme, messageCount: userProfile.messageCount }, userProfile.id);
    }
  };

  return (
    <AppContext.Provider value={{ habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, theme, setTheme, notes, setNotes, isAuthenticated, isLoading, activeTab, setActiveTab, login, signup, loginWithGoogle, logout, addHabit, updateHabit, deleteHabit, toggleHabitLog, addTask, updateTask, deleteTask, toggleTask, addMemory, updateMemory, deleteMemory, updateAISettings, updateUserProfile, setChatHistory, clearChatHistory, incrementMessageCount, addNotification, markNotificationsRead, importData, resetData, getAllUsers, forceSave }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
