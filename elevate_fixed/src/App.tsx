import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { HabitGrid } from './components/HabitGrid';
import { TaskBoard } from './components/TaskBoard';
import { AIInterface } from './components/AIInterface';
import { Settings } from './components/Settings';
import { Admin } from './components/Admin';
import { Login } from './components/Login';
import { SplashScreen } from './components/SplashScreen';
import { Onboarding } from './components/Onboarding';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useAppContext } from './context/AppContext';
import { cn } from './lib/utils';

import { LandingPage } from './components/LandingPage';

const MainLayout = () => {
  const { theme, setTheme, isAuthenticated, isLoading, userProfile, activeTab, setActiveTab } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem('elevate_onboarded') === 'true';
  });

  const handleOnboardingComplete = () => {
    localStorage.setItem('elevate_onboarded', 'true');
    setOnboardingDone(true);
  };

  React.useEffect(() => {
    // Apply saved theme on load
    const savedTheme = localStorage.getItem('elevate_theme') || 'default';
    document.documentElement.setAttribute('data-theme', savedTheme);
    // Listen for theme changes from Settings
    const handleThemeChange = () => {
      const t = localStorage.getItem('elevate_theme') || 'default';
      document.documentElement.setAttribute('data-theme', t);
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  React.useEffect(() => {
    console.log(`[Navigation] Active Tab changed to: ${activeTab}`);
    
    // Check if localStorage is working
    try {
      localStorage.setItem('test_storage', 'ok');
      const test = localStorage.getItem('test_storage');
      if (test !== 'ok') console.error('[Storage] LocalStorage check failed');
      localStorage.removeItem('test_storage');
    } catch (e) {
      console.error('[Storage] LocalStorage is not available:', e);
    }
  }, [activeTab]);

  if (!splashDone || isLoading) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (!isAuthenticated) {
    if (showLogin) {
      return <Login onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard': return <Dashboard />;
        case 'habits': return <HabitGrid />;
        case 'tasks': return <TaskBoard />;
        case 'ai': return <AIInterface />;
        case 'settings': return <Settings />;
        case 'admin': return <Admin />;
        default: return <Dashboard />;
      }
    } catch (error) {
      console.error('[Navigation] Error rendering tab:', error);
      return (
        <div className="h-full flex items-center justify-center p-8 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-4">Failed to load the {activeTab} tab.</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={cn(
      "flex h-screen bg-[#F5F5F5] dark:bg-[#0A0A0A] font-sans selection:bg-emerald-500/30 overflow-hidden transition-colors duration-300",
      theme === 'dark' ? 'dark' : ''
    )}>
      {/* Onboarding */}
      <AnimatePresence>
        {!onboardingDone && (
          <Onboarding
            userName={userProfile?.name || ''}
            onComplete={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }} 
        />
      </div>

      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#141414] border-b border-black/5 dark:border-white/5 z-30 transition-colors">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="font-bold tracking-tighter text-lg dark:text-white">ELEVATE</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-emerald-500 transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors dark:text-white"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
