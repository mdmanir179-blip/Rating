import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMessage }) => {
  const { signInWithManualCredentials, signUpWithManualCredentials } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      setError('Please enter your Email Address or Mobile Number.');
      return;
    }

    if (!cleanPass) {
      setError('Please enter your password.');
      return;
    }

    if (tab === 'signup') {
      if (!displayName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (cleanPass.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (cleanPass !== confirmPassword.trim()) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    setLoading(true);

    try {
      if (tab === 'signin') {
        await signInWithManualCredentials(cleanId, cleanPass);
      } else {
        await signUpWithManualCredentials(displayName.trim(), cleanId, cleanPass);
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Failed to authenticate.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        msg = 'Incorrect password. Please verify and try again.';
      } else if (msg.includes('auth/user-not-found')) {
        msg = 'Account not found with this email/number. Please register first.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'This email/number is already registered. Please switch to Sign In.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPhone = !identifier.includes('@') && identifier.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        
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
            Earn ₹20 Cash Per Verified Product Review
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tab === 'signin' ? 'Reviewer Login' : 'Register New Account'}
          </h2>
          <p className="text-xs text-indigo-100 mt-1">
            {initialMessage || 'Manual Login using Email or Mobile Number & Password.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
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
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name for Sign Up */}
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

            {/* Email or Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address or Mobile Number
              </label>
              <div className="relative">
                {isPhone ? (
                  <Phone className="w-4 h-4 text-indigo-600 absolute left-3 top-3" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                )}
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or 9876543210"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your 10-digit mobile number or standard email address
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password for Sign Up */}
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : tab === 'signin' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sign In as Reviewer</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Free Reviewer Account</span>
                </>
              )}
            </button>
          </form>

          {/* Switch tab link */}
          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500">
              {tab === 'signin' ? "Don't have an account? " : "Already registered? "}
              <button
                type="button"
                onClick={() => {
                  setTab(tab === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                {tab === 'signin' ? 'Register with Email / Phone' : 'Sign In'}
              </button>
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
