import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { WorkspaceData } from "../types";

const DEFAULT_DATA: WorkspaceData = {
  tasks: [], habits: [], notes: [], messages: [],
  offDays: ["Sat", "Sun"],
  practiceQueue: [],
  history: [],
  stats: { totalSessions: 0, focusTime: 0 },
  settings: {
    geminiKey: "",
    groqKey: "",
    profile: { name: "", dob: "", about: "", goals: "" },
    ai: {
      identity: { name: "Aria", persona: "Coach", behavior: "Motivating, warm, emotionally intelligent." },
      voice: { selected: "Kore", autoplay: true }
    },
    selectedModelId: "llama-3.3-70b-versatile",
  },
  lastSync: 0,
  hasCompletedOnboarding: false,
  hasDismissedBulletin: false,
};

interface StoreCtx {
  data: WorkspaceData;
  user: any;
  loading: boolean;
  updateData: (d: Partial<WorkspaceData>) => void;
  syncToCloud: () => Promise<void>;
  signOut: () => Promise<void>;
  hardReset: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | undefined>(undefined);
const LS = "elevate_data_v2";

const loadLocal = (): WorkspaceData => {
  try {
    const s = localStorage.getItem(LS);
    if (!s) return DEFAULT_DATA;
    const p = JSON.parse(s);
    return {
      ...DEFAULT_DATA,
      ...p,
      practiceQueue: p.practiceQueue || [],
      history: p.history || [],
      stats: { ...DEFAULT_DATA.stats, ...(p.stats || {}) },
      settings: {
        ...DEFAULT_DATA.settings,
        ...p.settings,
        ai: {
          ...DEFAULT_DATA.settings.ai,
          ...(p.settings?.ai || {}),
          identity: { ...DEFAULT_DATA.settings.ai.identity, ...(p.settings?.ai?.identity || {}) },
          voice: { ...DEFAULT_DATA.settings.ai.voice, ...(p.settings?.ai?.voice || {}) },
        }
      }
    };
  } catch {
    localStorage.removeItem(LS);
    return DEFAULT_DATA;
  }
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<WorkspaceData>(loadLocal);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(data)); } catch {}
  }, [data]);

  const loadCloud = useCallback(async (uid: string) => {
    try {
      const { data: cloud, error } = await supabase
        .from("user_data").select("data").eq("id", uid).single();
      if (!error && cloud?.data) {
        const remote = cloud.data as WorkspaceData;
        setData(prev => remote.lastSync > prev.lastSync
          ? { ...DEFAULT_DATA, ...remote, practiceQueue: remote.practiceQueue || [], history: remote.history || [] }
          : prev);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (localStorage.getItem("elevate_guest") === "true") {
      setUser({ id: "guest", email: "guest@local", isGuest: true });
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          await loadCloud(session.user.id);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      if (window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadCloud]);

  const updateData = useCallback((newData: Partial<WorkspaceData>) => {
    setData(prev => ({ ...prev, ...newData, lastSync: Date.now() }));
  }, []);

  const syncToCloud = useCallback(async () => {
    if (!user || user.isGuest) return;
    try {
      await supabase.from("user_data").upsert({
        id: user.id, data, updated_at: new Date().toISOString()
      });
    } catch {}
  }, [user, data]);

  useEffect(() => {
    if (!user || user.isGuest) return;
    const t = setInterval(syncToCloud, 30000);
    return () => clearInterval(t);
  }, [user, syncToCloud]);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch {}
    localStorage.removeItem("elevate_guest");
    localStorage.removeItem(LS);
    setUser(null);
    setData(DEFAULT_DATA);
  }, []);

  const hardReset = useCallback(async () => {
    if (!window.confirm("Reset ALL data?")) return;
    try { if (user && !user.isGuest) await supabase.from("user_data").delete().eq("id", user.id); } catch {}
    localStorage.removeItem(LS);
    setData(DEFAULT_DATA);
    try { await supabase.auth.signOut(); } catch {}
    window.location.reload();
  }, [user]);

  return (
    <Ctx.Provider value={{ data, user, loading, updateData, syncToCloud, signOut, hardReset }}>
      {children}
    </Ctx.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
