'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense, useEffect } from 'react';
import { Eye, EyeOff, KeyRound, Check, CheckCircle2, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthHeader } from '@/components/auth/auth-header';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawToken = params.get('token') ?? '';
  const token = rawToken.trim();

  const [manualToken, setManualToken] = useState('');
  const activeToken = token || manualToken.trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Live password validation
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (!done) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  if (!activeToken) {
    return (
      <div className="space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)]">
          <KeyRound className="h-7 w-7" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
            Password reset token
          </h1>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
            Paste the security token from your recovery link below to proceed.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem('pastedToken') as HTMLInputElement)?.value.trim();
            if (input) setManualToken(input);
          }}
          className="space-y-3 pt-2"
        >
          <div>
            <label htmlFor="pastedToken" className="block text-xs font-medium text-[var(--text-main)]">
              Security Token
            </label>
            <input
              id="pastedToken"
              name="pastedToken"
              placeholder="e.g. m9H0t7ki2stKs7SrNk_7SMOhrcppSpkbDnU9HWuv82Q"
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 font-mono text-xs text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
              required
            />
          </div>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition hover:opacity-90"
          >
            Continue to Set Password <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Don&apos;t have a token? Request new reset link →
          </Link>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasLetter) {
      setError('Password must contain at least one letter.');
      return;
    }
    if (!hasNumber) {
      setError('Password must contain at least one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken, password }),
      });
      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        setError(result?.error ?? 'Unable to reset password. The link may have expired.');
        setIsSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError('We could not reach the server. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-main)]">
            Password updated!
          </h1>
          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
            Your password has been changed successfully. Your secure session is active.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-muted)]">
          Redirecting to dashboard in {countdown}s…
        </div>

        <button
          type="button"
          onClick={() => { window.location.href = '/'; }}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition-all hover:opacity-90"
        >
          Go to Dashboard Now <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div>
        <label htmlFor="reset-password" className="block text-sm font-medium text-[var(--text-main)]">
          New password
        </label>
        <div className="relative mt-1.5">
          <input
            id="reset-password"
            autoComplete="new-password"
            autoFocus
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 pr-11 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      <div>
        <label htmlFor="reset-confirm" className="block text-sm font-medium text-[var(--text-main)]">
          Confirm new password
        </label>
        <div className="relative mt-1.5">
          <input
            id="reset-confirm"
            autoComplete="new-password"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 pr-11 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button
            type="button"
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] transition hover:text-[var(--text-main)]"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Password Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 p-2.5 text-[11px]">
        <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-[var(--income)] font-medium' : 'text-[var(--text-muted)]'}`}>
          <Check className={`h-3 w-3 ${hasMinLength ? 'text-[var(--income)]' : 'opacity-40'}`} />
          At least 8 characters
        </div>
        <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-[var(--income)] font-medium' : 'text-[var(--text-muted)]'}`}>
          <Check className={`h-3 w-3 ${hasLetter ? 'text-[var(--income)]' : 'opacity-40'}`} />
          Contains a letter
        </div>
        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-[var(--income)] font-medium' : 'text-[var(--text-muted)]'}`}>
          <Check className={`h-3 w-3 ${hasNumber ? 'text-[var(--income)]' : 'opacity-40'}`} />
          Contains a number
        </div>
        <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-[var(--income)] font-medium' : 'text-[var(--text-muted)]'}`}>
          <Check className={`h-3 w-3 ${passwordsMatch ? 'text-[var(--income)]' : 'opacity-40'}`} />
          Passwords match
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] p-3 text-xs leading-5 text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {error.includes('expired') && (
              <p className="mt-1 font-semibold">
                <Link href="/forgot-password" className="underline">
                  Request a new password reset link →
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
            Updating password…
          </>
        ) : (
          <>
            Set New Password <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[600px] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-400/10" />
      </div>

      <section className="relative mx-auto w-full max-w-[440px]">
        <AuthHeader subtitle="Account security & recovery" />

        <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_60px_-34px_rgba(27,32,44,.35)] dark:shadow-[0_20px_60px_-34px_rgba(0,0,0,.7)] sm:p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
              <KeyRound className="h-3 w-3" /> Security update
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Set a new password
            </h1>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
              Choose a strong password to secure your account.
            </p>
          </div>

          <Suspense fallback={<div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading security form…</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-center text-sm">
            <Link className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:underline" href="/login">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
