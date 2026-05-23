/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '../supabase';

interface SignInProps {
  onNavigateToSignUp: () => void;
}

export default function SignIn({ onNavigateToSignUp }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 flex-col justify-center bg-black px-6 py-8 no-select">
      <div className="mb-8 text-center">
        <h2 className="mb-1 bg-gradient-to-r from-white via-cyan-300 to-[#0066FF] bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent">
          Slyte
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-[#8E8E8E]">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="signin-email"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-900 bg-slate-950 px-4 py-3 text-xs text-white transition-colors focus:border-[#0066FF] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="signin-password"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-900 bg-slate-950 px-4 py-3 text-xs text-white transition-colors focus:border-[#0066FF] focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-center text-[10px] font-semibold leading-snug text-rose-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-[#0066FF] py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-transform hover:from-sky-500 hover:to-blue-600 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          <span>{loading ? 'Signing in…' : 'Sign In'}</span>
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onNavigateToSignUp}
          className="font-semibold text-[#0066FF] hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
