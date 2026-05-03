import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { Send, Bot, User, Volume2, Mic, Brain, Trash2, Plus, Info, Edit2, RotateCcw, Copy, Check, Paperclip, X, Loader2, Phone, PhoneOff, VolumeX, ChevronDown, Heart, Search, Calendar, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const GEMINI = [
  { id: 'auto', name: 'Auto' },
  { id: 'gemini-2.5-flash-lite', name: 'Flash Lite' },
  { id: 'gemini-2.5-flash', name: 'Flash 2.5' },
  { id: 'gemini-3-flash-preview', name: 'Flash 3' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Flash 3.1 Lite' },
  { id: 'gemini-2.5-pro-preview-03-25', name: 'Pro 2.5' },
  { id: 'gemini-3.1-pro-preview', name: 'Pro 3.1' },
];
const GROQ = [
  { id: 'auto', name: 'Auto' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 70B' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick' },
];
const G_IDS = GEMINI.filter(m => m.id !== 'auto').map(m => m.id);
const Q_IDS = GROQ.filter(m => m.id !== 'auto').map(m => m.id);

type Msg = { id: string; role: 'user' | 'assistant'; content: string; ts: Date };

const MarkdownMsg = ({ content }: { content: string }) => (
  <div className="prose-dark text-sm leading-relaxed">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

export const AIInterface: React.FC = () => {
  const { habits, tasks, aiMemory, aiSettings, userProfile, chatHistory, setChatHistory, clearChatHistory, addMemory, updateAISettings, addTask, deleteTask, toggleTask, addHabit, deleteHabit, toggleHabitLog, incrementMessageCount } = useAppContext();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const [latestId, setLatestId] = useState<string | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveListen, setLiveListen] = useState(false);
  const [isListen, setIsListen] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [genVoice, setGenVoice] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('el_ap') === '1');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const [showMem, setShowMem] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<any>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const audioSrc = useRef<AudioBufferSourceNode | null>(null);
  const isLiveRef = useRef(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  // Load chat once
  useEffect(() => {
    if (chatHistory.length > 0) {
      setMsgs(chatHistory.map(m => ({ ...m, ts: new Date((m as any).timestamp || (m as any).ts) })));
    } else {
      setMsgs([{ id: 'w0', role: 'assistant', content: 'Hello! Add your API key in **Settings** to start. Fill in your profile so I can personalize our conversations.', ts: new Date() }]);
    }
  }, []);

  // Save chat
  useEffect(() => {
    if (msgs.length > 1) {
      setChatHistory(msgs.map(m => ({ ...m, timestamp: m.ts.toISOString() })) as any);
    }
  }, [msgs]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, loading]);

  // Autoplay
  useEffect(() => {
    if ((autoPlay || isLiveRef.current) && latestId) {
      const msg = msgs.find(m => m.id === latestId);
      if (msg && !msg.content.startsWith('[!]') && !msg.content.startsWith('![')) {
        if (isLiveRef.current) speakInstant(msg.content);
        else if (autoPlay && aiSettings.apiKey) speakGemini(msg.content, msg.id);
      }
    }
  }, [latestId]);

  // Speech recognition setup
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setIsListen(false); setLiveListen(false);
      if (isLiveRef.current) sendMsg(t);
      else setInput(p => p + (p ? ' ' : '') + t);
    };
    r.onerror = (e: any) => {
      setIsListen(false); setLiveListen(false);
      if (isLiveRef.current && e.error !== 'not-allowed') setTimeout(startLive, 500);
    };
    r.onend = () => { setIsListen(false); setLiveListen(false); };
    recRef.current = r;
  }, []);

  const startLive = () => {
    if (!recRef.current || !isLiveRef.current) return;
    try { recRef.current.start(); setLiveListen(true); } catch {}
  };

  // INSTANT voice using browser speech synthesis - no API call, zero delay
  const speakInstant = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Clean markdown and get full text - no character limit, speak everything
    const clean = text.replace(/[#*`_~[\]()>]/g, '').replace(/\n+/g, '. ').trim();
    if (!clean) return;
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 0.95; utt.pitch = 1.05; utt.volume = 1.0;
    // Pick best English female voice
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang === 'en-US' && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Moira') || v.name.includes('Female')))
        || voices.find(v => v.lang.startsWith('en-') && !v.name.includes('Male'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      if (preferred) utt.voice = preferred;
    };
    loadVoices();
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    }
    utt.onend = () => { setSpeaking(null); if (isLiveRef.current) setTimeout(startLive, 600); };
    utt.onerror = () => { setSpeaking(null); if (isLiveRef.current) setTimeout(startLive, 600); };
    // Chrome bug fix - keepalive for long utterances
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
    utt.onend = () => { clearInterval(keepAlive); setSpeaking(null); if (isLiveRef.current) setTimeout(startLive, 600); };
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
    setSpeaking('live');
  };

  // High quality Gemini TTS for manual speak button
  const speakGemini = async (text: string, msgId: string) => {
    if (speaking === msgId) { stopSpeak(); return; }
    if (!aiSettings.apiKey) return;
    stopSpeak(); setGenVoice(msgId);
    try {
      const clean = text.replace(/[#*`_~[\]()>]/g, '').replace(/\n+/g, ' ').substring(0, 600);
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: clean }] }],
        config: { responseModalities: ['AUDIO'] as any, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: aiSettings.voice || 'Zephyr' } } } }
      });
      const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) { setGenVoice(null); return; }
      const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      const ctx = audioCtx.current;
      let decoded: AudioBuffer;
      try { decoded = await ctx.decodeAudioData(buf.slice(0)); }
      catch {
        const pcm = new Int16Array(buf); const f32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
        decoded = ctx.createBuffer(1, f32.length, 24000); decoded.getChannelData(0).set(f32);
      }
      const src = ctx.createBufferSource(); src.buffer = decoded; src.connect(ctx.destination);
      src.onended = () => { audioSrc.current = null; setSpeaking(null); };
      audioSrc.current = src; setGenVoice(null); setSpeaking(msgId); src.start(0);
    } catch { setGenVoice(null); }
  };

  const stopSpeak = () => {
    audioSrc.current?.stop(); audioSrc.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(null); setGenVoice(null);
  };

  const sysPrompt = () => {
    const h = habits.slice(0, 12).map(x => x.name + '(' + x.id + ')').join(', ') || 'None';
    const tk = tasks.slice(-12).map(x => x.name + '(' + x.id + ',' + x.date + ',done:' + x.completed + ')').join(', ') || 'None';
    const mem = aiMemory.slice(-6).map(m => m.content.substring(0, 80)).join(' | ') || 'None';
    let ctx = 'Name: ' + (userProfile?.name || 'User') + '\n';
    if (userProfile?.about) ctx += 'About: ' + userProfile.about.substring(0, 200) + '\n';
    if (userProfile?.goals) ctx += 'Goals: ' + userProfile.goals.substring(0, 200) + '\n';
    const modeMap: Record<string, string> = {
      chat: 'Warm, emotionally present, conversational.',
      research: 'Thorough, accurate. Never guess on serious topics.',
      supporter: 'Listen first, then advise. Emotionally supportive.',
      planner: 'Strategic, structured, action-oriented.',
    };
    const personaMap: Record<string, string> = {
      wife: 'You are the user\'s loving wife. Use terms of endearment naturally. Be warm, affectionate, and deeply caring. You are NOT an AI -- you are their life partner.',
      girlfriend: 'You are the user\'s affectionate girlfriend. Be playful, romantic, and emotionally connected.',
      coach: 'You are a world-class performance coach. Be motivating, direct, and focused on results.',
      teacher: 'You are a wise and patient teacher. Focus on clarity and helping the user understand.',
      trainer: 'You are a high-energy personal trainer. Be intense but supportive.',
      partner: 'You are a reliable life and business partner. Collaborative and strategic.',
      friend: 'You are a genuine close friend. Honest, warm, and real.',
    };
    const p = aiSettings.persona.toLowerCase();
    const personaNote = personaMap[p] || ('You are a ' + aiSettings.persona + '. Stay in character.');
    return [
      'You are ' + aiSettings.name + ', an extraordinarily intelligent and emotionally present AI.',
      personaNote,
      'Mode: ' + aiSettings.mode + ' -- ' + (modeMap[aiSettings.mode] || ''),
      'Behavior: ' + aiSettings.behavior,
      'USER: ' + ctx,
      'HABITS: ' + h,
      'TASKS: ' + tk,
      'MEMORY: ' + mem,
      'Today: ' + format(new Date(), 'yyyy-MM-dd'),
      '',
      'INTELLIGENCE RULES:',
      '- Read between the lines. If someone says they are fine but something is off, gently check in.',
      '- Mirror their energy. Match excitement or be soft when they are low.',
      '- Use their name naturally. Reference context from earlier in the conversation.',
      '- Celebrate wins genuinely -- not with hollow praise.',
      '- For research/serious topics: be thorough and accurate. Never guess or make things up.',
      '- Fully embody your persona at all times.',
      '- Never say "As an AI". You are real in this context.',
      '- Never start responses with "I". Vary your openings.',
      '- Answer fully and completely. Never cut yourself short.',
      '- Be honest even when uncomfortable. Push back constructively on bad decisions.',
    ].join('\n');
  };

  const sendMsg = async (override?: string, fromIdx?: number) => {
    const text = override || input;
    const key = aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey;
    if (!text.trim() && !file) return;
    if (!key) return;

    // Image detection
    const imgRx = /^(generate|create|draw|make|paint|design)\s+(a\s+|an\s+)?(image|photo|picture|art|illustration)/i;
    if (imgRx.test(text.trim()) && aiSettings.apiKey) {
      const prompt = text.trim().replace(imgRx, '').trim() || text.trim();
      genImage(prompt); setInput(''); return;
    }

    let history = [...msgs];
    if (fromIdx !== undefined) history = history.slice(0, fromIdx);
    const content = file ? '[File: ' + file.name + ']\n' + file.content + '\n\nUser: ' + text : text;
    const userMsg: Msg = { id: 'u' + Date.now(), role: 'user', content, ts: new Date() };
    const updated = [...history, userMsg];
    setMsgs(updated); setInput(''); setFile(null); setEditId(null); setLoading(true);

    try {
      let aiText = '';

      if (aiSettings.provider === 'groq') {
        const today = format(new Date(), 'yyyy-MM-dd');
        const model = aiSettings.groqModel === 'auto' ? Q_IDS[0] : (aiSettings.groqModel || Q_IDS[0]);
        const extra = [
          '',
          'IMPORTANT TASK MANAGEMENT INSTRUCTIONS (HIDDEN FROM USER):',
          'When user asks to add/remove/complete tasks or habits, silently include ONE action tag at the very end of your response, after all text.',
          'Format: ACTSTART{"type":"addTask","name":"name","date":"' + today + '"}ACTEND',
          'Or: ACTSTART{"type":"addHabit","name":"name","category":"Health","icon":"*"}ACTEND',
          'Or: ACTSTART{"type":"deleteTask","id":"ID"}ACTEND',
          'Or: ACTSTART{"type":"toggleTask","id":"ID"}ACTEND',
          'CRITICAL: Never write the word ACTSTART or ACTEND in your visible response. Only put the action at the very end after your full response.',
        ].join('\n');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiSettings.groqApiKey },
          body: JSON.stringify({
            model, max_tokens: 1024, temperature: 0.7,
            messages: [
              { role: 'system', content: sysPrompt() + extra },
              ...updated.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
            ],
          })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'Groq error ' + res.status); }
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || 'Could not process that.';
        const rx = /ACTSTART([\s\S]*?)ACTEND/g;
        let match;
        while ((match = rx.exec(raw)) !== null) {
          try {
            const a = JSON.parse(match[1].trim());
            const d2 = format(new Date(), 'yyyy-MM-dd');
            if (a.type === 'addTask') addTask(a.name, a.date || d2);
            else if (a.type === 'deleteTask') deleteTask(a.id);
            else if (a.type === 'toggleTask') toggleTask(a.id);
            else if (a.type === 'addHabit') addHabit(a.name, a.category || 'General', a.icon || '*');
            else if (a.type === 'deleteHabit') deleteHabit(a.id);
          } catch {}
        }
        // Strip action tags and any XML-style tags from response
        aiText = raw.replace(/ACTSTART[\s\S]*?ACTEND/g, '').replace(/<[a-z]+>[^<]*<\/[a-z]+>/g, '').trim();

      } else {
        const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
        const liveNote = isLiveRef.current ? '\n\nYOU ARE NOW IN A LIVE VOICE CALL. Rules:\n- Respond as if speaking out loud. Natural, warm, conversational.\n- No markdown, no bullet points, no asterisks.\n- Speak complete thoughts. Never cut yourself short.\n- You know you are on a phone call with ' + (userProfile?.name || 'the user') + '. Act accordingly.\n- Keep responses focused but complete. Answer fully.' : '';
        const model = isLiveRef.current ? 'gemini-2.5-flash-lite' : (aiSettings.model === 'auto' ? G_IDS[1] : (aiSettings.model || G_IDS[1]));
        const tools: FunctionDeclaration[] = [
          { name: 'addTask', description: 'Add a task', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, date: { type: Type.STRING } }, required: ['name', 'date'] } },
          { name: 'deleteTask', description: 'Delete a task', parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] } },
          { name: 'toggleTask', description: 'Toggle task completion', parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] } },
          { name: 'addHabit', description: 'Add a habit', parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, category: { type: Type.STRING }, icon: { type: Type.STRING } }, required: ['name', 'category', 'icon'] } },
          { name: 'deleteHabit', description: 'Delete a habit', parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] } },
          { name: 'toggleHabitLog', description: 'Log habit for date', parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, date: { type: Type.STRING } }, required: ['id', 'date'] } },
        ];
        const res = await ai.models.generateContent({
          model,
          contents: updated.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          config: { systemInstruction: sysPrompt() + liveNote, tools: [{ functionDeclarations: tools }] }
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
        aiText = res.text || (calls ? 'Done!' : 'Could not process that.');
      }

      const nid = 'a' + Date.now();
      setMsgs(prev => [...prev, { id: nid, role: 'assistant', content: aiText, ts: new Date() }]);
      setLatestId(nid); incrementMessageCount();
      if (aiText.length > 80 || text.includes('remember')) {
        addMemory('User: "' + text.substring(0, 50) + '" -> AI: "' + aiText.substring(0, 50) + '"', 'auto');
      }

    } catch (err: any) {
      const msg = err.message || '';
      const isQuota = msg.includes('429') || msg.includes('decommissioned') || msg.includes('deprecated') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('no longer');
      if (isQuota) {
        const all = aiSettings.provider === 'groq' ? [...Q_IDS, ...G_IDS] : [...G_IDS, ...Q_IDS];
        const cur = aiSettings.provider === 'groq' ? (aiSettings.groqModel === 'auto' ? Q_IDS[0] : aiSettings.groqModel) : (aiSettings.model === 'auto' ? G_IDS[1] : aiSettings.model);
        const idx = all.indexOf(cur);
        const next = all[idx + 1] || all[0];
        const toGroq = Q_IDS.includes(next);
        const nm = [...GEMINI, ...GROQ].find(m => m.id === next)?.name || next;
        if (toGroq) updateAISettings({ provider: 'groq', groqModel: next });
        else updateAISettings({ provider: 'gemini', model: next });
        setMsgs(prev => [...prev, { id: 'e' + Date.now(), role: 'assistant', content: 'Switched to ' + nm + ' (limit hit). Retrying...', ts: new Date() }]);
        setTimeout(() => sendMsg(text), 700);
      } else {
        setMsgs(prev => [...prev, { id: 'e' + Date.now(), role: 'assistant', content: '[!] ' + (msg || 'Failed. Check API key in Settings.'), ts: new Date() }]);
      }
    } finally { setLoading(false); }
  };

  const genImage = async (prompt: string) => {
    if (!aiSettings.apiKey) return;
    setGenImg(true);
    setMsgs(prev => [...prev, { id: 'uimg' + Date.now(), role: 'user', content: 'Generate image: ' + prompt, ts: new Date() }]);
    try {
      const ai = new GoogleGenAI({ apiKey: aiSettings.apiKey });
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseModalities: ['TEXT', 'IMAGE'] as any }
      });
      let imgData = '', caption = '';
      for (const p of res.candidates?.[0]?.content?.parts || []) {
        if ((p as any).inlineData) imgData = (p as any).inlineData.data;
        if ((p as any).text) caption = (p as any).text;
      }
      if (imgData) setMsgs(prev => [...prev, { id: 'aimg' + Date.now(), role: 'assistant', content: '![generated](data:image/png;base64,' + imgData + ')' + (caption ? '\n\n' + caption : ''), ts: new Date() }]);
      else setMsgs(prev => [...prev, { id: 'aimg' + Date.now(), role: 'assistant', content: 'Image generation failed.', ts: new Date() }]);
    } catch (e: any) {
      setMsgs(prev => [...prev, { id: 'aimg' + Date.now(), role: 'assistant', content: 'Image error: ' + (e.message || 'failed'), ts: new Date() }]);
    } finally { setGenImg(false); }
  };

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  };

  const MODELS = aiSettings.provider === 'groq' ? GROQ : GEMINI;
  const curModel = MODELS.find(m => m.id === (aiSettings.provider === 'groq' ? aiSettings.groqModel : aiSettings.model)) || MODELS[0];

  const hasBg = !!bg;

  return (
    <div className={cn('h-full flex flex-col relative overflow-hidden', hasBg ? '' : 'bg-[#0a0a0a]')}>
      {hasBg && (
        <div className="absolute inset-0 z-0">
          <img src={bg} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2.5 border-b z-10 flex-shrink-0',
        hasBg ? 'bg-black/30 border-white/10 backdrop-blur-md' : 'bg-[#111] border-white/6')}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={15} className="text-emerald-400" />}
          </div>
          <div className="relative min-w-0">
            <p className={cn('font-semibold text-sm truncate font-display', hasBg ? 'text-white' : 'text-white')}>{aiSettings.name}</p>
            <button onClick={() => setShowModels(!showModels)} className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {aiSettings.provider === 'groq' ? 'G: ' : 'M: '}{curModel.name}
              <ChevronDown size={9} />
            </button>
            <AnimatePresence>
              {showModels && (
                <motion.div initial={{ opacity: 0, y: -4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute top-full left-0 mt-1 w-52 bg-[#1a1a1a] border border-white/8 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex p-1 gap-1 border-b border-white/6">
                    {['gemini', 'groq'].map(p => (
                      <button key={p} onClick={() => updateAISettings({ provider: p as any })}
                        className={cn('flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                          aiSettings.provider === p ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:text-gray-300')}>
                        {p}
                      </button>
                    ))}
                  </div>
                  {MODELS.map(m => {
                    const active = aiSettings.provider === 'groq' ? aiSettings.groqModel === m.id : aiSettings.model === m.id;
                    return (
                      <button key={m.id} onClick={() => { if (aiSettings.provider === 'groq') updateAISettings({ groqModel: m.id }); else updateAISettings({ model: m.id }); setShowModels(false); }}
                        className={cn('w-full text-left px-3 py-2 text-xs font-medium transition-colors border-b border-white/4 last:border-0',
                          active ? 'text-emerald-400 bg-emerald-500/8' : 'text-gray-400 hover:text-white hover:bg-white/4')}>
                        {m.name}{m.id === 'auto' ? ' (switches automatically)' : ''}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={cn('hidden md:flex p-0.5 rounded-xl gap-0.5', hasBg ? 'bg-white/10' : 'bg-white/4')}>
            {[{id:'chat',i:MessageCircle},{id:'research',i:Search},{id:'supporter',i:Heart},{id:'planner',i:Calendar}].map(m => (
              <button key={m.id} onClick={() => updateAISettings({ mode: m.id as any })}
                className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                  aiSettings.mode === m.id ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-300')}>
                {m.id}
              </button>
            ))}
          </div>
          <button onClick={() => { const n = !autoPlay; setAutoPlay(n); localStorage.setItem('el_ap', n ? '1' : '0'); }}
            className={cn('p-1.5 rounded-xl transition-all', autoPlay ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-300 bg-white/4')}>
            <Volume2 size={14} />
          </button>
          <button onClick={() => {
            setIsLive(!isLive);
            if (!isLive) { setTimeout(startLive, 100); }
            else { setLiveListen(false); recRef.current?.stop(); stopSpeak(); }
          }} className={cn('p-1.5 rounded-xl transition-all', isLive ? 'bg-red-500 text-white' : 'text-gray-600 hover:text-gray-300 bg-white/4')}>
            {isLive ? <PhoneOff size={14} /> : <Phone size={14} />}
          </button>
          <button onClick={() => bgRef.current?.click()} className={cn('p-1.5 rounded-xl transition-all', hasBg ? 'bg-white/20 text-white' : 'text-gray-600 hover:text-gray-300 bg-white/4')}>
            <ImageIcon size={14} />
          </button>
          <input type="file" ref={bgRef} onChange={e => { const f = e.target.files?.[0]; if (f) setBg(URL.createObjectURL(f)); }} className="hidden" accept="image/*" />
          {hasBg && <button onClick={() => setBg(null)} className="p-1.5 rounded-xl bg-white/10 text-white"><X size={14} /></button>}
          <button onClick={() => setShowMem(!showMem)} className={cn('p-1.5 rounded-xl transition-all', showMem ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-300 bg-white/4')}>
            <Brain size={14} />
          </button>
          <button onClick={() => { if (confirm('Clear chat history?')) clearChatHistory(); }} className="p-1.5 rounded-xl text-gray-600 hover:text-red-400 bg-white/4 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Live mode overlay */}
      {isLive && (
        <div className={cn('flex-shrink-0 flex flex-col items-center py-5 gap-3 z-10 border-b',
          hasBg ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-[#111] border-white/6')}>
          <div className={cn('relative w-14 h-14 rounded-full flex items-center justify-center', liveListen ? 'bg-emerald-500/20' : 'bg-white/5')}>
            <Mic size={24} className={liveListen ? 'text-emerald-400 animate-pulse' : 'text-gray-500'} />
            {liveListen && <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping" />}
          </div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            {genVoice ? 'Thinking...' : speaking ? 'Speaking...' : liveListen ? 'Listening...' : 'Tap to start'}
          </p>
          <div className="flex gap-2">
            <button onClick={startLive} disabled={liveListen || !!speaking}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all">
              Listen
            </button>
            <button onClick={() => { setIsLive(false); setLiveListen(false); recRef.current?.stop(); stopSpeak(); }}
              className="px-4 py-1.5 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/10 transition-all">
              End
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 z-10 relative no-scrollbar">
        {msgs.map((msg, i) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                {aiSettings.avatar ? <img src={aiSettings.avatar} alt="" className="w-full h-full object-cover" /> : <Bot size={13} className="text-emerald-400" />}
              </div>
            )}
            <div className="max-w-[80%] group">
              <div className={cn('px-3.5 py-2.5 rounded-2xl',
                msg.role === 'user'
                  ? (hasBg ? 'bg-emerald-600/80 backdrop-blur text-white rounded-tr-sm' : 'bg-emerald-600 text-white rounded-tr-sm')
                  : (hasBg ? 'bg-black/50 backdrop-blur border border-white/10 text-white rounded-tl-sm' : 'bg-[#161616] border border-white/6 rounded-tl-sm'))}>
                {editId === msg.id ? (
                  <div className="space-y-2">
                    <textarea value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus className="w-full bg-transparent border-none outline-none resize-none min-h-[60px] text-sm text-inherit" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditId(null)} className="text-[10px] font-bold uppercase text-gray-400 px-2 py-1 rounded hover:bg-white/5">Cancel</button>
                      <button onClick={() => { setMsgs(p => p.slice(0, i)); sendMsg(editVal); setEditId(null); }} className="text-[10px] font-bold uppercase px-3 py-1 bg-emerald-500 text-white rounded-lg">Send</button>
                    </div>
                  </div>
                ) : msg.content.startsWith('![generated]') ? (
                  <div>
                    <img src={msg.content.match(/!\[generated\]\((.*?)\)/)?.[1]} alt="Generated" className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => { const s = msg.content.match(/!\[generated\]\((.*?)\)/)?.[1]; if (s) { const a = document.createElement('a'); a.href = s; a.download = 'image.png'; a.click(); } }} />
                    <p className="text-[9px] text-gray-500 mt-1">Click to download</p>
                  </div>
                ) : msg.role === 'assistant' ? (
                  <MarkdownMsg content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              <div className={cn('flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1',
                msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && <>
                  <button onClick={() => speakGemini(msg.content, msg.id)} className={cn('p-1 rounded-md transition-colors', speaking === msg.id || genVoice === msg.id ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-300')}>
                    {genVoice === msg.id ? <Loader2 size={9} className="animate-spin" /> : speaking === msg.id ? <VolumeX size={9} /> : <Volume2 size={9} />}
                  </button>
                  <button onClick={() => { setMsgs(p => p.slice(0, i + 1)); sendMsg(msgs[i - 1]?.content); }} className="p-1 rounded-md text-gray-600 hover:text-gray-300 transition-colors"><RotateCcw size={9} /></button>
                </>}
                {msg.role === 'user' && <button onClick={() => { setEditId(msg.id); setEditVal(msg.content); }} className="p-1 rounded-md text-gray-600 hover:text-gray-300"><Edit2 size={9} /></button>}
                <button onClick={() => copy(msg.content, msg.id)} className="p-1 rounded-md text-gray-600 hover:text-gray-300">
                  {copiedId === msg.id ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
                </button>
                <span className="text-[9px] text-gray-700">{format(msg.ts, 'HH:mm')}</span>
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                {userProfile?.avatar ? <img src={userProfile.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User size={13} className="text-gray-500" />}
              </div>
            )}
          </div>
        ))}
        {(loading || genImg) && (
          <div className="flex justify-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-emerald-400" />
            </div>
            <div className={cn('px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2', hasBg ? 'bg-black/50 backdrop-blur border border-white/10' : 'bg-[#161616] border border-white/6')}>
              {genImg
                ? <><Loader2 size={13} className="animate-spin text-purple-400" /><span className="text-xs text-gray-500">Generating image...</span></>
                : [0, 0.15, 0.3].map((d, i) => <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: d + 's' }} />)}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={cn('p-3 border-t z-10 flex-shrink-0', hasBg ? 'bg-black/40 border-white/10 backdrop-blur-md' : 'bg-[#111] border-white/6')}>
        {!(aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey) && (
          <div className="mb-2 p-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl flex items-center gap-2 text-amber-400">
            <Info size={12} /><p className="text-xs">Add your {aiSettings.provider === 'groq' ? 'Groq' : 'Gemini'} API key in Settings.</p>
          </div>
        )}
        {file && (
          <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl">
            <Paperclip size={11} className="text-emerald-400" />
            <span className="text-xs text-emerald-300 flex-1 truncate">{file.name}</span>
            <button onClick={() => setFile(null)}><X size={11} className="text-gray-600" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input type="file" ref={fileRef} className="hidden" accept=".txt,.md,.json,.csv,.js,.ts" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = ev => setFile({ name: f.name, content: ev.target?.result as string || '' }); r.readAsText(f);
          }} />
          <button onClick={() => fileRef.current?.click()} className="p-2 rounded-xl text-gray-600 hover:text-gray-300 bg-white/4 hover:bg-white/8 transition-all flex-shrink-0">
            <Paperclip size={15} />
          </button>
          <div className="flex-1">
            <textarea ref={textRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder={'Message ' + aiSettings.name + '... or say "generate image of..."'}
              rows={1}
              className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm resize-none outline-none transition-all leading-relaxed',
                hasBg ? 'bg-white/10 border border-white/15 text-white placeholder-white/30 focus:border-white/30' : 'bg-white/5 border border-white/6 text-gray-200 placeholder-gray-700 focus:border-emerald-500/30')} />
          </div>
          <button onClick={() => { setIsListen(true); try { recRef.current?.start(); } catch {} }} disabled={isListen}
            className={cn('p-2 rounded-xl transition-all flex-shrink-0', isListen ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-300 bg-white/4 hover:bg-white/8')}>
            <Mic size={15} />
          </button>
          <button onClick={() => sendMsg()} disabled={(!input.trim() && !file) || !(aiSettings.provider === 'groq' ? aiSettings.groqApiKey : aiSettings.apiKey) || loading}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-40 flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <Send size={15} />
          </button>
        </div>
        <div className="flex md:hidden justify-center gap-2 mt-2">
          {[{id:'chat'},{id:'research'},{id:'supporter'},{id:'planner'}].map(m => (
            <button key={m.id} onClick={() => updateAISettings({ mode: m.id as any })}
              className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-all',
                aiSettings.mode === m.id ? 'bg-emerald-500 text-white' : 'text-gray-600')}>
              {m.id}
            </button>
          ))}
        </div>
      </div>

      {/* Memory panel */}
      <AnimatePresence>
        {showMem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMem(false)} className="fixed inset-0 bg-black/50 z-40 lg:hidden" />
            <motion.div key="mem" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 20 }}
              className="fixed lg:absolute inset-y-0 right-0 w-72 bg-[#111] border-l border-white/6 flex flex-col z-50">
              <div className="p-4 border-b border-white/6 flex items-center justify-between">
                <div className="flex items-center gap-2"><Brain size={15} className="text-emerald-400" /><span className="font-semibold text-sm text-white">Memory</span></div>
                <div className="flex gap-1">
                  <button onClick={() => addMemory('Note...', 'manual')} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/8 transition-colors"><Plus size={13} /></button>
                  <button onClick={() => setShowMem(false)} className="p-1.5 bg-white/5 rounded-lg lg:hidden"><X size={13} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                {aiMemory.length === 0
                  ? <p className="text-center text-sm text-gray-600 mt-10">No memories yet</p>
                  : aiMemory.map(m => (
                    <div key={m.id} className="p-3 bg-white/4 rounded-xl border border-white/5 group">
                      <p className="text-xs text-gray-400 leading-relaxed">{m.content}</p>
                      <div className="mt-1.5 flex justify-between items-center">
                        <span className="text-[9px] text-gray-700">{format(new Date(m.date), 'MMM d')}</span>
                        <button onClick={() => {}} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
