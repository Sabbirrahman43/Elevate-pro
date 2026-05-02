import React, { createContext, useContext, useEffect, useState } from "react";
import { WorkspaceData, Task, ChatMessage } from "../types";
import { supabase } from "../lib/supabase";
import { getTodayDate } from "../lib/utils";

interface StoreContextType {
  data: WorkspaceData;
  user: any;
  loading: boolean;
  updateData: (newData: Partial<WorkspaceData>) => void;
  syncToCloud: () => Promise<void>;
  signOut: () => Promise<void>;
  hardReset: () => Promise<void>;
}

const DEFAULT_DATA: WorkspaceData = {
  tasks: [],
  habits: [],
  notes: [],
  messages: [],
  practiceQueue: [],
  history: [],
  stats: {
    totalSessions: 0,
    focusTime: 0,
    dailyMarks: 0,
    tokensUsed: 0,
    lastTokenReset: Date.now(),
    quotaLimit: 1000000,
  },
  offDays: ["Sat", "Sun"],
  settings: {
    geminiKey: "",
    groqKey: "",
    selectedModelId: "llama-3.3-70b-versatile",
    profile: { name: "", dob: "", about: "", goals: "" },
    ai: {
      identity: {
        name: "Sara",
        persona: "Coach",
        behavior: "Motivating, direct, and encouraging. Push the user to be their best.",
      },
      voice: { selected: "Kore", autoplay: true },
    },
  },
  lastSync: 0,
  hasCompletedOnboarding: false,
  hasDismissedBulletin: false,
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<WorkspaceData>(() => {
    try {
      const saved = localStorage.getItem("pranto_ai_data");
      if (!saved) return DEFAULT_DATA;
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle missing keys from old versions
      return {
        ...DEFAULT_DATA,
        ...parsed,
        settings: {
          ...DEFAULT_DATA.settings,
          ...parsed.settings,
          ai: {
            ...DEFAULT_DATA.settings.ai,
            ...(parsed.settings?.ai || {}),
            identity: {
              ...DEFAULT_DATA.settings.ai.identity,
              ...(parsed.settings?.ai?.identity || {}),
            },
            voice: {
              ...DEFAULT_DATA.settings.ai.voice,
              ...(parsed.settings?.ai?.voice || {}),
            },
          },
          profile: {
            ...DEFAULT_DATA.settings.profile,
            ...(parsed.settings?.profile || {}),
          },
        },
        stats: { ...DEFAULT_DATA.stats, ...(parsed.stats || {}) },
      };
    } catch {
      return DEFAULT_DATA;
    }
  });

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem("pranto_ai_data", JSON.stringify(data));
  }, [data]);

  // Auth init
  useEffect(() => {
    const init = async () => {
      // Guest mode
      if (localStorage.getItem("pranto_ai_guest") === "true") {
        setUser({ id: "guest", email: "guest@local", isGuest: true });
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: cloudData, error } = await supabase
            .from("user_data")
            .select("data")
            .eq("id", session.user.id)
            .single();

          if (cloudData && !error) {
            const remote = cloudData.data as WorkspaceData;
            if (remote.lastSync > data.lastSync) {
              setData(prev => ({
                ...DEFAULT_DATA,
                ...remote,
                settings: {
                  ...DEFAULT_DATA.settings,
                  ...remote.settings,
                  ai: {
                    ...DEFAULT_DATA.settings.ai,
                    ...(remote.settings?.ai || {}),
                  },
                },
              }));
            }
          } else if (error?.code === "PGRST116") {
            // New user — welcome message
            const welcome: ChatMessage = {
              id: "welcome",
              role: "assistant",
              content: `Welcome! I'm ${data.settings.ai.identity.name}, your ${data.settings.ai.identity.persona}. Let's set some goals and get to work!`,
              timestamp: Date.now(),
              model: data.settings.ai.identity.name,
            };
            setData(prev => ({
              ...prev,
              messages: [welcome],
              tasks: [
                {
                  id: "onboard-1",
                  text: "Set up your profile in Settings",
                  completed: false,
                  date: getTodayDate(),
                  createdAt: Date.now(),
                },
                {
                  id: "onboard-2",
                  text: "Add your Groq API key (free) in Settings → Integrations",
                  completed: false,
                  date: getTodayDate(),
                  createdAt: Date.now(),
                },
              ],
              hasCompletedOnboarding: true,
            }));
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (localStorage.getItem("pranto_ai_guest") === "true") return;

      const u = session?.user ?? null;
      setUser(u);

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && u) {
        const { data: cloudData, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("id", u.id)
          .single();

        if (cloudData && !error) {
          const remote = cloudData.data as WorkspaceData;
          setData(prev => remote.lastSync > prev.lastSync ? { ...DEFAULT_DATA, ...remote } : prev);
        }
        setLoading(false);
      }

      if (event === "SIGNED_OUT") setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Daily token reset
  useEffect(() => {
    const last = data.stats.lastTokenReset || 0;
    if (Date.now() - last > 86400000) {
      setData(prev => ({
        ...prev,
        stats: { ...prev.stats, tokensUsed: 0, lastTokenReset: Date.now() },
      }));
    }
  }, []);

  const updateData = (newData: Partial<WorkspaceData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const syncToCloud = async () => {
    if (!user || user.isGuest) return;
    const payload = { ...data, lastSync: Date.now() };
    await supabase.from("user_data").upsert({
      id: user.id,
      data: payload,
      updated_at: new Date().toISOString(),
    });
    setData(payload);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("pranto_ai_guest");
    setUser(null);
  };

  const hardReset = async () => {
    if (user && !user.isGuest) {
      await supabase.from("user_data").delete().eq("id", user.id);
    }
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <StoreContext.Provider value={{ data, user, loading, updateData, syncToCloud, signOut, hardReset }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
};
