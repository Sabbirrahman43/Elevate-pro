import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Lock, Mail, Chrome, ArrowRight, Loader2, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" }>({ text: "", type: "error" });
  const [isMuted, setIsMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {
      // Autoplay blocked — still show form
      setVideoReady(true);
    });
  }, []);

  useEffect(() => {
    if (videoReady) {
      const t = setTimeout(() => setFormVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, [videoReady]);

  const setMsg = (text: string, type: "error" | "success" = "error") => setMessage({ text, type });

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setMsg("Please fill in all fields."); return; }
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }

    setLoading(true);
    setMessage({ text: "", type: "error" });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state change in useStore handles the rest
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created! Check your email to confirm, then sign in.", "success");
        setIsLogin(true);
      }
    } catch (err: any) {
      // Make error messages human-readable
      const raw = err.message || "Something went wrong.";
      if (raw.includes("Invalid login credentials")) setMsg("Wrong email or password. Try again.");
      else if (raw.includes("Email not confirmed")) setMsg("Please confirm your email first, then sign in.");
      else if (raw.includes("already registered")) setMsg("This email is already registered. Sign in instead.");
      else setMsg(raw);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage({ text: "", type: "error" });
    try {
      // Simple redirect — most reliable, no popup issues
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Page will redirect to Google then come back — loading stays true
    } catch (err: any) {
      setMsg(err.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setMsg("Enter your email address first, then click this."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Password reset link sent to your email!", "success");
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setMessage({ text: "", type: "error" });
    setPassword("");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden bg-[#020617]">
      {/* Background video — full quality, looping */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: videoReady ? 0.5 : 0, transition: "opacity 1.2s ease" }}
        loop
        playsInline
        muted={isMuted}
        onCanPlay={() => setVideoReady(true)}
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-slate-950/40 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60 z-0 pointer-events-none" />

      {/* Mute */}
      <div className="absolute top-8 right-8 z-40">
        <button
          onClick={() => {
            const next = !isMuted;
            setIsMuted(next);
            if (videoRef.current) videoRef.current.muted = next;
          }}
          className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all shadow-2xl backdrop-blur-xl"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={formVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.96 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full bg-slate-900/20 backdrop-blur-3xl rounded-[3rem] p-12 border border-white/10 relative z-10 shadow-[0_0_80px_rgba(37,99,235,0.25)] mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-[1.75rem] flex items-center justify-center border border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
              <span className="text-white font-black text-4xl italic">E</span>
            </div>
            <div className="text-white/20 font-black text-2xl">×</div>
            <div className="w-20 h-20 bg-white rounded-[1.75rem] flex items-center justify-center">
              <Chrome className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase italic">
            Pranto <span className="text-blue-500">AI</span>
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
            <input
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-16 pr-6 outline-none focus:border-blue-500 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password (min 6 characters)"
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 pl-16 pr-14 outline-none focus:border-blue-500 transition-all font-bold text-white placeholder:text-slate-600 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {isLogin && (
            <div className="text-right -mt-2">
              <button type="button" onClick={handleForgotPassword} disabled={loading}
                className="text-[11px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest disabled:opacity-50">
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.15em] text-sm shadow-[0_15px_35px_rgba(37,99,235,0.4)]">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>{isLogin ? "Sign In" : "Create Account"}<ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 relative text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
          <span className="relative z-10 px-6 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]" style={{ background: "transparent" }}>or</span>
        </div>

        {/* Google */}
        <button onClick={handleGoogleLogin} disabled={loading}
          className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl flex items-center justify-center gap-4 hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50">
          <Chrome className="w-6 h-6 text-red-500" />
          <span className="font-black text-white text-xs uppercase tracking-widest">Continue with Google</span>
        </button>

        {/* Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "mt-6 p-4 rounded-2xl border text-[11px] font-bold text-center leading-relaxed",
                message.type === "success"
                  ? "bg-green-600/10 border-green-500/20 text-green-400"
                  : "bg-red-600/10 border-red-500/20 text-red-400"
              )}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Switch mode */}
        <div className="mt-10 flex flex-col items-center gap-5">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
            {isLogin ? "New here?" : "Already have an account?"}{" "}
            <button onClick={toggleMode} className="text-blue-500 font-black hover:text-blue-400 underline underline-offset-4">
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </p>

          <button
            onClick={() => {
              localStorage.setItem("pranto_ai_guest", "true");
              window.location.reload();
            }}
            className="w-full bg-transparent border border-white/10 py-4 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all font-black uppercase tracking-widest text-[10px]"
          >
            Continue offline (Guest mode)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
