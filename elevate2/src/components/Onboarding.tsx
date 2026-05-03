import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChevronRight, Zap } from 'lucide-react';

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateUserProfile, updateAISettings } = useAppContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState('');
  const [persona, setPersona] = useState('Coach');

  const personas = ['Coach', 'Friend', 'Partner', 'Teacher', 'Trainer', 'Wife', 'Girlfriend'];

  const finish = () => {
    updateUserProfile({ name, goals });
    updateAISettings({ persona });
    onComplete();
  };

  const steps = [
    {
      title: 'Welcome to Elevate',
      sub: 'Your AI-powered life OS. Let\'s personalize it.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">What should we call you?</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus
              className="w-full h-12 px-4 bg-white/5 border border-white/8 rounded-xl text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all" />
          </div>
        </div>
      ),
    },
    {
      title: 'What are your goals?',
      sub: 'Your AI will align everything around these.',
      content: (
        <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={4} placeholder="e.g. Build a cybersecurity career, get fit, learn new skills, move to Europe..." autoFocus
          className="w-full p-4 bg-white/5 border border-white/8 rounded-xl text-white placeholder-gray-700 outline-none focus:border-emerald-500/40 transition-all resize-none" />
      ),
    },
    {
      title: 'Choose your AI persona',
      sub: 'How should your AI companion interact with you?',
      content: (
        <div className="grid grid-cols-3 gap-2">
          {personas.map(p => (
            <button key={p} onClick={() => setPersona(p)}
              className={'p-3 rounded-xl border text-sm font-semibold transition-all ' + (persona === p ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/5 border-white/8 text-gray-400 hover:text-white hover:bg-white/8')}>
              {p}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Zap size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white font-display">{current.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{current.sub}</p>
        </div>
        <div className="mb-6">{current.content}</div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => <div key={i} className={'w-2 h-2 rounded-full ' + (i === step ? 'bg-emerald-400' : 'bg-white/10')} />)}
          </div>
          <button onClick={step < steps.length - 1 ? () => setStep(s => s + 1) : finish}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all">
            {step < steps.length - 1 ? 'Next' : 'Get Started'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
