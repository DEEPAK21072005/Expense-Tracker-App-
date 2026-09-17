'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, KeyRound, WalletCards, Copy, CheckCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      let result: { success?: boolean; error?: string; resetUrl?: string; expiresAt?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok || !result?.success) {
        setError(result?.error ?? 'Unable to process request. Please try again.');
        return;
      }
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
        setExpiresAt(result.expiresAt ?? '');
      }
    } catch {
      setError('We could not reach the service. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const expiryDisplay = expiresAt
    ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

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
          {resetUrl ? (
            /* ── Success State ── */
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Reset link ready</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Copy the link below and open it to set a new password. It expires at{' '}
                  <strong className="text-[var(--text-main)]">{expiryDisplay}</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
                <p className="break-all text-xs font-mono text-[var(--text-muted)]">{resetUrl}</p>
              </div>

              <button
                onClick={copyLink}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-sm transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]"
              >
                {copied ? (
                  <>
                    <CheckCheck className="h-4 w-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Reset Link
                  </>
                )}
              </button>

              <Link
                href={resetUrl}
                className="flex w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] px-4 py-3.5 text-sm font-semibold transition hover:bg-[var(--bg-elevated)]"
              >
                Open Reset Link Now
              </Link>
            </div>
          ) : (
            /* ── Email Form ── */
            <>
              <div className="mb-7">
                <p className="text-sm font-medium text-[var(--accent)]">Account recovery</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">Forgot your password?</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Enter your account email and we&apos;ll generate a secure reset link for you.
                </p>
              </div>

              <form className="space-y-4" onSubmit={submit} noValidate>
                <label className="block text-sm font-medium">
                  Email address
                  <input
                    autoComplete="email"
                    className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
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
                  {isSubmitting ? 'Generating reset link…' : 'Generate Reset Link'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            <Link className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:underline" href="/login">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
