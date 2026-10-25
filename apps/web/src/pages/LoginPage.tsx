import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@bookleaf/shared';
import { LogIn, KeyRound, UserCheck, Shield, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { label: 'Admin (Operations)', email: 'admin@bookleaf.in', role: 'ADMIN' },
  { label: 'Priya Sharma (2 books, royalty pending)', email: 'priya.sharma@email.com', role: 'AUTHOR' },
  { label: 'Rohit Kapoor (2 books, bestseller)', email: 'rohit.kapoor@email.com', role: 'AUTHOR' },
  { label: 'Ananya Reddy (1 book, first payout pending)', email: 'ananya.reddy@email.com', role: 'AUTHOR' },
  { label: 'Vikram Joshi (2 books, print quality issue)', email: 'vikram.joshi@email.com', role: 'AUTHOR' },
  { label: 'Meera Nair (2 books, zero pending)', email: 'meera.nair@email.com', role: 'AUTHOR' },
  { label: 'Arjun Malhotra (1 book, new author)', email: 'arjun.malhotra@email.com', role: 'AUTHOR' },
  { label: 'Sneha Kulkarni (3 books, 1 in production)', email: 'sneha.kulkarni@email.com', role: 'AUTHOR' },
  { label: 'Farhan Sheikh (1 book, poetry)', email: 'farhan.sheikh@email.com', role: 'AUTHOR' },
  { label: 'Kavita Deshmukh (2 books, 1 in production)', email: 'kavita.deshmukh@email.com', role: 'AUTHOR' },
  { label: 'Diya Chatterjee (2 books, recent publication)', email: 'diya.chatterjee@email.com', role: 'AUTHOR' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@bookleaf.in');
  const [password, setPassword] = useState('BookLeaf2024!');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');

      // Check current user role to redirect
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

  const handleSelectDemo = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setPassword('BookLeaf2024!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-navy-900 shadow-md text-3xl mb-4">
          🍃
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-navy-950">
          BookLeaf Publishing
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Author Support & Operational Communication Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card p-6 sm:p-8 shadow-sm border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {submitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Demo Accounts Quick-Fill
              </span>
              <span className="text-xs text-navy-600 bg-navy-50 px-2 py-0.5 rounded font-mono">
                PW: BookLeaf2024!
              </span>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleSelectDemo('admin@bookleaf.in')}
                className={`text-xs py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                  email === 'admin@bookleaf.in'
                    ? 'border-navy-600 bg-navy-50 text-navy-900 font-semibold'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-navy-700" />
                  Admin
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded">STAFF</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemo('priya.sharma@email.com')}
                className={`text-xs py-2 px-3 rounded-lg border text-left flex items-center justify-between transition-colors ${
                  email === 'priya.sharma@email.com'
                    ? 'border-navy-600 bg-navy-50 text-navy-900 font-semibold'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex items-center truncate">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                  Priya (AUTH001)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded">AUTHOR</span>
              </button>
            </div>

            {/* Full dropdown for all 10 authors */}
            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Or select any author from sample dataset:
              </label>
              <select
                onChange={(e) => handleSelectDemo(e.target.value)}
                value={email}
                className="input-field text-xs py-2 bg-slate-50 cursor-pointer"
              >
                {DEMO_ACCOUNTS.map((acc) => (
                  <option key={acc.email} value={acc.email}>
                    [{acc.role}] {acc.label} — {acc.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          BookLeaf Publishing Assessment Portal • File-backed Dev Store
        </p>
      </div>
    </div>
  );
}
