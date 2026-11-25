import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { prototypeSessionStorage } from '../../services/ascendApiService';
import { authApi, ApiError } from '../../services/api';
import { mapAuthMeToUserState } from '../../services/api/mappers';
import { UserProfile, NutritionGoals } from '../../types/ascend';

export interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'signin' | 'signup';
  onClose: () => void;
  onSignInSuccess: (account: {
    name: string;
    email: string;
    rememberMe: boolean;
    userProfile?: UserProfile;
    goals?: NutritionGoals;
  }) => void;
  onSignUpSuccess: (account: {
    name: string;
    email: string;
    password?: string;
  }) => void;
  onExploreDemo: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'signin',
  onClose,
  onSignInSuccess,
  onSignUpSuccess,
  onExploreDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [showSignUpPass, setShowSignUpPass] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setSignInError(null);
    setSignUpError(null);
    setIsSubmitting(false);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    const email = signInEmail.trim();
    if (!email || !signInPassword) {
      setSignInError('Please enter both your email address and password.');
      return;
    }

    // Demo account shortcut (exact demo email only)
    if (email.toLowerCase() === 'alex.rivera@ascend.app') {
      onSignInSuccess({
        name: 'Alex Rivera (Demo)',
        email: 'alex.rivera@ascend.app',
        rememberMe,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Authenticate with live FastAPI backend
      await authApi.login({
        username: email,
        password: signInPassword,
      });

      // Retrieve full composite account and profile
      const me = await authApi.getMe();
      const mapped = mapAuthMeToUserState(me);

      onSignInSuccess({
        name: mapped.account.name,
        email: mapped.account.email,
        rememberMe,
        userProfile: mapped.userProfile,
        goals: mapped.goals,
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        setSignInError(err.message);
      } else {
        setSignInError(err?.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    const name = signUpName.trim();
    const email = signUpEmail.trim();

    if (!name) {
      setSignUpError('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setSignUpError('Please enter a valid email address.');
      return;
    }
    if (signUpPassword.length < 8) {
      setSignUpError('Password must be at least 8 characters long for backend security.');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setSignUpError('Passwords do not match. Please re-enter.');
      return;
    }

    onSignUpSuccess({
      name,
      email,
      password: signUpPassword,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Brand & Close */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#0A1628] flex items-center justify-center text-blue-300 font-bold font-mono text-sm shadow-xs">
              ▲
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="text-base font-bold font-display text-[#0A1628] leading-tight"
              >
                ASCEND
              </h2>
              <p className="text-[11px] text-[#2563EB] font-semibold">
                Getting Better Every Day.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Body Forms */}
        <div className="p-6 pt-4 overflow-y-auto space-y-4">
          {activeTab === 'signin' ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {signInError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{signInError}</span>
                </div>
              )}

              {showForgotNotice && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#0A1628] text-xs flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#2563EB]" />
                  <span>
                    Automated email password recovery is not configured in this deployment. Contact your administrator or register a new account.
                  </span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="name@example.com"
                prefixIcon={<Mail className="h-4 w-4" />}
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-slate-700 select-none"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(!showForgotNotice)}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="signin-password"
                    type={showSignInPass ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPass(!showSignInPass)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    aria-label={showSignInPass ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 border-slate-300"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              <Button type="submit" variant="primary" className="w-full py-2.5" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  'Sign In to ASCEND'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              {signUpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{signUpError}</span>
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                value={signUpName}
                onChange={(e) => setSignUpName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                prefixIcon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                placeholder="name@example.com"
                prefixIcon={<Mail className="h-4 w-4" />}
                required
              />

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-slate-700 select-none"
                >
                  Create Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="signup-password"
                    type={showSignUpPass ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPass(!showSignUpPass)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    aria-label={showSignUpPass ? 'Hide password' : 'Show password'}
                  >
                    {showSignUpPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Input
                label="Confirm Password"
                type="password"
                value={signUpConfirm}
                onChange={(e) => setSignUpConfirm(e.target.value)}
                placeholder="Re-type password"
                prefixIcon={<Lock className="h-4 w-4" />}
                required
              />

              <Button type="submit" variant="primary" className="w-full py-2.5">
                Create Account & Select Pathway
              </Button>
            </form>
          )}

          {/* Dedicated Demo Mode Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onExploreDemo();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/75 hover:bg-blue-50 text-[#1D4ED8] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>Explore Instant Demo Mode (No signup required)</span>
            </button>

            {/* Session Security Notice */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 text-[#2563EB] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#0A1628]">Session Security:</strong> Accounts use Argon2id password hashing, memory-only access tokens, and rotating HttpOnly cookies.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
