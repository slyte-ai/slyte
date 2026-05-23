/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '../supabase';

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export default function SignUp({ onNavigateToSignIn }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanUsername = username.toLowerCase().trim().replace(/\s+/g, '.');
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, . or _).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: fullName.trim() || cleanUsername,
          profile_picture_url: null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setMessage('Account created. Welcome to Slyte!');
    } else {
      setMessage('Check your email to confirm your account, then sign in.');
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-1 flex-col justify-center overflow-y-auto bg-black px-6 py-8 no-select">
      <div className="mb-8 text-center">
        <h2 className="mb-1 bg-gradient-to-r from-white via-cyan-300 to-[#0066FF] bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent">
          Slyte
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-[#8E8E8E]">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="signup-username"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center font-mono text-xs font-bold text-[#0066FF]">
              @
            </span>
            <input
              id="signup-username"
              type="text"
              required
              placeholder="your.handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-900 bg-slate-950 py-3 pl-8 pr-4 font-mono text-xs text-white transition-colors focus:border-[#0066FF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="signup-fullname"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Full name
          </label>
          <input
            id="signup-fullname"
            type="text"
            placeholder="Optional"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-slate-900 bg-slate-950 px-4 py-3 text-xs text-white transition-colors focus:border-[#0066FF] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Email
          </label>
          <input
            id="signup-email"
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
            htmlFor="signup-password"
            className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="At least 6 characters"
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

        {message && (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center text-[10px] font-semibold leading-snug text-emerald-400">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-[#0066FF] py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-transform hover:from-sky-500 hover:to-blue-600 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          <span>{loading ? 'Creating account…' : 'Sign Up'}</span>
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onNavigateToSignIn}
          className="font-semibold text-[#0066FF] hover:underline"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
