'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { AuthHeader } from '@/components/auth/auth-header';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if redirected with notice (e.g. ?registered=true or ?reset=true)
  const isJustRegistered = params.get('registered') === 'true';
  const isJustReset = params.get('reset') === 'true';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, rememberMe }),
      });
      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok) {
        setError(result?.error ?? 'Unable to sign in. Please verify your credentials.');
        setIsSubmitting(false);
        return;
      }

      const destination = params.get('next');
      const safeDestination =
        destination &&
        destination.startsWith('/') &&
        !destination.startsWith('/login') &&
        !destination.startsWith('/create-account')
          ? destination
          : '/';

      window.location.href = safeDestination;
    } catch {
      setError('We could not reach the server. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {isJustRegistered && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Account created successfully! Please sign in to continue.</span>
        </div>
      )}

      {isJustReset && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Your password was updated. Sign in with your new password.</span>
        </div>
      )}

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-[var(--text-main)]">
          Email address
        </label>
        <input
          id="login-email"
          autoComplete="email"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-medium text-[var(--text-main)]">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-[var(--accent)] transition-colors hover:underline"
            tabIndex={2}
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            id="login-password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 pr-11 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-muted)] select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-subtle)] accent-[var(--accent)]"
          />
          Keep me signed in
        </label>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] p-3 text-xs leading-5 text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {error.toLowerCase().includes('incorrect') && (
              <p className="mt-1">
                <Link href="/forgot-password" className="font-semibold underline">
                  Need to reset your password?
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      <button
        disabled={isSubmitting}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
      >
        {isSubmitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Signing in…
          </>
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
    <main className="relative min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[600px] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-400/10" />
      </div>

      <section className="relative mx-auto w-full max-w-[420px]">
        <AuthHeader subtitle="Private personal finance" />

        <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_60px_-34px_rgba(27,32,44,.35)] dark:shadow-[0_20px_60px_-34px_rgba(0,0,0,.7)] sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
              <Sparkles className="h-3 w-3" /> Welcome back
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Your money, kept personal.
            </h1>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
              Sign in to access your accounts, transactions, and private budgets.
            </p>
          </div>

          <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading form…</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-center text-sm text-[var(--text-muted)]">
            New here?{' '}
            <Link className="font-semibold text-[var(--accent)] hover:underline" href="/create-account">
              Create your account
            </Link>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <LockKeyhole className="h-3.5 w-3.5 text-[var(--income)]" /> End-to-end private ledger storage
        </p>
      </section>
    </main>
  );
}
