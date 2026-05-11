import React, { useState, createContext, useContext } from "react";
import { StoreProvider, useStore } from "./store/useStore";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Habits } from "./components/Habits";
import { Tasks } from "./components/Tasks";
import { AIIntelligence } from "./components/AIIntelligence";
import { Practice } from "./components/Practice";
import { Settings } from "./components/Settings";
import { Admin } from "./components/Admin";
import { Auth } from "./components/Auth";
import { IntroVideo } from "./components/IntroVideo";
import { GraduationCap, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// ─── NAVIGATION CONTEXT ───────────────────────────────────────
interface NavCtx {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  practiceQuizTopic: string | null;
  setPracticeQuizTopic: (topic: string | null) => void;
}
export const NavContext = createContext<NavCtx>({
  activeTab: "Dashboard",
  setActiveTab: () => {},
  practiceQuizTopic: null,
  setPracticeQuizTopic: () => {},
});
export const useNav = () => useContext(NavContext);

const ViewContainer: React.FC = () => {
  const { user, loading, data, updateData } = useStore();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showExamAlert, setShowExamAlert] = useState(false);
  const [practiceQuizTopic, setPracticeQuizTopic] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(() =>
    sessionStorage.getItem("elevate_intro_done") === "true"
  );

  const handleIntroComplete = () => {
    sessionStorage.setItem("elevate_intro_done", "true");
    setIntroDone(true);
  };

  React.useEffect(() => {
    if (data.practiceQueue?.length > 0 && activeTab !== "Practice") {
      setShowExamAlert(true);
    } else {
      setShowExamAlert(false);
    }
  }, [data.practiceQueue, activeTab]);

  if (!introDone) return <IntroVideo onComplete={handleIntroComplete} />;

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)]">
            <span className="text-white font-black text-3xl italic">E</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-blue-400 font-black text-xs uppercase tracking-widest">Loading your workspace</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <NavContext.Provider value={{ activeTab, setActiveTab, practiceQuizTopic, setPracticeQuizTopic }}>
      <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-900 relative">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <AnimatePresence>
          {showExamAlert && (
            <motion.div
              initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 shrink-0">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">Exam Time!</h3>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-40">Verification Required</p>
              </div>
              <button onClick={() => { setActiveTab("Practice"); setShowExamAlert(false); }}
                className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all ml-4">
                Start Now <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => setShowExamAlert(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors ml-2">
                <X className="w-5 h-5 opacity-40" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main className={cn("flex-1 overflow-y-auto overflow-x-hidden transition-all duration-500",
          activeTab === "AI" ? "p-0" : "p-4 md:p-8")}>
          {activeTab === "Dashboard" && <Dashboard />}
          {activeTab === "Habits"    && <Habits />}
          {activeTab === "Tasks"     && <Tasks />}
          {activeTab === "AI"        && <AIIntelligence />}
          {activeTab === "Practice"  && <Practice />}
          {activeTab === "Settings"  && <Settings />}
          {activeTab === "Admin"     && <Admin />}
        </main>
      </div>
    </NavContext.Provider>
  );
};

export default function App() {
  return <StoreProvider><ViewContainer /></StoreProvider>;
}
