import { ChatMessage, WorkspaceData } from "../types";

// ─── VERIFIED LIVE GROQ MODELS ───────────────────────────────
export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",                       name: "Llama 3.3 70B",    speed: "Fast"    },
  { id: "llama-3.1-8b-instant",                          name: "Llama 3.1 8B",     speed: "Instant" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct",     name: "Llama 4 Scout",    speed: "Fast"    },
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", speed: "Fast"    },
  { id: "openai/gpt-oss-120b",                           name: "GPT OSS 120B",     speed: "Fast"    },
  { id: "openai/gpt-oss-20b",                            name: "GPT OSS 20B",      speed: "Instant" },
];

// ─── AUDIO STATE ─────────────────────────────────────────────
let _currentAudio: HTMLAudioElement | null = null;

export function stopSpeech() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.src = "";
    _currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch {}
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

function cleanForTTS(text: string, limit = 1000): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/[>#_~[\](){}|]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, limit);
}

export async function groqTTS(text: string, apiKey: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_TTS_MODEL,
        input: cleanForTTS(text, 1000),
        voice: "Celeste-PlayAI",
        response_format: "wav",
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch { return null; }
}

// ─── ELEVENLABS VOICES ───────────────────────────────────────
export const ELEVEN_VOICES = [
  { id: "UmQN7jS1Ee8B1czsUtQh", name: "Theo",   desc: "Male · Deep · Confident",  emoji: "🧔" },
  { id: "19STyYD15bswVz51nqLf", name: "Samara", desc: "Female · Warm · Natural",   emoji: "👩" },
  { id: "nDJIICjR9zfJExIFeSCN", name: "Emma",   desc: "Female · Clear · Friendly", emoji: "👱‍♀️" },
];
export const DEFAULT_ELEVEN_VOICE = ELEVEN_VOICES[0].id;

// Returns true if success, false if failed
async function tryElevenLabs(text: string, apiKey: string, voiceId: string, onEnd: () => void): Promise<boolean> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanForTTS(text, 1500),
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      console.warn("ElevenLabs HTTP error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100) return false; // empty response

    stopSpeech();
    const blob = new Blob([buf], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); _currentAudio = null; onEnd(); };
    audio.onerror = () => { URL.revokeObjectURL(url); _currentAudio = null; onEnd(); };
    try { await audio.play(); return true; } catch { return false; }
  } catch (e) {
    console.warn("ElevenLabs fetch failed:", e);
    return false;
  }
}

// ─── BROWSER TTS with mobile keepalive ───────────────────────
export function speakBrowser(text: string, voiceName?: string, onStop?: () => void): () => void {
  try { window.speechSynthesis.cancel(); } catch {}

  const clean = cleanForTTS(text, 5000); // no limit for browser TTS

  // Split into small chunks at sentence boundaries
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > 120) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = s;
    } else { cur += s; }
  }
  if (cur.trim()) chunks.push(cur.trim());

  let idx = 0;
  let stopped = false;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stopAll = () => {
    stopped = true;
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    try { window.speechSynthesis.cancel(); } catch {}
  };

  // Keepalive: Brave/mobile Chrome kills TTS after 15s — pause/resume every 8s resets timer
  const startKeepAlive = () => {
    keepAliveTimer = setInterval(() => {
      if (!stopped && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 8000);
  };

  const speakChunk = () => {
    if (stopped || idx >= chunks.length) {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (!stopped) onStop?.();
      return;
    }
    const utt = new SpeechSynthesisUtterance(chunks[idx++]);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name === voiceName)
      || voices.find(v => v.name.includes("Google") && v.lang === "en-US")
      || voices.find(v => v.lang === "en-US" && !v.name.toLowerCase().includes("compact"))
      || voices.find(v => v.lang.startsWith("en"));
    if (v) utt.voice = v;
    utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 1.0;
    utt.onend = speakChunk;
    utt.onerror = (e) => { if (!stopped && e.error !== "interrupted") speakChunk(); };
    try { window.speechSynthesis.speak(utt); } catch {}
  };

  const start = () => {
    idx = 0; stopped = false;
    startKeepAlive();
    speakChunk();
  };

  if (window.speechSynthesis.getVoices().length > 0) start();
  else window.speechSynthesis.onvoiceschanged = start;

  return stopAll;
}

