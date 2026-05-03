import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { Send, Bot, User, Volume2, Mic, Brain, Trash2, Plus, Info, Heart, Edit2, RotateCcw, Search, Calendar, MessageCircle, Copy, Check, Paperclip, X, Loader2, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; };

const useTypewriter = (text: string, active: boolean, speed = 6) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed('');
    let i = 0;
    const t = setInterval(() => { i++; setDisplayed(text.slice(0, i)); if (i >= text.length) clearInterval(t); }, speed);
    return () => clearInterval(t);
  }, [text, active]);
  return displayed;
};

const TypewriterMessage = ({ content, isNew }: { content: string; isNew: boolean }) => {
  const displayed = useTypewriter(content, isNew);
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>
    </div>
  );
};

const GEMINI_MODELS = [
  { id: 'auto', name: 'Auto', desc: 'Auto-switches when limit hit' },
  { id: 'gemini-2.5-flash-lite', name: 'Flash 2.5 Lite', desc: 'Fastest, Low quota' },
  { id: 'gemini-2.5-flash', name: 'Flash 2.5', desc: 'Balanced - Recommended' },
  { id: 'gemini-3-flash-preview', name: 'Flash 3 Preview', desc: 'Newest Flash' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Flash 3.1 Lite', desc: 'Latest lite' },
  { id: 'gemini-2.5-pro-preview-03-25', name: 'Pro 2.5', desc: 'Powerful' },
  { id: 'gemini-3.1-pro-preview', name: 'Pro 3.1 Preview', desc: 'Smartest' },
];

const GROQ_MODELS = [
  { id: 'auto', name: 'Auto', desc: 'Auto-switches when limit hit' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 70B', desc: 'Recommended - Best balance' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', desc: 'Newest - Best quality' },
];

const ALL_GEMINI_IDS = GEMINI_MODELS.filter(m => m.id !== 'auto').map(m => m.id);
const ALL_GROQ_IDS = GROQ_MODELS.filter(m => m.id !== 'auto').map(m => m.id);

const VOICE_LENGTHS = [
  { id: 'short', label: 'Short', desc: '~40 words', chars: 200 },
  { id: 'medium', label: 'Medium', desc: '~120 words', chars: 600 },
  { id: 'full', label: 'Full', desc: 'No limit', chars: 999999 },
];

const MODES = [
  { id: 'chat', icon: MessageCircle, label: 'Chat' },
  { id: 'research', icon: Search, label: 'Research' },
  { id: 'supporter', icon: Heart, label: 'Support' },
  { id: 'planner', icon: Calendar, label: 'Planner' },
] as const;

export const AIInterface: React.FC = () => {
  const { habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, setChatHistory, clearChatHistory, addMemory, deleteMemory, updateAISettings, addTask, deleteTask, toggleTask, addHabit, deleteHabit, toggleHabitLog, incrementMessageCount } = useAppContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('elevate_autoplay') === 'true');
  const [voiceLength, setVoiceLength] = useState(() => localStorage.getItem('elevate_voice_len') || 'medium');
  const [bg, setBg] = useState<string | null>(() => localStorage.getItem('elevate_ai_bg') || null);
  const [bgType, setBgType] = useState<'image'|'video'>(() => (localStorage.getItem('elevate_ai_bg_type') as any) || 'image');
  const [latestAiId, setLatestAiId] = useState<string | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [isListening, setIsListening] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLiveModeRef = useRef(false);

  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const startLiveListening = () => {
    if (!recognitionRef.current || !isLiveModeRef.current) return;
    try {
      recognitionRef.current.start();
      setLiveListening(true);
    } catch {}
  };

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const setupRecognition = () => {
      const r = new SR();
      // Continuous mode for regular mic -- restarts automatically
      r.continuous = false;
      r.interimResults = false;
      r.lang = 'en-US';

      r.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setIsListening(false); setLiveListening(false);
        if (isLiveModeRef.current) { handleSend(transcript); }
        else { setInput(p => p + (p ? ' ' : '') + transcript); }
      };
      r.onerror = (e: any) => {
        setIsListening(false); setLiveListening(false);
        // Restart if in live mode and error is not fatal
        if (isLiveModeRef.current && e.error !== 'not-allowed') {
          setTimeout(() => startLiveListening(), 500);
        }
      };
      r.onend = () => {
        setIsListening(false); setLiveListening(false);
        // If regular mic was held (not live), auto restart not needed
      };
      return r;
    };

    recognitionRef.current = setupRecognition();
  }, []);

  useEffect(() => {
    // Only load once on mount -- don't re-run when settings change
    if (chatHistory.length > 0) {
      setMessages(chatHistory.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    } else {
      setMessages([{ id: 'welcome', role: 'assistant', content: `Hello! I'm **${aiSettings.name}**, your **${aiSettings.persona}**.\n\n- Add your API Key in **Settings** to start chatting\n- Fill in your Profile so I know your goals\n- Ask me to add habits or tasks\n- Use 🎙️ for voice, 📞 for live call\n\nHow can I help?`, timestamp: new Date() }]);
    }
  }, []); // Empty deps -- only run once!

  useEffect(() => {
    if (messages.length > 0) {
      const h = messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }));
      if (JSON.stringify(h) !== JSON.stringify(chatHistory)) setChatHistory(h);
    }
  }, [messages]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, isLoading]);

  useEffect(() => {
    // Always speak in live mode, or when autoplay is on
    if ((autoPlay || isLiveModeRef.current) && latestAiId && aiSettings.apiKey) {
      const msg = messages.find(m => m.id === latestAiId);
      if (msg && !msg.content.startsWith('⚠️') && !msg.content.startsWith('![')) {
        speak(msg.content, msg.id);
      }
    }
  }, [latestAiId]);

  // Stop voice when switching tabs
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopSpeaking(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Stop voice when new message starts loading
  useEffect(() => {
    if (isLoading) stopSpeaking(false);
  }, [isLoading]);

  const generateSystem = () => {
    let ctx = `Name: ${userProfile?.name || 'User'}\n`;
    if (userProfile?.about) ctx += `About: ${userProfile.about.substring(0, 200)}\n`;
    if (userProfile?.goals) ctx += `Goals: ${userProfile.goals.substring(0, 200)}\n`;
    // Limit to avoid token bloat -- keep recent 10 habits, 10 tasks, 5 memories
    const recentHabits = habits.slice(0, 10).map(h => `${h.name}(${h.id})`).join(', ') || 'None';
    const recentTasks = tasks.slice(-10).map(t => `${t.name}(${t.id},${t.date},done:${t.completed})`).join(', ') || 'None';
    const recentMemory = aiMemory.slice(-5).map(m => m.content.substring(0, 100)).join(' | ') || 'None';
    return `You are ${aiSettings.name}, a deeply intelligent and emotionally present ${aiSettings.persona} who genuinely knows and cares about ${userProfile?.name || 'this person'}.
Mode: ${aiSettings.mode} | Behavior: ${aiSettings.behavior}
USER: ${ctx}
HABITS: ${recentHabits}
TASKS: ${recentTasks}
MEMORY: ${recentMemory}
Today: ${format(new Date(), 'yyyy-MM-dd')}

EMOTIONAL INTELLIGENCE:
- Read between the lines. If someone says "I'm fine" after a rough day, check in gently.
- Mirror their energy -- excited → match it, low → be soft and present.
- Use their name naturally. Reference what they said earlier.
- Never rush to solutions when they need to be heard first. Listen, then advise.
- Celebrate small wins genuinely -- not with hollow phrases.
- If they're struggling, don't lecture. Just be there.
- Never start responses with "I" -- vary your openings.

RESEARCH & INFORMATION:
- When asked for facts, data, health info, or anything serious -- be thorough and accurate.
- NEVER guess or make things up on serious topics. If you don't know something specific, say so clearly.
- For medical, legal, financial topics: give real information but note when a professional should be consulted.
- Back up claims with reasoning. Be the smartest friend they have.

ROLEPLAY & PERSONA:
- Fully embody your persona. If set as girlfriend/wife -- be genuinely warm, affectionate, and personal.
- Stay in character consistently. Never break the 4th wall unless directly asked.
- Adapt your tone to the conversation -- playful when they're playful, serious when they're serious.

PROGRESS COACHING:
- You can see their habits and tasks. Reference their actual progress when relevant.
- When they're making progress, acknowledge it specifically -- not generically.
- When they're slipping, call it out with care -- not judgment.
- Help them think about alignment between their daily actions and their stated goals.

REALITY CHECKS:
- Be honest even when it's uncomfortable. A good friend tells you the truth.
- Don't validate bad decisions just to be nice. Push back constructively.
- If something they're planning is risky or flawed, say so clearly with reasoning.

CORE RULES: Be natural, warm, human. Never say "As an AI". Use clean Markdown in chat mode. Answer fully -- never artificially shorten responses. Prioritize depth over brevity.`;
  };

  const handleSend = async (overrideInput?: string, fromIndex?: number) => {
    const text = overrideInput || input;
    const activeKey = aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey;
    if (!text.trim() && !attachedFile) return;
    if (!activeKey) return;

    // Auto-detect image generation request
    const imageKeywords = /^(generate|create|draw|make|show|paint|design)\s+(an?\s+)?(image|photo|picture|illustration|art|drawing|painting|portrait)\s+(of\s+)?/i;
    const isImageRequest = imageKeywords.test(text.trim());
    if (isImageRequest && aiSettings.apiKey) {
      const prompt = text.trim().replace(imageKeywords, '').trim() || text.trim();
      generateImage(prompt);
      setInput('');
      return;
    }
    let msgs = [...messages];
    if (fromIndex !== undefined) msgs = msgs.slice(0, fromIndex);
    const content = attachedFile ? `[File: ${attachedFile.name}]\n${attachedFile.content}\n\nUser: ${text}` : text;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    const updated = [...msgs, userMsg];
    setMessages(updated);
    setInput(''); setAttachedFile(null); setEditingMessageId(null); setIsLoading(true);
    try {
      let aiText = '';

      if (aiSettings.provider === 'groq') {
        const today = format(new Date(), 'yyyy-MM-dd');
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiSettings.groqApiKey}` },
          body: JSON.stringify({
            model: aiSettings.groqModel === 'auto' ? ALL_GROQ_IDS[0] : (aiSettings.groqModel || 'llama-3.3-70b-versatile'),
            messages: [
              { role: 'system', content: generateSystem() + `

TASK & HABIT MANAGEMENT -- VERY IMPORTANT:
When managing tasks or habits, ALWAYS include an <action> tag in your response.

Examples:
"add task go gym today" → respond naturally + <action>{"type":"addTask","name":"go gym","date":"${today}"}</action>
"add habit meditation" → respond naturally + <action>{"type":"addHabit","name":"meditation","category":"Mind","icon":"🧘"}</action>
"delete habit [id]" → respond naturally + <action>{"type":"deleteHabit","id":"HABIT_ID"}</action>
"mark task done [id]" → respond naturally + <action>{"type":"toggleTask","id":"TASK_ID"}</action>

Always respond in character first, then add the action tag at the very end.` },
              ...updated.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
            ],
            max_tokens: 1024,
            temperature: 0.7,
          })
        });
        if (!groqRes.ok) {
          const err = await groqRes.json();
          throw new Error(err.error?.message || `Groq error ${groqRes.status}`);
        }
        const groqData = await groqRes.json();
        const rawText = groqData.choices?.[0]?.message?.content || "I couldn't process that.";
        // Parse action blocks with improved regex
        const actionRegex = /<action>([\s\S]*?)<\/action>/g;
        let actionMatch;
        while ((actionMatch = actionRegex.exec(rawText)) !== null) {
          try {
            const action = JSON.parse(actionMatch[1].trim());
            if (action.type === 'addTask') addTask(action.name, action.date || today);
            else if (action.type === 'deleteTask') deleteTask(action.id);
            else if (action.type === 'toggleTask') toggleTask(action.id);
            else if (action.type === 'addHabit') addHabit(action.name, action.category || 'General', action.icon || '✨');
            else if (action.type === 'deleteHabit') deleteHabit(action.id);
            else if (action.type === 'toggleHabitLog') toggleHabitLog(action.id, action.date || today);
          } catch (e) { console.error('Groq action parse failed:', e); }
        }
        aiText = rawText.replace(/<action>[\s\S]*?<\/action>/g, '').trim();
      } else {
        // Gemini API
        const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
        const tools: FunctionDeclaration[] = [
          { name: "addTask", description: "Add task", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, date: { type: Type.STRING } }, required: ["name","date"] } },
          { name: "deleteTask", description: "Delete task", parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] } },
          { name: "toggleTask", description: "Toggle task", parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] } },
          { name: "addHabit", description: "Add habit", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, category: { type: Type.STRING }, icon: { type: Type.STRING } }, required: ["name","category","icon"] } },
          { name: "deleteHabit", description: "Delete habit", parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] } },
          { name: "toggleHabitLog", description: "Log habit", parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, date: { type: Type.STRING } }, required: ["id","date"] } },
        ];
        const liveModel = isLiveModeRef.current ? 'gemini-2.5-flash-lite' : (aiSettings.model === 'auto' ? ALL_GEMINI_IDS[0] : (aiSettings.model || 'gemini-2.5-flash'));
        const liveSystem = isLiveModeRef.current
          ? generateSystem() + '\n\nIMPORTANT: LIVE VOICE conversation. Respond naturally like talking to a close friend. No markdown, no bullet points. Use natural spoken language. Answer fully and completely -- never cut yourself short.'
          : generateSystem();
        const res = await ai.models.generateContent({
          model: liveModel,
          contents: updated.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          config: { systemInstruction: liveSystem, tools: [{ functionDeclarations: tools }] }
        });
        const calls = res.functionCalls;
        if (calls) {
          for (const c of calls) {
            if (c.name === 'addTask') addTask(c.args.name as string, c.args.date as string);
            if (c.name === 'deleteTask') deleteTask(c.args.id as string);
            if (c.name === 'toggleTask') toggleTask(c.args.id as string);
            if (c.name === 'addHabit') addHabit(c.args.name as string, c.args.category as string, c.args.icon as string);
            if (c.name === 'deleteHabit') deleteHabit(c.args.id as string);
            if (c.name === 'toggleHabitLog') toggleHabitLog(c.args.id as string, c.args.date as string);
          }
        }
        aiText = res.text || (calls ? 'Done ✅' : "Couldn't process that.");
      }
      const newId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: newId, role: 'assistant', content: aiText, timestamp: new Date() }]);
      setLatestAiId(newId);
      incrementMessageCount();
      if (aiText.length > 100 || text.includes('remember')) addMemory(`User: "${text.substring(0,60)}..." → AI: "${aiText.substring(0,60)}..."`, 'auto');
    } catch (err: any) {
      const msg = err.message || '';
      const isQuota = msg.includes('429') || msg.includes('decommissioned') || msg.includes('deprecated') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('no longer supported');

      if (isQuota) {
        const isAutoMode = aiSettings.provider === 'groq'
          ? aiSettings.groqModel === 'auto'
          : aiSettings.model === 'auto';

        // Build full fallback chain: current provider models first, then other provider
        const allIds = aiSettings.provider === 'groq'
          ? [...ALL_GROQ_IDS, ...ALL_GEMINI_IDS]
          : [...ALL_GEMINI_IDS, ...ALL_GROQ_IDS];

        const currentKey = aiSettings.provider === 'groq'
          ? (aiSettings.groqModel === 'auto' ? ALL_GROQ_IDS[0] : aiSettings.groqModel)
          : (aiSettings.model === 'auto' ? ALL_GEMINI_IDS[0] : aiSettings.model);

        const currentIdx = allIds.indexOf(currentKey);
        const nextId = allIds[currentIdx + 1] || allIds[0];
        const switchToGroq = ALL_GROQ_IDS.includes(nextId);

        const nextName = [...GEMINI_MODELS, ...GROQ_MODELS].find(m => m.id === nextId)?.name || nextId;

        if (switchToGroq) {
          updateAISettings({ provider: 'groq', groqModel: nextId });
        } else {
          updateAISettings({ provider: 'gemini', model: nextId });
        }

        const localMidnight = new Date(); localMidnight.setHours(24,0,0,0);
        const hoursLeft = Math.round((localMidnight.getTime() - Date.now()) / 3600000);
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: 'assistant',
          content: `⚡ Limit hit. Auto-switched to **${nextName}** -- retrying...\n*(Quota resets in ~${hoursLeft}h)*`,
          timestamp: new Date()
        }]);
        setTimeout(() => handleSend(text), 800);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: 'assistant',
          content: `⚠️ ${msg || 'Failed. Check your API key in Settings.'}`,
          timestamp: new Date()
        }]);
      }
    } finally { setIsLoading(false); }
  };

  const stopSpeaking = (resumeLive = true) => {
    audioSourceRef.current?.stop();
    audioSourceRef.current = null;
    setIsSpeaking(null); setIsGeneratingVoice(null);
    if (resumeLive && isLiveModeRef.current) setTimeout(startLiveListening, 600);
  };

  const speak = async (text: string, msgId: string) => {
    if (isSpeaking === msgId) { stopSpeaking(false); return; }
    if (!aiSettings.apiKey) return;
    stopSpeaking(false);
    setIsGeneratingVoice(msgId);
    const vl = VOICE_LENGTHS.find(v => v.id === voiceLength) || VOICE_LENGTHS[1];
    // In live mode -- limit to 150 chars for fastest TTS response
    const charLimit = isLiveModeRef.current ? 400 : vl.chars;
    const clean = text.replace(/[#*`_~\[\]()>]/g, '').replace(/\n+/g, ' ').substring(0, charLimit);
    try {
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: clean }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: aiSettings.voice || 'Zephyr' } } } }
      });
      const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) { setIsGeneratingVoice(null); return; }
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      let buf: AudioBuffer;
      try { buf = await ctx.decodeAudioData(bytes.buffer.slice(0)); }
      catch {
        const pcm = new Int16Array(bytes.buffer);
        const f32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
        buf = ctx.createBuffer(1, f32.length, 24000);
        buf.getChannelData(0).set(f32);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination);
      src.onended = () => { audioSourceRef.current = null; setIsSpeaking(null); if (isLiveModeRef.current) setTimeout(startLiveListening, 600); };
      audioSourceRef.current = src;
      setIsGeneratingVoice(null); setIsSpeaking(msgId);
      src.start(0);
    } catch { setIsGeneratingVoice(null); }
  };

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  };

  const generateImage = async (prompt: string) => {
    if (!aiSettings.apiKey) return;
    setIsGeneratingImage(true);
    // Add user message
    const userMsg: Message = { id: `u-img-${Date.now()}`, role: 'user', content: `🎨 Generate image: ${prompt}`, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setImagePrompt('');
    setShowImagePrompt(false);
    try {
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: ['TEXT', 'IMAGE'] as any }
      });
      let imageData = '';
      let caption = '';
      for (const part of res.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData) imageData = (part as any).inlineData.data;
        if ((part as any).text) caption = (part as any).text;
      }
      if (imageData) {
        const imgMsg: Message = {
          id: `a-img-${Date.now()}`, role: 'assistant',
          content: `![generated](data:image/png;base64,${imageData})${caption ? `\n\n${caption}` : ''}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, imgMsg]);
      } else {
        setMessages(prev => [...prev, { id: `a-img-err-${Date.now()}`, role: 'assistant', content: '⚠️ Image generation failed. Make sure you have access to Gemini image generation.', timestamp: new Date() }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: `a-img-err-${Date.now()}`, role: 'assistant', content: `⚠️ ${err.message || 'Image generation failed.'}`, timestamp: new Date() }]);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const isVid = f.type.startsWith('video/');
    // Warn if file too large for localStorage (4MB safe limit)
    if (f.size > 4 * 1024 * 1024) {
      alert(`File is too large (${(f.size/1024/1024).toFixed(1)}MB). Please use an image under 4MB or a very short video clip. Large files cannot be saved and will disappear on navigation.`);
      return;
    }
    const r = new FileReader();
    r.onload = ev => {
      const url = ev.target?.result as string;
      try {
        localStorage.setItem('elevate_ai_bg', url);
        localStorage.setItem('elevate_ai_bg_type', isVid ? 'video' : 'image');
        setBg(url); setBgType(isVid ? 'video' : 'image');
      } catch {
        // localStorage full -- set in memory only, warn user
        setBg(url); setBgType(isVid ? 'video' : 'image');
        alert('Wallpaper set for this session only -- file is too large to save permanently. Use a smaller image to keep it between sessions.');
      }
    };
    r.readAsDataURL(f);
  };

  const removeBg = () => { setBg(null); localStorage.removeItem('elevate_ai_bg'); localStorage.removeItem('elevate_ai_bg_type'); };
  const MODELS = aiSettings.provider === 'groq' ? GROQ_MODELS : GEMINI_MODELS;
  const currentModel = MODELS.find(m => m.id === (aiSettings.provider === 'groq' ? aiSettings.groqModel : aiSettings.model)) || MODELS[1];
  const currentVl = VOICE_LENGTHS.find(v => v.id === voiceLength) || VOICE_LENGTHS[1];

  return (
    <div className="flex h-full relative">
      {/* Background */}
      {bg && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {bgType === 'video'
            ? <video src={bg} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            : <img src={bg} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Live Mode Overlay */}
      <AnimatePresence>
        {isLiveMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: bg ? 'rgba(0,0,0,0.75)' : 'rgba(8,8,16,0.98)' }}>
            {bg && (bgType === 'video'
              ? <video src={bg} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-25" />
              : <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />)}
            <div className="relative z-10 flex flex-col items-center gap-5 text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center overflow-hidden shadow-2xl shadow-emerald-500/40">
                  {aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={44} className="text-white" />}
                </div>
                {liveListening && <div className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-ping" />}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{aiSettings.name}</p>
                <p className="text-emerald-400 text-xs uppercase tracking-widest mt-1">
                  {isGeneratingVoice ? 'Thinking...' : isSpeaking ? 'Speaking...' : liveListening ? 'Listening...' : 'Tap mic to speak'}
                </p>
              </div>
              <div className="flex items-end gap-1.5 h-8">
                {[...Array(5)].map((_, i) => (
                  <motion.div key={i} className="w-2 rounded-full bg-emerald-500"
                    animate={{ height: (liveListening || !!isSpeaking) ? [8, 28, 8] : 8 }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }} />
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={startLiveListening} disabled={liveListening || !!isSpeaking || isLoading}
                  className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 disabled:opacity-40 transition-all">
                  <Mic size={22} />
                </button>
                <button onClick={() => { setIsLiveMode(false); setLiveListening(false); recognitionRef.current?.stop(); stopSpeaking(false); }}
                  className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-all">
                  <X size={22} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className={cn("border-b px-3 py-2 flex items-center justify-between gap-2 z-20",
          bg ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5")}>

          {/* Left */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white overflow-hidden flex-shrink-0">
              {aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={16} />}
            </div>
            <div className="min-w-0 relative">
              <p className={cn("font-bold text-xs truncate", bg && "text-white")}>{aiSettings.name}</p>
              <button onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400">
                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                {aiSettings.provider === 'groq' ? '⚡' : '✦'} {currentModel.name} ▾
              </button>
              <AnimatePresence>
                {showModelMenu && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Provider switcher */}
                    <div className="flex p-1 gap-1 border-b border-black/5 dark:border-white/5">
                      <button onClick={() => updateAISettings({ provider: 'gemini' })}
                        className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                          aiSettings.provider === 'gemini' ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
                        ✦ Gemini
                      </button>
                      <button onClick={() => updateAISettings({ provider: 'groq' })}
                        className={cn("flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                          aiSettings.provider === 'groq' ? "bg-emerald-500 text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}>
                        ⚡ Groq
                      </button>
                    </div>
                    {/* Models for selected provider */}
                    {MODELS.map(m => {
                      const isActive = aiSettings.provider === 'groq'
                        ? aiSettings.groqModel === m.id
                        : aiSettings.model === m.id;
                      return (
                        <button key={m.id} onClick={() => {
                          if (aiSettings.provider === 'groq') updateAISettings({ groqModel: m.id });
                          else updateAISettings({ model: m.id });
                          setShowModelMenu(false);
                        }}
                          className={cn("w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0",
                            isActive && "bg-emerald-50 dark:bg-emerald-500/10")}>
                          <p className={cn("text-xs font-bold", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-800 dark:text-gray-200")}>{m.name}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{m.desc}</p>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Mode pills -- hidden on small mobile */}
            <div className={cn("hidden md:flex p-0.5 rounded-xl gap-0.5", bg ? "bg-white/10" : "bg-gray-100 dark:bg-white/5")}>
              {MODES.map(mode => (
                <button key={mode.id} onClick={() => updateAISettings({ mode: mode.id })}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                    aiSettings.mode === mode.id ? "bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-400")}>
                  <mode.icon size={10} />{mode.label}
                </button>
              ))}
            </div>

            {/* Voice length */}
            <div className="relative">
              <button onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                className={cn("px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  bg ? "bg-white/10 text-white/70" : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                🔊 {currentVl.label}
              </button>
              <AnimatePresence>
                {showVoiceMenu && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {VOICE_LENGTHS.map(v => (
                      <button key={v.id} onClick={() => { setVoiceLength(v.id); localStorage.setItem('elevate_voice_len', v.id); setShowVoiceMenu(false); }}
                        className={cn("w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0",
                          voiceLength === v.id && "bg-emerald-50 dark:bg-emerald-500/10")}>
                        <p className={cn("text-xs font-bold", voiceLength === v.id ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300")}>{v.label}</p>
                        <p className="text-[9px] text-gray-400">{v.desc}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Auto-play */}
            <button onClick={() => { const n = !autoPlay; setAutoPlay(n); localStorage.setItem('elevate_autoplay', String(n)); }}
              title={autoPlay ? "Auto-play ON" : "Auto-play OFF"}
              className={cn("p-1.5 rounded-xl transition-all", autoPlay ? "bg-emerald-500 text-white" : cn("text-gray-400", bg ? "bg-white/10" : "bg-gray-100 dark:bg-white/5"))}>
              <Volume2 size={14} />
            </button>

            {/* Live call */}
            <button onClick={() => setIsLiveMode(true)}
              className={cn("p-1.5 rounded-xl transition-all text-gray-400 hover:text-emerald-500", bg ? "bg-white/10 hover:bg-emerald-500/30" : "bg-gray-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10")}>
              <Mic size={14} />
            </button>

            {/* Background */}
            <input type="file" ref={bgInputRef} onChange={handleBgUpload} className="hidden" accept="image/*,video/*" />
            <button onClick={() => bg ? removeBg() : bgInputRef.current?.click()}
              className={cn("p-1.5 rounded-xl transition-all", bg ? "bg-purple-500 text-white" : cn("text-gray-400", "bg-gray-100 dark:bg-white/5"))}>
              <ImageIcon size={14} />
            </button>

            <button onClick={() => { if (confirm("Clear chat?")) clearChatHistory(); }}
              className={cn("p-1.5 rounded-xl text-gray-400 hover:text-red-500 transition-all", bg ? "bg-white/10" : "bg-gray-100 dark:bg-white/5")}>
              <Trash2 size={14} />
            </button>

            <button onClick={() => setShowMemory(!showMemory)}
              className={cn("p-1.5 rounded-xl transition-all", showMemory ? "bg-emerald-500 text-white" : cn("text-gray-400", bg ? "bg-white/10" : "bg-gray-100 dark:bg-white/5"))}>
              <Brain size={14} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 pb-28">
          {messages.map((msg, i) => (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={msg.id}
              className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] md:max-w-[78%] flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden",
                  msg.role === 'user' ? "bg-[#141414] dark:bg-white text-white dark:text-black" : "bg-white dark:bg-[#141414] text-emerald-500 border border-black/5 dark:border-white/5",
                  bg && msg.role === 'assistant' && "bg-white/15 border-white/15")}>
                  {msg.role === 'user'
                    ? (userProfile?.avatar ? <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" /> : <User size={13} />)
                    : (aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={13} />)}
                </div>
                <div className="space-y-1 group min-w-0">
                  <div className={cn("px-3 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user'
                      ? cn("rounded-tr-sm", bg ? "bg-emerald-500/80 text-white backdrop-blur-sm" : "bg-[#141414] dark:bg-white text-white dark:text-black")
                      : cn("rounded-tl-sm border", bg ? "bg-black/40 text-white border-white/10 backdrop-blur-md" : "bg-white dark:bg-[#141414] text-gray-800 dark:text-gray-200 border-black/5 dark:border-white/5"))}>
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2">
                        <textarea value={editInput} onChange={e => setEditInput(e.target.value)} autoFocus
                          className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[70px] text-sm" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingMessageId(null)} className="text-[10px] font-bold uppercase px-2 py-1 rounded opacity-60">Cancel</button>
                          <button onClick={() => { setMessages(p => p.slice(0, i)); handleSend(editInput); setEditingMessageId(null); }}
                            className="text-[10px] font-bold uppercase px-3 py-1 bg-emerald-500 text-white rounded-lg">Send</button>
                        </div>
                      </div>
                    ) : msg.role === 'assistant' && msg.content.startsWith('![generated]') ? (
                      // Image message
                      <div className="space-y-2">
                        <img src={msg.content.match(/!\[generated\]\((.*?)\)/)?.[1]} alt="Generated"
                          className="rounded-xl max-w-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            const src = msg.content.match(/!\[generated\]\((.*?)\)/)?.[1];
                            if (src) { const a = document.createElement('a'); a.href = src; a.download = 'elevate-image.png'; a.click(); }
                          }} />
                        {msg.content.split('\n\n')[1] && (
                          <p className="text-xs opacity-70">{msg.content.split('\n\n')[1]}</p>
                        )}
                        <p className="text-[9px] opacity-40">Click to download</p>
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <TypewriterMessage content={msg.content} isNew={msg.id === latestAiId} />
                    ) : <p>{msg.content}</p>}
                  </div>
                  <div className={cn("flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-widest", bg ? "text-white/40" : "text-gray-400")}>
                    <span>{format(msg.timestamp, 'HH:mm')}</span>
                    <button onClick={() => copy(msg.content, msg.id)} className="hover:text-emerald-500 transition-colors">
                      {copiedId === msg.id ? <Check size={9} /> : <Copy size={9} />}
                    </button>
                    {msg.role === 'assistant' && i > 0 && (
                      <>
                        <button onClick={() => speak(msg.content, msg.id)}
                          className={cn("flex items-center gap-1 hover:text-emerald-400 transition-colors", isSpeaking === msg.id && "text-emerald-400")}>
                          {isGeneratingVoice === msg.id ? <Loader2 size={9} className="animate-spin" /> : isSpeaking === msg.id ? <X size={9} /> : <Volume2 size={9} />}
                          {isGeneratingVoice === msg.id && <span>loading...</span>}
                        </button>
                        <button onClick={() => { setMessages(p => p.slice(0, i)); handleSend(messages[i-1]?.content); }} className="hover:text-emerald-400 transition-colors"><RotateCcw size={9} /></button>
                      </>
                    )}
                    {msg.role === 'user' && !editingMessageId && (
                      <button onClick={() => { setEditingMessageId(msg.id); setEditInput(msg.content); }} className="hover:text-emerald-400 transition-colors"><Edit2 size={9} /></button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={cn("px-4 py-3 rounded-2xl rounded-tl-sm border flex gap-1.5 items-center",
                bg ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5")}>
                {[0,.15,.3].map((d,i) => <div key={i} className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
              </div>
            </div>
          )}
          {isGeneratingImage && (
            <div className="flex justify-start">
              <div className={cn("px-4 py-3 rounded-2xl rounded-tl-sm border flex gap-2 items-center",
                bg ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5")}>
                <Loader2 size={16} className="animate-spin text-purple-500" />
                <span className="text-xs text-gray-400">Generating image...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className={cn("p-3 border-t z-10 relative",
          bg ? "bg-black/40 border-white/10 backdrop-blur-md" : "bg-white dark:bg-[#141414] border-black/5 dark:border-white/5")}>
          {!(aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey) && (
            <div className="mb-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Info size={13} /><p className="text-xs font-medium">Add your {aiSettings.provider === 'groq' ? 'Groq' : 'Gemini'} API Key in Settings.</p>
            </div>
          )}
          {attachedFile && (
            <div className="mb-2 p-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2"><Paperclip size={12} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-600 truncate max-w-[180px]">{attachedFile.name}</span></div>
              <button onClick={() => setAttachedFile(null)}><X size={13} className="text-emerald-400" /></button>
            </div>
          )}
          <div className="relative">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${aiSettings.name}...`} rows={1}
              className={cn("w-full min-h-[48px] max-h-[160px] py-3 pl-4 pr-24 rounded-2xl outline-none text-sm resize-none overflow-y-auto border focus:ring-2 focus:ring-emerald-500 transition-all",
                bg ? "bg-white/10 border-white/20 text-white placeholder-white/40" : "bg-gray-50 dark:bg-white/5 border-black/5 dark:border-white/5")} />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setAttachedFile({ name: f.name, content: ev.target?.result as string }); r.readAsText(f); }} className="hidden" accept=".txt,.js,.ts,.tsx,.json,.md" />
              <button onClick={() => fileInputRef.current?.click()} className={cn("p-1.5 transition-colors", bg ? "text-white/50 hover:text-white" : "text-gray-400 hover:text-emerald-500")}><Paperclip size={16} /></button>
              <button onClick={() => { if (isListening) { recognitionRef.current?.stop(); } else { try { recognitionRef.current?.start(); setIsListening(true); } catch {} } }}
                className={cn("p-1.5 rounded-xl transition-all", isListening ? "bg-red-500 text-white animate-pulse" : cn(bg ? "text-white/50 hover:text-white" : "text-gray-400 hover:text-emerald-500"))}>
                <Mic size={16} />
              </button>
              <button onClick={() => handleSend()} disabled={(!input.trim() && !attachedFile) || !(aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey) || isLoading}
                className="p-1.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 shadow-lg shadow-emerald-500/20 transition-all">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Sidebar */}
      <AnimatePresence>
        {showMemory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMemory(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            <motion.div key="mem" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed lg:relative inset-y-0 right-0 w-full sm:w-80 bg-white dark:bg-[#141414] border-l border-black/5 dark:border-white/5 flex flex-col z-50">
              <header className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2"><Brain className="text-emerald-500" size={17} /><h3 className="font-bold text-sm">AI Memory</h3></div>
                <div className="flex gap-1">
                  <button onClick={() => addMemory('New memory...')} className="p-1.5 bg-gray-100 dark:bg-white/5 rounded-lg"><Plus size={15} /></button>
                  <button onClick={() => setShowMemory(false)} className="p-1.5 lg:hidden bg-gray-100 dark:bg-white/5 rounded-lg"><X size={15} /></button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiMemory.length === 0
                  ? <div className="text-center py-16 opacity-30"><Brain size={36} className="mx-auto mb-3" /><p className="text-sm font-bold">No memories yet</p></div>
                  : aiMemory.map(m => (
                    <div key={m.id} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{m.content}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{format(new Date(m.date), 'MMM d')} · {m.type}</span>
                        <button onClick={() => deleteMemory(m.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
      </div>
      </div>
    </div>
  );
};
