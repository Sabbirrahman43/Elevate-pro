import { ChatMessage, WorkspaceData } from "../types";

// ─── VERIFIED LIVE GROQ MODELS (May 2026) ────────────────────
export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",                   name: "Llama 3.3 70B",   desc: "Best quality · Free",       speed: "Fast"    },
  { id: "llama-3.1-8b-instant",                      name: "Llama 3.1 8B",    desc: "Fastest · Instant reply",   speed: "Instant" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout",   desc: "Latest Meta · Vision",      speed: "Fast"    },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", desc: "Vision · Powerful",    speed: "Fast"    },
  { id: "openai/gpt-oss-120b",                       name: "GPT OSS 120B",    desc: "Most powerful · Reasoning", speed: "Fast"    },
  { id: "openai/gpt-oss-20b",                        name: "GPT OSS 20B",     desc: "Fast reasoning · Smart",    speed: "Instant" },
];

// ─── AUDIO ───────────────────────────────────────────────────
let _currentAudio: HTMLAudioElement | null = null;

export function stopSpeech() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.src = "";
    _currentAudio = null;
  }
  window.speechSynthesis?.cancel();
}

export async function playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
  stopSpeech();
  const blob = new Blob([buffer], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  return new Promise((res) => {
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); _currentAudio = null; res(); };
    audio.onerror = () => { URL.revokeObjectURL(url); _currentAudio = null; res(); };
    audio.play().catch(() => res());
  });
}

// ─── GROQ TTS ────────────────────────────────────────────────
export const GROQ_TTS_MODEL = "playai-tts";
export const GROQ_STT_MODEL = "whisper-large-v3-turbo";

