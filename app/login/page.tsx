'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, WalletCards } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok) {
        setError(result?.error ?? 'Unable to sign in. Please try again.');
        return;
      }
      const destination = params.get('next');
      router.replace(destination && destination.startsWith('/') ? destination : '/');
      router.refresh();
    } catch {
      setError('We could not reach the service. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <label className="block text-sm font-medium">
        Email address
        <input
          autoComplete="email"
          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password</span>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
            tabIndex={-1}
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 pr-11 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <button
        disabled={isSubmitting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-sm transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
      >
        {isSubmitting ? (
          'Signing in…'
        ) : (
          <>
            Sign in <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-[420px]">
        <div className="mb-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-[var(--ink-contrast)] shadow-sm">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">Expense Tracker</p>
            <p className="text-xs text-[var(--text-muted)]">Private personal finance</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_60px_-34px_rgba(27,32,44,.45)] sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-medium text-[var(--accent)]">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Your money, kept personal.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Sign in to view only the financial data you created.
            </p>
          </div>
          <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading form...</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            New here?{' '}
            <Link className="font-semibold text-[var(--accent)] hover:underline" href="/create-account">
              Create your account
            </Link>
          </p>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <LockKeyhole className="h-3.5 w-3.5" /> Secure, private account access
        </p>
      </section>
    </main>
  );
}
