import React, { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { supabase } from "../lib/supabase";
import { ShieldAlert, Users, Database, Globe, Activity } from "lucide-react";
import { cn } from "../lib/utils";

export const Admin: React.FC = () => {
  const { user } = useStore();
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count, error } = await supabase
        .from("user_data")
        .select('*', { count: 'exact', head: true });
      
      if (!error) setDbStats({ userCount: count });
    };

    fetchStats();
  }, []);

  if (user?.email !== "prantorahman6900@gmail.com") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-gray-900">Access Restricted</h1>
        <p className="text-gray-500 font-bold mt-2">This channel is available for system administrators only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Authority</h1>
        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">Administrative oversight and global metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <Users className="w-10 h-10 text-blue-600 mb-4" />
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Users</p>
           <h3 className="text-4xl font-black text-gray-900 mt-1">{dbStats?.userCount || 0}</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <Database className="w-10 h-10 text-purple-600 mb-4" />
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Table</p>
           <h3 className="text-xl font-black text-gray-900 mt-1">user_data</h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <Globe className="w-10 h-10 text-green-600 mb-4" />
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">System Health</p>
           <h3 className="text-xl font-black text-gray-900 mt-1 flex items-center gap-2">
             Optimal
             <div className="w-2 h-2 rounded-full bg-green-500" />
           </h3>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
           <Activity className="w-10 h-10 text-orange-600 mb-4" />
           <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Memory Load</p>
           <h3 className="text-xl font-black text-gray-900 mt-1">Normal</h3>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100">
        <h3 className="text-2xl font-black text-gray-900 mb-6">Security Logs</h3>
        <div className="space-y-4">
          {[
            { tag: "AUTH", msg: "Admin session established from secure gateway", time: "Just now" },
            { tag: "SYNC", msg: "User 71A912 completed heavy data transmission", time: "12 mins ago" },
            { tag: "CORE", msg: "Gemini 3.1-Flash cycle maintenance complete", time: "1 hour ago" },
            { tag: "WARN", msg: "Failed OAuth attempt from unknown IP: 192.168.1.1", time: "3 hours ago" }
          ].map((log, i) => (
            <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
               <span className={cn(
                 "text-[10px] font-black px-3 py-1 rounded-full",
                 log.tag === "WARN" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
               )}>{log.tag}</span>
               <p className="flex-1 font-bold text-gray-700">{log.msg}</p>
               <span className="text-xs font-black text-gray-400 uppercase">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
