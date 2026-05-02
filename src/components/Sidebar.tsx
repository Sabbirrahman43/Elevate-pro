import React from "react";
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Flame, 
  BrainCircuit, 
  GraduationCap, 
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { SidebarCanvas } from "./SidebarCanvas";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, signOut } = useStore();
  const [isOpen, setIsOpen] = React.useState(false);
  
  const isAdmin = user?.email === "prantorahman6900@gmail.com";

  const tabs = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Habits", icon: Flame },
    { name: "Tasks", icon: CheckCircle2 },
    { name: "AI", icon: BrainCircuit },
    { name: "Practice", icon: GraduationCap },
    { name: "Settings", icon: SettingsIcon },
  ];

  if (isAdmin) {
    tabs.push({ name: "Admin", icon: ShieldCheck });
  }

  const NavContent = () => (
    <div className="relative z-10 flex flex-col h-full bg-slate-950/20 backdrop-blur-3xl border-r border-white/5 p-8 transition-all group/nav">
      <div className="mb-14 flex items-center gap-4 relative group cursor-pointer">
        <div className="absolute -inset-4 bg-blue-600/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="w-12 h-12 bg-slate-900 border border-blue-500/30 rounded-2xl flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
          <BrainCircuit className="text-blue-400 w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Pranto AI</h1>
          <div className="flex items-center gap-1 mt-1">
             <div className="w-2 h-[2px] bg-blue-500" />
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural_Sync</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-3">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => {
              setActiveTab(tab.name);
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-5 px-6 py-4 rounded-[1.5rem] transition-all duration-300 group/btn relative overflow-hidden",
              activeTab === tab.name 
                ? "bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] border-t border-white/20" 
                : "text-slate-500 hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            {activeTab === tab.name && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-blue-600 z-0"
              />
            )}
            <div className={cn(
              "relative z-10 p-2 rounded-xl transition-all",
              activeTab === tab.name ? "bg-white/10" : "bg-slate-900 group-hover/btn:bg-slate-800"
            )}>
              <tab.icon className={cn("w-5 h-5", activeTab === tab.name ? "text-white" : "group-hover/btn:scale-110 group-hover/btn:text-blue-400 transition-all")} />
            </div>
            <span className="relative z-10 font-black text-xs uppercase tracking-[0.2em]">{tab.name}</span>
            {activeTab === tab.name && (
              <div className="absolute right-4 w-1 h-3 bg-white/40 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/5 space-y-6">
        <div className="px-6 py-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center gap-4 group/user">
           <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 font-black uppercase text-xs animate-pulse">
              {user?.email?.slice(0, 2).toUpperCase()}
           </div>
           <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">{user?.email?.split('@')[0]}</span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Operator // 01</span>
           </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 hover:bg-red-600/10 hover:text-red-500 transition-all duration-300 font-black text-[10px] uppercase tracking-[0.4em]"
        >
          <LogOut className="w-5 h-5" />
          <span>Terminate_Session</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-6 left-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-slate-900 text-white rounded-xl border border-white/10 shadow-2xl"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-slate-950 border-r border-white/5 overflow-hidden shadow-2xl"
          >
            <SidebarCanvas />
            <NavContent />
          </motion.div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 h-full relative overflow-hidden bg-slate-950 border-r border-white/5">
        <SidebarCanvas />
        <NavContent />
      </aside>
    </>
  );
};
