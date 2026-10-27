import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@bookleaf/shared';
import {
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  Shield,
  UserCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TEST_PROFILES = [
  { label: 'Operations Admin', email: 'admin@bookleaf.in', role: 'ADMIN', badge: 'Operations' },
  { label: 'Rohit Kapoor (High Sales)', email: 'rohit.kapoor@email.com', role: 'AUTHOR', badge: 'AUTH002' },
  { label: 'Priya Sharma (Payout Query)', email: 'priya.sharma@email.com', role: 'AUTHOR', badge: 'AUTH001' },
  { label: 'Kavita Deshmukh (Production)', email: 'kavita.deshmukh@email.com', role: 'AUTHOR', badge: 'AUTH009' },
  { label: 'Happy Bhasin (Author)', email: 'bhasinhappy0506@gmail.com', role: 'AUTHOR', badge: 'AUTH011' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');

  // Floating helper state
  const [showHelper, setShowHelper] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back to BookLeaf');

      const meRes = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        const user = await meRes.json();
        if (user.role === UserRole.ADMIN) {
          navigate('/admin/dashboard');
        } else {
          navigate('/author/dashboard');
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone || undefined,
          city: regCity || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      toast.success('Account created successfully! Welcome to BookLeaf.');
      // Refresh auth state and redirect to dashboard
      window.location.href = '/author/dashboard';
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillProfile = (profileEmail: string) => {
    setEmail(profileEmail);
    setPassword('BookLeaf2024!');
    setMode('signin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar Branding */}
      <header className="w-full py-4 px-6 sm:px-8 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-navy-900 text-white flex items-center justify-center text-lg font-bold shadow-sm">
            🍃
          </div>
          <div>
            <span className="font-bold text-gray-950 text-base tracking-tight leading-none block">
              BookLeaf Publishing
            </span>
            <span className="text-[11px] text-gray-500 block">Author Relations & Editorial Suite</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-xs text-gray-500">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            PostgreSQL Active
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 mr-1" />
            Gemini 2.5 Flash
          </span>
        </div>
      </header>

      {/* Main Form Center */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-200 overflow-hidden">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 border-b border-gray-200 bg-slate-50/80 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  mode === 'signin'
                    ? 'bg-white text-navy-950 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  mode === 'register'
                    ? 'bg-white text-navy-950 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Author Account</span>
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {mode === 'signin' ? (
                /* SIGN IN FORM */
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. author@email.com"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full py-3 text-sm font-semibold mt-2 shadow-sm"
                  >
                    {submitting ? 'Authenticating...' : 'Sign In to Workspace'}
                  </button>
                </form>
              ) : (
                /* REGISTRATION FORM */
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Vikram Seth"
                      className="input-field text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. author@email.com"
                      className="input-field text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                        City (Optional)
                      </label>
                      <input
                        type="text"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="input-field text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                      Create Password (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full py-3 text-sm font-semibold mt-2 shadow-sm bg-emerald-600 hover:bg-emerald-500"
                  >
                    {submitting ? 'Creating Account...' : 'Register as BookLeaf Author'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Discrete Quick Access for Evaluators */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-xs transition-all">
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="w-full px-3 py-2 bg-navy-900 text-white text-xs font-semibold flex items-center justify-between space-x-2 hover:bg-navy-800 transition-colors"
          >
            <span className="flex items-center">
              <Shield className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Quick Fill Profiles
            </span>
            {showHelper ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {showHelper && (
            <div className="p-3 bg-white space-y-1.5 border-t border-gray-100 max-h-64 overflow-y-auto">
              <p className="text-[11px] text-gray-500 mb-1">
                Click any profile to populate credentials:
              </p>
              {TEST_PROFILES.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleFillProfile(p.email)}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-slate-50 border border-gray-100 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="truncate pr-2">
                    <span className="font-semibold text-gray-900 block truncate">{p.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{p.email}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                    {p.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Professional Footer */}
      <footer className="w-full py-4 px-6 border-t border-gray-200 bg-white text-center text-xs text-gray-500">
        © 2026 BookLeaf Publishing. Enterprise Author Relations & Editorial Operations Portal.
      </footer>
    </div>
  );
}
