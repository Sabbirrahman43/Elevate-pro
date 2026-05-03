import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { HabitGrid } from './components/HabitGrid';
import { TaskBoard } from './components/TaskBoard';
import { AIInterface } from './components/AIInterface';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { Admin } from './components/Admin';
import { SplashScreen } from './components/SplashScreen';
import { Onboarding } from './components/Onboarding';
import { Notepad } from './components/Notepad';
import { LayoutDashboard, CheckSquare, ListTodo, Bot, Settings as SettingsIcon, BookOpen } from 'lucide-react';
import { cn } from './lib/utils';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, userProfile, activeTab, setActiveTab } = useAppContext();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowSplash(false), 2000); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (isAuthenticated && userProfile && !userProfile.name && !isLoading) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, userProfile, isLoading]);

  if (showSplash) return <SplashScreen />;
  if (!isAuthenticated) return <Login />;
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'habits': return <HabitGrid />;
      case 'tasks': return <TaskBoard />;
      case 'ai': return <AIInterface />;
      case 'notes': return <Notepad />;
      case 'settings': return <Settings />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  };

  const mobileTabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'habits', icon: CheckSquare, label: 'Habits' },
    { id: 'tasks', icon: ListTodo, label: 'Tasks' },
    { id: 'ai', icon: Bot, label: 'AI' },
    { id: 'notes', icon: BookOpen, label: 'Notes' },
    { id: 'settings', icon: SettingsIcon, label: 'More' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        {renderTab()}
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-white/5 flex z-50">
        {mobileTabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors', active ? 'text-emerald-400' : 'text-gray-700 hover:text-gray-400')}>
              <Icon size={18} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
