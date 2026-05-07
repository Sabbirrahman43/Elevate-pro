import { ChatMessage, WorkspaceData } from "../types";

//  VERIFIED LIVE GROQ MODELS (April 2026) 
// All production models  confirmed active on console.groq.com/docs/models
export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile",                   name: "Llama 3.3 70B",   desc: "Best quality  Free",       speed: "Fast"    },
  { id: "llama-3.1-8b-instant",                      name: "Llama 3.1 8B",    desc: "Fastest  Instant reply",   speed: "Instant" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout",   desc: "Latest Meta  Vision",      speed: "Fast"    },
  { id: "openai/gpt-oss-120b",                       name: "GPT OSS 120B",    desc: "Most powerful  Reasoning", speed: "Fast"    },
  { id: "openai/gpt-oss-20b",                        name: "GPT OSS 20B",     desc: "Fast reasoning  Smart",    speed: "Instant" },
  { id: "qwen/qwen3-32b",                            name: "Qwen 3 32B",      desc: "Reasoning  Multilingual",  speed: "Fast"    },
];

// ─── ELEVENLABS STREAMING TTS ────────────────────────────────
// Default backup voice IDs
export const ELEVEN_VOICES = {
  theo:   "UmQN7jS1Ee8B1czsUtQh",
  samara: "19STyYD15bswVz51nqLf",
  emma:   "nDJIICjR9zfJExIFeSCN",
};

export async function elevenLabsStream(
  text: string,
  apiKey: string,
  voiceId: string,
  onStart: () => void,
  onEnd: () => void
): Promise<() => void> {
  const clean = text.replace(/[#*`_~[\]()>{}]/g, "").replace(/\n+/g, " ").substring(0, 500);
  let stopped = false;
  let audioCtx: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_turbo_v2_5",   // fastest model
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 1.0 },
          output_format: "mp3_44100_128",
        }),
      }
    );

    if (!res.ok || !res.body) return () => {};

    // Stream: collect chunks and play as soon as enough arrives
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let started = false;

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done || stopped) break;
        chunks.push(value);
        totalBytes += value.length;

        // Start playing after ~32KB (about 0.5s of audio) — instant feel
        if (!started && totalBytes > 32_000) {
          started = true;
          const combined = new Uint8Array(totalBytes);
          let offset = 0;
          for (const c of chunks) { combined.set(c, offset); offset += c.length; }
          onStart();
          playMp3Blob(combined, () => onEnd());
        }
      }
      // If stream ended before 32KB threshold (short text) — play what we have
      if (!started && totalBytes > 0) {
        const combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const c of chunks) { combined.set(c, offset); offset += c.length; }
        onStart();
        playMp3Blob(combined, () => onEnd());
      }
    };
    pump().catch(() => onEnd());
  } catch {
    onEnd();
  }

  return () => { stopped = true; stopSpeech(); };
}

function playMp3Blob(data: Uint8Array, onEnd: () => void) {
  stopSpeech();
  const blob = new Blob([data], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  _currentAudio = audio;
  audio.onended = () => { URL.revokeObjectURL(url); _currentAudio = null; onEnd(); };
  audio.onerror = () => { URL.revokeObjectURL(url); _currentAudio = null; onEnd(); };
  audio.play().catch(() => onEnd());
}

// Groq TTS  Orpheus (real human-quality voice, works everywhere)
export const GROQ_TTS_MODEL = "canopylabs/orpheus-v1-english";
// Groq STT  Whisper Turbo (faster than browser speech recognition)
export const GROQ_STT_MODEL = "whisper-large-v3-turbo";

//  GROQ TTS  real voice, no robotic browser sound 
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
        voice: "jessica",     // natural English voice
        response_format: "wav",
      }),
    });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

// Play ArrayBuffer audio (WAV/MP3)
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