// ─── MAIN SPEAK FUNCTION ─────────────────────────────────────
// Order: ElevenLabs → Groq TTS → Gemini → Browser
export async function speakText(
  text: string,
  data: WorkspaceData,
  onStop?: () => void
): Promise<() => void> {
  const elevenKey   = (data.settings as any).elevenLabsKey?.trim();
  const elevenVoice = (data.settings as any).elevenLabsVoiceId || DEFAULT_ELEVEN_VOICE;
  const groqKey     = data.settings.groqKey?.trim();
  const geminiKey   = data.settings.geminiKey?.trim();

  // 1. ElevenLabs — real human voice, instant
  if (elevenKey) {
    const ok = await tryElevenLabs(text, elevenKey, elevenVoice, () => onStop?.());
    if (ok) return () => stopSpeech();
    // ElevenLabs failed — fall through to browser
    console.warn("ElevenLabs failed, falling back to browser TTS");
  }

  // 2. Groq PlayAI TTS
  if (groqKey) {
    const buffer = await groqTTS(text, groqKey);
    if (buffer) {
      playAudioBuffer(buffer).then(() => onStop?.());
      return () => stopSpeech();
    }
  }

  // 3. Gemini TTS
  if (geminiKey) {
    try {
      const { generateSpeech, playBase64PCM, stopCurrentAudio } = await import("./gemini");
      const base64 = await generateSpeech(text, data);
      if (base64) {
        playBase64PCM(base64).then(() => onStop?.());
        return () => stopCurrentAudio();
      }
    } catch {}
  }

  // 4. Browser TTS — always works
  return speakBrowser(text, data.settings.ai?.voice?.selected, onStop);
}

// ─── CHAT WITH GROQ ──────────────────────────────────────────
export async function chatWithGroq(
  messages: ChatMessage[],
  data: WorkspaceData,
  modelId: string,
  onTaskAction?: (action: any) => void
): Promise<{ text: string }> {
  const apiKey = data.settings.groqKey?.trim();
  if (!apiKey) throw new Error("No Groq API key. Get free at console.groq.com → Settings → Integrations.");

  const injectedPrompt = (data as any)._systemPrompt;
  const persona        = data.settings.ai.identity;
  const profile        = data.settings.profile;
  const activeTasks    = data.tasks.filter(t => !t.completed).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const completedTasks = data.tasks.filter(t => t.completed).slice(-5).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const habitList      = data.habits.map(h => `- [HABIT:${h.id}] ${h.name}`).join("\n") || "None";

  const systemPrompt = injectedPrompt || buildDefaultPrompt(persona, profile, activeTasks, completedTasks, habitList);
  const needsReasoning = modelId.includes("gpt-oss");
  const trimmed = messages.slice(-8);

  const body: any = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmed.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.substring(0, 2000),
      })),
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
    if (response.status === 429) throw new Error("Rate limit hit. Switch model or wait ~1 min. Use Auto mode.");
    if (msg?.includes("decommissioned") || msg?.includes("does not exist") || msg?.includes("removed"))
      throw new Error("This model was removed. Select Llama 3.3 70B.");
    if (msg?.includes("too large") || msg?.includes("TPM"))
      throw new Error("Message too long. Switch to Llama 3.3 70B or clear chat.");
    throw new Error(`Groq: ${msg}`);
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

Active tasks:\n${activeTasks}
Completed:\n${completedTasks}
Habits:\n${habitList}

HOW TO THINK:
- Read between the lines. Understand what they ACTUALLY mean.
- Be proportional: short = short, complex = thorough.
- Have real opinions. Give direct answers.
- Never say "Certainly!", "Great question!", "As an AI".
- Never guess facts — say you're unsure if unsure.

Task/habit management — append silent JSON at end:
{"action":"task_create","text":"description"}
{"action":"task_toggle","taskId":"ID"}
{"action":"task_delete","taskId":"ID"}
{"action":"habit_create","name":"name"}
{"action":"habit_log","habitId":"ID"}
{"action":"habit_delete","habitId":"ID"}`;
}
