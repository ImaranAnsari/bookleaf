import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-xl mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">BookLeaf Publishing</h1>
          <p className="text-slate-400 mt-2 text-sm">Author Support & Communication Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@email.com or admin@bookleafpub.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg hover:shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Evaluator Login Pills */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Evaluator Quick-Fill:
              </span>
              <span className="text-[11px] text-amber-400 font-medium">1-Click credentials</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickFill('admin@bookleafpub.com', 'admin123')}
                className="w-full text-left p-2.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200 transition"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-semibold text-white">Admin Operations</span>
                    <span className="text-slate-400 ml-1.5">(Aarav Mehta)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('priya.sharma@email.com', 'author123')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-semibold text-white">Priya Sharma</span>
                    <span className="text-slate-400 ml-1.5">(2 Books • Overdue Royalty Query)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('sneha.kulkarni@email.com', 'author123')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-semibold text-white">Sneha Kulkarni</span>
                    <span className="text-slate-400 ml-1.5">(3 Books • Production & Amazon Query)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('kavita.deshmukh@email.com', 'author123')}
                className="w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300 transition"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-semibold text-white">Kavita Deshmukh</span>
                    <span className="text-slate-400 ml-1.5">(In-Production & ₹850 Rollover)</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Pre-seeded with official 10 authors, 18 titles, and realistic support tickets.
        </p>
      </div>
    </div>
  );
};