//  SPEAK: ElevenLabs streaming → Groq TTS → Gemini → Browser fallback
export async function speakText(
  text: string,
  data: WorkspaceData,
  onStop?: () => void
): Promise<() => void> {
  const clean = text.replace(/[#*`_~[\]()>{}]/g, "").replace(/\n+/g, " ").substring(0, 500);
  const elevenKey  = (data.settings as any).elevenLabsKey;
  const voiceId    = (data.settings as any).elevenLabsVoiceId || ELEVEN_VOICES.theo;
  const groqKey    = data.settings.groqKey;
  const geminiKey  = data.settings.geminiKey;

  // 1. ElevenLabs streaming — fastest, best quality, user's own key
  if (elevenKey) {
    return elevenLabsStream(clean, elevenKey, voiceId, () => {}, () => onStop?.());
  }

  // 2. Groq Orpheus TTS
  if (groqKey) {
    const buffer = await groqTTS(clean, groqKey);
    if (buffer) {
      playAudioBuffer(buffer).then(() => onStop?.());
      return () => stopSpeech();
    }
  }

  // 3. Gemini TTS
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

  // 4. Browser speech — always works, no keys needed
  return speakBrowser(clean, data.settings.ai.voice.selected, onStop);
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
    ut.rate = 1.05;
    ut.pitch = 1.0;
    ut.volume = 1.0;
    ut.onend = () => onStop?.();
    ut.onerror = () => onStop?.();
    window.speechSynthesis.speak(ut);
  };
  if (window.speechSynthesis.getVoices().length > 0) loadAndSpeak();
  else window.speechSynthesis.onvoiceschanged = () => loadAndSpeak();
  return () => window.speechSynthesis.cancel();
}

//  CHAT WITH GROQ 
export async function chatWithGroq(
  messages: ChatMessage[],
  data: WorkspaceData,
  modelId: string,
  onTaskAction?: (action: any) => void
): Promise<{ text: string }> {
  const apiKey = data.settings.groqKey;
  if (!apiKey) throw new Error("No Groq API key. Get a free key at console.groq.com → Add it in Settings → Integrations.");

  const persona = data.settings.ai.identity;
  const profile = data.settings.profile;

  // Use injected system prompt from AIIntelligence if available
  const injectedPrompt = (data as any)._systemPrompt;

  const activeTasks = data.tasks.filter(t => !t.completed).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const completedTasks = data.tasks.filter(t => t.completed).slice(-5).map(t => `- [TASK:${t.id}] ${t.text}`).join("\n") || "None";
  const habitList = data.habits.map(h => `- [HABIT:${h.id}] ${h.name}`).join("\n") || "None";
  const modeKey = (data as any)._mode || "Chat";

  const systemPrompt = injectedPrompt || `You are ${persona.name}, ${profile.name ? `${profile.name}'s` : "the user's"} ${persona.persona}.
${persona.behavior}

RIGHT NOW: ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}

USER PROFILE:
- Name: ${profile.name || "friend"}, DOB: ${profile.dob || "unknown"}
- Goals: ${profile.goals || "not set"}
- About: ${profile.about || "not set"}

THEIR DATA:
Active tasks:
${activeTasks}
Recently completed:
${completedTasks}
Habits (track daily):
${habitList}

HOW TO THINK:
- Read between the lines. Understand what they ACTUALLY mean.
- Be proportional: short question = short answer. Complex = thorough.
- Have real opinions. Don't just list pros and cons.
- Never say "Certainly!", "Great question!", "As an AI".
- Use their name occasionally, not every message.
- Match their energy.

YOU CAN MANAGE TASKS AND HABITS. When user asks, append silent JSON at end:

For tasks:
{"action":"task_create","text":"task description"}
{"action":"task_toggle","taskId":"TASK_ID_HERE"}
{"action":"task_delete","taskId":"TASK_ID_HERE"}

For habits:
{"action":"habit_create","name":"habit name"}
{"action":"habit_delete","habitId":"HABIT_ID_HERE"}
{"action":"habit_log","habitId":"HABIT_ID_HERE"}

IMPORTANT: Always use the exact IDs shown above (TASK:xxx or HABIT:xxx). Strip the TASK:/HABIT: prefix when using in JSON.
No explanation about the JSON. Just append it silently at end of message.`;

  // Models that need reasoning_format hidden
  const needsReasoning = modelId.includes("gpt-oss") || modelId.includes("qwen3") || modelId.includes("deepseek-r1");

  const body: any = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    max_tokens: 1024,
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
    if (response.status === 401) throw new Error("Invalid Groq API key. Check Settings → Integrations.");
    if (response.status === 429) {
      // Extract reset time if available
      const resetSecs = err?.error?.headers?.["x-ratelimit-reset-requests"] || "60";
      throw new Error(`Rate limit reached. Resets in ~${resetSecs}s. Switch to Auto mode or try another model.`);
    }
    if (msg?.includes("decommissioned") || msg?.includes("does not exist")) {
      throw new Error(`Model "${modelId}" is no longer available. Please select a different model.`);
    }
    throw new Error(`Groq error: ${msg}`);
  }

  const json = await response.json();
  let text = json.choices?.[0]?.message?.content || "";

  // Parse and handle ALL action types
  if (onTaskAction) {
    const actionRegex = /\{[^{}]*"action"\s*:\s*"(task_create|task_toggle|task_delete|habit_create|habit_delete|habit_log|create|toggle|delete)"[^{}]*\}/g;
    const matches = text.match(actionRegex) || [];
    matches.forEach(block => {
      try {
        const parsed = JSON.parse(block);
        // Normalize old action names
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
