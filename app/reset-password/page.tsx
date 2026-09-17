'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Eye, EyeOff, KeyRound, WalletCards } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--danger-bg)]">
            <KeyRound className="h-5 w-5 text-[var(--danger)]" />
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Invalid reset link</h1>
        <p className="text-sm text-[var(--text-muted)]">
          This link is missing a reset token. Please request a new password reset link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-[var(--ink-contrast)] transition hover:opacity-90"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok || !result?.success) {
        setError(result?.error ?? 'Unable to reset password. Please try again.');
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.replace('/');
        router.refresh();
      }, 2500);
    } catch {
      setError('We could not reach the service. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
            <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Password updated!</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Your password has been changed successfully. Redirecting you to the dashboard…
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <label className="block text-sm font-medium">
        New password
        <div className="relative mt-1.5">
          <input
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 pr-11 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">
          At least 10 characters, with a letter and a number.
        </span>
      </label>

      <label className="block text-sm font-medium">
        Confirm new password
        <div className="relative mt-1.5">
          <input
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 pr-11 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

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
        {isSubmitting ? 'Updating password…' : 'Set New Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            <p className="text-sm font-medium text-[var(--accent)]">Account recovery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Set a new password</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Choose a strong password for your account.
            </p>
          </div>
          <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            <Link className="font-semibold text-[var(--accent)] hover:underline" href="/login">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
