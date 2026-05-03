import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, loginWithGoogle } = useAppContext();
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isForgot) {
        setSuccess('Password reset email sent! Check your inbox.');
      } else if (isSignup) {
        await signup(email, password, name);
        setSuccess('Account created! Check your email to verify.');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await loginWithGoogle(); }
    catch (err: any) { setError(err.message || 'Google sign in failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Zap size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Elevate</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isForgot ? 'Reset your password' : isSignup ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <div className="bg-[#111] border border-white/6 rounded-2xl p-6">
          {/* Google button */}
          {!isForgot && (
            <>
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-11 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-50 mb-4">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-xs text-gray-600">or</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignup && !isForgot && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Your Name</label>
                <input value={name} onChange={e => setName(e.target.value)} type="text"
                  placeholder="Sabbir Rahman"
                  className="w-full h-11 px-4 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="you@example.com" required
                className="w-full h-11 px-4 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all" />
            </div>
            {!isForgot && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'} placeholder="password" required
                    className="w-full h-11 px-4 pr-11 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">{success}</p>}

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isForgot ? 'Send Reset Email' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            {!isForgot && (
              <button onClick={() => { setIsSignup(!isSignup); setError(''); setSuccess(''); }}
                className="text-xs text-gray-500 hover:text-emerald-400 transition-colors block w-full">
                {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
            {!isSignup && (
              <button onClick={() => { setIsForgot(!isForgot); setError(''); setSuccess(''); }}
                className="text-xs text-gray-500 hover:text-emerald-400 transition-colors block w-full">
                {isForgot ? 'Back to sign in' : 'Forgot password?'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          Built by <span className="text-gray-500">@pranto_raman</span>
        </p>
      </div>
    </div>
  );
};
