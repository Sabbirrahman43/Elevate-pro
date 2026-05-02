import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Lock, Mail, ArrowRight, Loader2, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowForm(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const msg = (text: string, err = false) => { setMessage(text); setIsError(err); };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); msg("");
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        msg("Check your email for a confirmation link.");
      }
    } catch (err: any) { msg(err.message || "Something went wrong.", true); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true); msg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) { msg(err.message || "Google login failed.", true); setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email) { msg("Enter your email first.", true); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) msg(error.message, true);
    else msg("Reset link sent! Check your email.");
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !muted;
    setMuted(m => !m);
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">

      {/* YOUR VIDEO - fullscreen background */}
      <video ref={videoRef} src="/intro.mp4" autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55 }}
      />

      {/* Dark overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" />

      {/* Mute toggle */}
      <button onClick={toggleMute}
        className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white/60 hover:text-white transition-all border border-white/10">
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* App name top */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="text-5xl font-black text-white tracking-[0.25em] uppercase">
            ELEVATE
          </h1>
          <p className="text-white/40 text-[10px] tracking-[0.4em] uppercase mt-1 font-semibold">
            AI Productivity System
          </p>
        </motion.div>
      </div>

      {/* Login card */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 w-full max-w-xs mx-4"
          >
            <div className="bg-black/60 backdrop-blur-2xl border border-white/12 rounded-3xl p-6 shadow-2xl">

              <h2 className="text-lg font-bold text-white mb-1">
                {isLogin ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-white/40 text-xs mb-5">
                {isLogin ? "Sign in to continue" : "Start your journey today"}
              </p>

              <form onSubmit={handleEmail} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input type="email" placeholder="Email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/8 border border-white/12 text-white placeholder-white/25 rounded-xl py-2.5 pl-9 pr-3 outline-none focus:border-blue-500/50 focus:bg-white/12 transition-all text-sm" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                  <input type="password" placeholder="Password" required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/8 border border-white/12 text-white placeholder-white/25 rounded-xl py-2.5 pl-9 pr-3 outline-none focus:border-blue-500/50 focus:bg-white/12 transition-all text-sm" />
                </div>
                {isLogin && (
                  <div className="text-right -mt-1">
                    <button type="button" onClick={handleForgot}
                      className="text-[11px] text-blue-400/80 hover:text-blue-400">Forgot password?</button>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-600/25">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? "Sign In" : "Sign Up"} <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <button onClick={handleGoogle} disabled={loading}
                className="w-full bg-white/8 hover:bg-white/15 border border-white/12 py-2.5 rounded-xl flex items-center justify-center gap-2.5 transition-all text-sm font-semibold text-white disabled:opacity-50">
                <svg width="15" height="15" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button onClick={() => { localStorage.setItem("elevate_guest","true"); window.location.reload(); }}
                className="mt-2 w-full bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs">
                Skip Login (Local Mode)
              </button>

              <p className="mt-4 text-center text-white/30 text-xs">
                {isLogin ? "No account? " : "Have one? "}
                <button onClick={() => { setIsLogin(!isLogin); msg(""); }}
                  className="text-blue-400 font-bold hover:text-blue-300">{isLogin ? "Sign Up" : "Sign In"}</button>
              </p>

              {message && (
                <div className={`mt-3 p-2.5 rounded-xl text-xs font-medium text-center border ${isError ? "bg-red-500/12 border-red-500/20 text-red-400" : "bg-blue-500/12 border-blue-500/20 text-blue-400"}`}>
                  {message}
                </div>
              )}
            </div>

            {/* Credits */}
            <div className="mt-4 text-center">
              <p className="text-white/20 text-[10px] mb-2">Built by <span className="text-white/35">Sabbir Rahman</span></p>
              <div className="flex items-center justify-center gap-5">
                <a href="https://github.com/Sabbirrahman43" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white transition-colors">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
                <a href="https://www.linkedin.com/in/pranto-rahman-118b88321/" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-blue-400 transition-colors">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://www.instagram.com/al_rahman006" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-pink-400 transition-colors">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
