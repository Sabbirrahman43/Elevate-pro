import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 1800); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50">
      <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-6 animate-pulse">
        <Zap size={40} className="text-emerald-400" />
      </div>
      <h1 className="text-3xl font-bold text-white font-display tracking-tight">Elevate</h1>
      <p className="text-sm text-gray-500 mt-2">Your AI productivity companion</p>
    </div>
  );
};
