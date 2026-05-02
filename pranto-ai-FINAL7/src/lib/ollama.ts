import { ChatMessage, WorkspaceData } from "../types";

//  OLLAMA CONNECTION CHECKER 
// Returns true if Ollama is reachable, false otherwise
export async function checkOllamaConnection(url: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map((m: any) => m.name || m.model || "");
    return { ok: true, models };
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return { ok: false, models: [], error: "Connection timeout  is Ollama running?" };
    }
    if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
      return { ok: false, models: [], error: "Cannot reach Ollama. Check CORS settings (see below)." };
    }
    return { ok: false, models: [], error: err.message || "Unknown error" };
  }
}

//  CHAT WITH OLLAMA 
export async function chatWithOllama(
  messages: ChatMessage[],
  data: WorkspaceData,
  onStream?: (text: string) => void
): Promise<{ text: string; usage?: { promptTokens: number; candidatesTokens: number; totalTokens: number } }> {
  const ollamaUrl = (data.settings.ollamaUrl || "http://localhost:11434").replace(/\/$/, "");
  const ollamaModel = data.settings.ollamaModel || "llama3";
  const persona = data.settings.ai.identity;
  const user = data.settings.profile;

  const systemPrompt = `You are ${persona.name}, the user's personal ${persona.persona}.
Behavior: ${persona.behavior}
User: ${user.name || "friend"}. About: ${user.about || ""}. Goals: ${user.goals || ""}.
Active tasks: ${JSON.stringify(data.tasks.filter(t => !t.completed).map(t => ({ id: t.id, text: t.text })))}

RULES:
- Never say you are an AI. Be the persona fully.
- Speak naturally, address user by name.
- If user asks to add/delete/complete a task, append a JSON block on a NEW LINE at the end:
  {"action": "create", "text": "task name"}
  {"action": "delete", "taskId": "id"}
  {"action": "toggle", "taskId": "id"}`;

  // First verify connection
  const check = await checkOllamaConnection(ollamaUrl);
  if (!check.ok) {
    throw new Error(`Ollama offline: ${check.error}\n\nFix: Run this in your terminal:\nOLLAMA_ORIGINS="${window.location.origin}" ollama serve`);
  }

  // Check if requested model exists
  if (check.models.length > 0 && !check.models.some(m => m.startsWith(ollamaModel.split(":")[0]))) {
    throw new Error(`Model "${ollamaModel}" not found in Ollama.\nAvailable: ${check.models.join(", ")}\n\nRun: ollama pull ${ollamaModel}`);
  }

  const body = JSON.stringify({
    model: ollamaModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    stream: !!onStream,
    options: {
      temperature: 0.85,
      num_predict: 1024,
    },
  });

  let response: Response;
  try {
    response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(60000),
    });
  } catch (err: any) {
    throw new Error(`Ollama request failed: ${err.message}\n\nMake sure Ollama is running with CORS allowed:\nOLLAMA_ORIGINS="${window.location.origin}" ollama serve`);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Ollama error ${response.status}: ${errText || response.statusText}`);
  }

  // Streaming mode
  if (onStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const chunk = json.message?.content || "";
          fullText += chunk;
          onStream(chunk);
        } catch {}
      }
    }
    return { text: fullText };
  }

  // Non-streaming mode
  const json = await response.json();
  return {
    text: json.message?.content || "",
    usage: {
      promptTokens: json.prompt_eval_count || 0,
      candidatesTokens: json.eval_count || 0,
      totalTokens: (json.prompt_eval_count || 0) + (json.eval_count || 0),
    },
  };
}
