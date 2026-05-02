import React, { useState, useRef } from 'react';
import { X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroVideoProps {
  onComplete: () => void;
  videoUrl?: string;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({ onComplete, videoUrl }) => {
  const [showContent, setShowContent] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Show "Start" button after a short delay or when video is ready
  React.useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] flex items-center justify-center overflow-hidden">
      {/* Background Video - Subtle Integration */}
      <video
        ref={videoRef}
        src={videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-cinematic-mountain-range-at-sunset-1224-large.mp4"}
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      {/* Content */}
      <AnimatePresence>
        {showContent && (
          <div className="relative z-10 text-center px-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h1 className="text-7xl md:text-9xl font-black text-white tracking-widest uppercase leading-none opacity-90 italic">
                  E<span className="text-blue-500">L</span>EVATE
                </h1>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-12 bg-blue-500/50" />
                  <p className="text-blue-400 font-bold uppercase tracking-[0.4em] text-[10px]">Behavioral Sync Initiated</p>
                  <div className="h-px w-12 bg-blue-500/50" />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className="group relative px-20 py-6 bg-white rounded-full overflow-hidden transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-blue-500/20"
              >
                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10 text-slate-950 group-hover:text-white font-black uppercase tracking-[0.2em] text-xs flex items-center gap-3">
                  Start Program
                  <Play className="w-3 h-3 fill-current" />
                </span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Skip Button - Minimalist */}
      <button 
        onClick={handleStart}
        className="absolute bottom-12 right-12 text-white/20 hover:text-white transition-colors font-black text-[9px] uppercase tracking-widest"
      >
        Forward_Protocol (Skip)
      </button>
    </div>
  );
};