export async function groqTTS(text: string, apiKey: string): Promise<ArrayBuffer | null> {
  const clean = text.replace(/[#*`_~[\]()>{}]/g, "").replace(/\n+/g, " ").substring(0, 500);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_TTS_MODEL,
        input: clean,
        voice: "Celeste-PlayAI",
        response_format: "wav",
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

// ─── SPEAK: Groq TTS → Gemini → Browser ─────────────────────
export async function speakText(
  text: string,
  data: WorkspaceData,
  onStop?: () => void
): Promise<() => void> {
  const clean = text.replace(/[#*`_~[\]()>{}]/g, "").replace(/\n+/g, " ").substring(0, 500);
  const groqKey   = data.settings.groqKey;
  const geminiKey = data.settings.geminiKey;

  // 1. Groq PlayAI TTS — best free quality
  if (groqKey) {
    const buffer = await groqTTS(clean, groqKey);
    if (buffer) {
      playAudioBuffer(buffer).then(() => onStop?.());
      return () => stopSpeech();
    }
  }

  // 2. Gemini TTS
  if (geminiKey) {
    try {
      const { generateSpeech, playBase64PCM, stopCurrentAudio } = await import("./gemini");
      const base64 = await generateSpeech(clean, data);
      if (base64) {
        playBase64PCM(base64).then(() => onStop?.());
        return () => stopCurrentAudio();
      }
    } catch {}
  }

  // 3. Browser speech — always works
  return speakBrowser(clean, data.settings.ai.voice?.selected, onStop);
}

export function speakBrowser(text: string, voiceName?: string, onStop?: () => void): () => void {
  window.speechSynthesis.cancel();
  const loadAndSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const ut = new SpeechSynthesisUtterance(text.substring(0, 500));
    const preferred = voices.find(v => v.name === voiceName)
      || voices.find(v => v.name.includes("Google") && v.lang === "en-US")
      || voices.find(v => v.lang === "en-US" && !v.name.toLowerCase().includes("compact"))
      || voices.find(v => v.lang.startsWith("en"))
      || voices[0];
    if (preferred) ut.voice = preferred;
    ut.rate = 1.05; ut.pitch = 1.0; ut.volume = 1.0;
    ut.onend = () => onStop?.();
    ut.onerror = () => onStop?.();
    window.speechSynthesis.speak(ut);
  };
  if (window.speechSynthesis.getVoices().length > 0) loadAndSpeak();
  else window.speechSynthesis.onvoiceschanged = () => loadAndSpeak();
  return () => window.speechSynthesis.cancel();
}

// ─── CHAT WITH GROQ ──────────────────────────────────────────
export async function chatWithGroq(
  messages: ChatMessage[],
  data: WorkspaceData,
  modelId: string,
  onTaskAction?: (action: any) => void
): Promise<{ text: string }> {
  const apiKey = data.settings.groqKey;
  if (!apiKey) throw new Error("No Groq API key. Get free at console.groq.com → Settings → Integrations.");

  const injectedPrompt = (data as any)._systemPrompt;
  const persona  = data.settings.ai.identity;
  const profile  = data.settings.profile;
  const activeTasks    = data.tasks.filter(t => !t.completed).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const completedTasks = data.tasks.filter(t => t.completed).slice(-5).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const habitList      = data.habits.map(h => `- [HABIT:${h.id}] ${h.name}`).join("\n") || "None";

  const systemPrompt = injectedPrompt || buildDefaultPrompt(persona, profile, activeTasks, completedTasks, habitList);

  // Only models confirmed working on Groq May 2026
  const needsReasoning = modelId.includes("gpt-oss");

  // Trim messages to avoid TPM limits — keep last 8 messages max
  const trimmed = messages.slice(-8);

  const body: any = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmed.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.substring(0, 2000) })),
    ],
    max_tokens: 800,
    temperature: 0.85,
  };
  if (needsReasoning) body.reasoning_format = "hidden";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || response.statusText;
    if (response.status === 401) throw new Error("Invalid Groq key. Check Settings → Integrations.");
    if (response.status === 429) throw new Error("Token limit hit. Switch to a different model or wait ~1 minute. Tip: use Auto mode.");
    if (msg?.includes("decommissioned") || msg?.includes("does not exist") || msg?.includes("removed")) {
      throw new Error(`This model was removed by Groq. Please select Llama 3.3 70B or another model.`);
    }
    if (msg?.includes("too large") || msg?.includes("TPM")) {
      throw new Error("Message too long for this model. Switch to Llama 3.3 70B or clear the chat.");
    }
    throw new Error(`Groq error: ${msg}`);
  }

  const json = await response.json();
  let text = json.choices?.[0]?.message?.content || "";

  if (onTaskAction) {
    const actionRegex = /\{[^{}]*"action"\s*:\s*"(task_create|task_toggle|task_delete|habit_create|habit_delete|habit_log|create|toggle|delete)"[^{}]*\}/g;
    const matches = text.match(actionRegex) || [];
    matches.forEach(block => {
      try {
        const parsed = JSON.parse(block);
        if (parsed.action === "create") parsed.action = "task_create";
        if (parsed.action === "toggle") parsed.action = "task_toggle";
        if (parsed.action === "delete" && parsed.taskId) parsed.action = "task_delete";
        onTaskAction(parsed);
      } catch {}
    });
    text = text.replace(actionRegex, "").trim();
  }

  return { text };
}

function buildDefaultPrompt(persona: any, profile: any, activeTasks: string, completedTasks: string, habitList: string): string {
  return `You are ${persona.name}, ${profile.name ? `${profile.name}'s` : "the user's"} ${persona.persona}.
${persona.behavior}

RIGHT NOW: ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}

USER:
- Name: ${profile.name || "friend"}, DOB: ${profile.dob || "unknown"}
- Goals: ${profile.goals || "not set"}
- About: ${profile.about || "not set"}

Active tasks: ${activeTasks}
Completed: ${completedTasks}
Habits: ${habitList}

HOW TO THINK:
- Read between the lines. Understand what they ACTUALLY mean.
- Be proportional: short = short, complex = thorough.
- Have real opinions. Give direct answers.
- Never say "Certainly!", "Great question!", "As an AI".
- Never guess facts — say "I don't know" if unsure.

Task/habit management — append silent JSON at end:
{"action":"task_create","text":"description"}
{"action":"task_toggle","taskId":"ID"}
{"action":"task_delete","taskId":"ID"}
{"action":"habit_create","name":"name"}
{"action":"habit_log","habitId":"ID"}
{"action":"habit_delete","habitId":"ID"}`;
}
