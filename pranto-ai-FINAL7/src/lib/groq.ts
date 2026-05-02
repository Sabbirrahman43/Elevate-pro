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

//  SPEAK: Groq TTS first (real voice), browser fallback 
export async function speakText(
  text: string,
  data: WorkspaceData,
  onStop?: () => void
): Promise<() => void> {
  const groqKey = data.settings.groqKey;
  const clean = text.replace(/[#*`_~[\]()>{}]/g, "").replace(/\n+/g, " ").substring(0, 500);

  // 1. Try Groq Orpheus TTS (best quality, works everywhere)
  if (groqKey) {
    const buffer = await groqTTS(clean, groqKey);
    if (buffer) {
      playAudioBuffer(buffer).then(() => onStop?.());
      return () => stopSpeech();
    }
  }

  // 2. Try Gemini TTS (if key available)
  const geminiKey = data.settings.geminiKey;
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

  // 3. Browser speech  instant fallback
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
  if (!apiKey) throw new Error("No Groq API key. Get a free key at console.groq.com  Add it in Settings  Integrations.");

  const persona = data.settings.ai.identity;
  const profile = data.settings.profile;
  const activeTasks = data.tasks.filter(t => !t.completed).map(t => `- [${t.id}] ${t.text}`).join("\n") || "None";
  const habitList = data.habits.map(h => `- ${h.name}`).join("\n") || "None";

  const modeInstructions: Record<string, string> = {
    Chat:     "Be warm, conversational, emotionally present. Like a real person who deeply cares.",
    Research: "Be thorough and analytical. Use headers and bullet points. Never guess. Cite reasoning.",
    Support:  "Listen first. Validate feelings before advising. Empathize fully. Be gentle.",
    Planner:  "Create structured plans with numbered steps, timelines, and tables. Be ruthlessly practical. Use markdown tables when comparing options.",
    Learner:  "You are a teacher. Explain clearly with examples. Break concepts down. Ask questions to verify understanding.",
  };
  const modeKey = (data as any)._mode || "Chat";
  const modeInst = modeInstructions[modeKey] || modeInstructions.Chat;

  const systemPrompt = `IDENTITY: You are ${persona.name}.
PERSONA: ${persona.persona}. ${persona.behavior}

STRICT RULES:
- ALWAYS address the user as ${profile.name || "friend"}.
- NEVER say "As an AI" or break character. You ARE ${persona.name}, not an AI playing a role.
- Use markdown formatting: **bold** for emphasis, bullet points for lists, tables for comparisons.
- Be specific. Reference their actual goals and tasks. No generic advice.
- Keep responses focused and well-structured. No walls of text.

USER PROFILE:
Name: ${profile.name || "not set"}
DOB: ${profile.dob || "not set"}
About: ${profile.about || "not set"}
Goals: ${profile.goals || "not set"}

TODAY: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
ACTIVE TASKS:
${activeTasks}
HABITS:
${habitList}

MODE: ${modeKey.toUpperCase()}
${modeInst}

For task management, append JSON on a new line:
{"action": "create", "text": "task name"}
{"action": "toggle", "taskId": "ID"}
{"action": "delete", "taskId": "ID"}`;

  // GPT OSS models need reasoning_format hidden for tool use
  const isReasoning = modelId.includes("gpt-oss") || modelId.includes("qwen3");
  const body: any = {
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    max_tokens: 1024,
    temperature: 0.85,
  };
  if (isReasoning) body.reasoning_format = "hidden";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || response.statusText;
    if (response.status === 401) throw new Error("Invalid Groq API key. Check Settings  Integrations.");
    if (response.status === 429) throw new Error("Groq rate limit. Wait a moment and try again.");
    if (msg?.includes("decommissioned")) throw new Error(`Model ${modelId} was removed by Groq. Please select a different model.`);
    throw new Error(`Groq error: ${msg}`);
  }

  const json = await response.json();
  let text = json.choices?.[0]?.message?.content || "";

  if (onTaskAction) {
    const taskRegex = /\{[^{}]*"action"\s*:\s*"(create|delete|toggle)"[^{}]*\}/g;
    const matches = text.match(taskRegex) || [];
    matches.forEach(block => { try { onTaskAction(JSON.parse(block)); } catch {} });
    text = text.replace(taskRegex, "").trim();
  }

  return { text };
}
