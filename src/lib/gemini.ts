import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ChatMessage, WorkspaceData } from "../types";

// ── VERIFIED LIVE MODEL IDs (April 2026) ──────────────────────────────
// gemini-2.5-flash        → stable, fast, free tier friendly ✅
// gemini-2.5-flash-lite   → stable GA, cheapest ✅
// gemini-2.5-pro          → stable, most capable ✅
// gemini-2.5-flash-preview-tts → TTS only ✅
// NOTE: gemini-2.5-flash-lite-preview-06-17 is DEAD → use gemini-2.5-flash-lite

// ── SINGLETON AUDIO (one audio at a time, stoppable) ─────────────────
let _audioCtx: AudioContext | null = null;
let _audioSource: AudioBufferSourceNode | null = null;
let _isPlaying = false;

export function isAudioPlaying() { return _isPlaying; }

export function stopCurrentAudio() {
  _isPlaying = false;
  try { _audioSource?.stop(); } catch {}
  _audioSource = null;
  try { if (_audioCtx && _audioCtx.state !== "closed") _audioCtx.close(); } catch {}
  _audioCtx = null;
  window.speechSynthesis?.cancel();
}

export async function playBase64PCM(base64: string): Promise<void> {
  stopCurrentAudio();
  _isPlaying = true;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const numSamples = Math.floor(bytes.length / 2);
    const buffer = _audioCtx.createBuffer(1, numSamples, 24000);
    const ch = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < numSamples; i++) ch[i] = view.getInt16(i * 2, true) / 32768.0;
    _audioSource = _audioCtx.createBufferSource();
    _audioSource.buffer = buffer;
    _audioSource.connect(_audioCtx.destination);
    _audioSource.start();
    return new Promise((res) => {
      _audioSource!.onended = () => { _isPlaying = false; res(); };
    });
  } catch (e) {
    _isPlaying = false;
    throw e;
  }
}

// ── TTS ────────────────────────────────────────────────────────────────
export async function generateSpeech(text: string, data: WorkspaceData): Promise<string | null> {
  const apiKey = data.settings.geminiKey;
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const voiceName = data.settings.ai.voice.selected || "Kore";
  const clean = text.replace(/[#*`_~[\]()>]/g, "").replace(/\n+/g, " ").substring(0, 500);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: clean }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName as any } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
  } catch (err: any) {
    console.error("TTS error:", err.message);
    return null;
  }
}

// ── CHAT ───────────────────────────────────────────────────────────────
export async function chatWithGemini(
  messages: ChatMessage[],
  data: WorkspaceData,
  modelName: string,
  onStream?: (text: string) => void,
  onTaskAction?: (action: any) => void,
  imageData?: { base64: string; mimeType: string }
) {
  const apiKey = data.settings.geminiKey;
  if (!apiKey) throw new Error("No Gemini API key — go to Settings → Integrations and add your key.");

  const ai = new GoogleGenAI({ apiKey });
  const persona = data.settings.ai.identity;
  const profile = data.settings.profile;
  const activeTasks = data.tasks.filter(t => !t.completed).map(t => `- ${t.text}`).join("\n") || "None";
  const finishedCount = data.tasks.filter(t => t.completed).length;
  const habitList = data.habits.map(h => `- ${h.name}`).join("\n") || "None";

  // ── REAL MODEL IDs only ─────────────────────────────────────────────
  const MODELS: Record<string, string> = {
    "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",   // GA stable ✅
    "gemini-2.5-flash":      "gemini-2.5-flash",          // GA stable ✅
    "gemini-2.5-pro":        "gemini-2.5-pro",            // GA stable ✅
  };
  const resolvedModel = MODELS[modelName] ?? "gemini-2.5-flash";

  const systemPrompt = `You are ${persona.name}, the user's personal ${persona.persona}.
Behavior: ${persona.behavior}
User: ${profile.name || "friend"}. Goals: ${profile.goals || "not set"}. About: ${profile.about || "not set"}.
Active tasks:\n${activeTasks}
Completed today: ${finishedCount}. Habits:\n${habitList}
Today: ${new Date().toLocaleDateString()}.
RULES: Never say you are an AI. Be the persona fully. Speak naturally. Address user by name.`;

  const contents: any[] = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (imageData && contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts.push({ inlineData: { data: imageData.base64, mimeType: imageData.mimeType } });
  }

  try {
    const response = await ai.models.generateContent({
      model: resolvedModel,
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{
          functionDeclarations: [{
            name: "manageTasks",
            description: "Create, delete, or toggle a user task.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, enum: ["create", "delete", "toggle"] },
                text: { type: Type.STRING },
                taskId: { type: Type.STRING },
              },
              required: ["action"],
            },
          }],
        }],
      },
    });

    const calls = response.functionCalls;
    if (calls && onTaskAction) calls.forEach(fc => onTaskAction(fc.args));
    const text = response.text || (calls?.length ? "Done!" : "");
    if (onStream && text) onStream(text);
    return {
      text,
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        candidatesTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined,
    };
  } catch (error: any) {
    const msg = error?.message || "";
    // Quota hit → fall back to flash (not lite, not pro)
    if ((msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) && resolvedModel !== "gemini-2.5-flash") {
      const r2 = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: { systemInstruction: systemPrompt },
      });
      const t2 = r2.text || "";
      if (onStream && t2) onStream(t2);
      return { text: t2 };
    }
    // Surface a clean message, not raw JSON
    if (msg.includes("NOT_FOUND") || msg.includes("404")) {
      throw new Error(`Model "${resolvedModel}" not available. Try Gemini Flash instead.`);
    }
    if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      throw new Error("Invalid API key. Check Settings → Integrations.");
    }
    if (msg.includes("429") || msg.includes("quota")) {
      throw new Error("Rate limit reached. Wait a moment and try again, or switch to a different model.");
    }
    throw new Error(error.message || "Gemini request failed.");
  }
}

// ── IMAGE GEN ──────────────────────────────────────────────────────────
export async function generateImageGemini(prompt: string, data: WorkspaceData): Promise<string | null> {
  const apiKey = data.settings.geminiKey;
  if (!apiKey) throw new Error("No Gemini API key.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: ["TEXT", "IMAGE"] as any },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if ((part as any).inlineData) return "data:image/png;base64," + (part as any).inlineData.data;
    }
    return null;
  } catch (err: any) {
    throw new Error(err.message || "Image generation failed.");
  }
}
