import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Mail,
  User as UserIcon
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMessage }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemo } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google Sign-in was cancelled or encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name.');
        }
        await signUpWithEmail(email, password, displayName);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let msg = err?.message || 'Failed to authenticate.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found')) {
        msg = 'Invalid email or password. You can also use the one-click Demo Reviewer button below!';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'Email already registered. Please switch to Sign In or use Google login.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInAsDemo('user');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-800 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-indigo-100 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Earn ₹20 Per Verified Product Review
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tab === 'signin' ? 'Reviewer Login' : 'Start Earning Today'}
          </h2>
          <p className="text-xs text-indigo-100 mt-1">
            {initialMessage || 'Sign in to access Amazon India, Flipkart & Quick-commerce product tasks.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'signin'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Reviewer Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              tab === 'signup'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Register / Join
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or with Email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In as Reviewer' : 'Create Free Reviewer Account'}
            </button>
          </form>

          {/* Quick Reviewer Demo Option (Admin login is completely removed from customer portal) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>One-Click Demo Reviewer Sign In</span>
            </button>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-500">
              {tab === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                {tab === 'signin' ? 'Register now' : 'Sign In'}
              </button>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
