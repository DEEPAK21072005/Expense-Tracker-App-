'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, KeyRound, Copy, CheckCheck, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';
import { AuthHeader } from '@/components/auth/auth-header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [copied, setCopied] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      let result: { success?: boolean; error?: string; resetUrl?: string; token?: string; expiresAt?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        setError(result?.error ?? 'Unable to process your request. Please check the email and try again.');
        return;
      }

      if (result.token) {
        setResetToken(result.token);
      }

      if (result.resetUrl) {
        // Ensure reset URL uses the current window origin so port/domain is 100% accurate
        try {
          const parsed = new URL(result.resetUrl);
          const localUrl = `${window.location.origin}${parsed.pathname}${parsed.search}`;
          setResetUrl(localUrl);
        } catch {
          setResetUrl(result.resetUrl);
        }
        setExpiresAt(result.expiresAt ?? '');
      }
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyLink() {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
    }
  }

  const expiryDisplay = expiresAt
    ? new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '1 hour';

  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[600px] rounded-full bg-blue-500/5 blur-[120px] dark:bg-blue-400/10" />
      </div>

      <section className="relative mx-auto w-full max-w-[440px]">
        <AuthHeader subtitle="Password recovery assistant" />

        <div className="rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_20px_60px_-34px_rgba(27,32,44,.35)] dark:shadow-[0_20px_60px_-34px_rgba(0,0,0,.7)] sm:p-8">
          {resetUrl ? (
            /* ── SUCCESS STATE: RESET LINK READY ── */
            <div className="space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--income-bg)] text-[var(--income)]">
                <KeyRound className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-main)]">
                  Reset link ready
                </h1>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
                  We generated a secure reset link for <strong className="text-[var(--text-main)]">{email}</strong>.
                  This link expires at <strong className="text-[var(--text-main)]">{expiryDisplay}</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                <p className="break-all font-mono text-xs text-[var(--text-muted)] select-all">{resetUrl}</p>
              </div>

              <div className="space-y-2.5">
                <Link
                  href={resetToken ? `/reset-password?token=${encodeURIComponent(resetToken)}` : resetUrl}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition-all hover:opacity-90 active:scale-[0.99]"
                >
                  Proceed to Reset Password <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-elevated)]"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="h-4 w-4 text-[var(--income)]" /> Link Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Reset Link
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetUrl('');
                  setEmail('');
                }}
                className="block w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] underline"
              >
                Reset for a different email address
              </button>
            </div>
          ) : (
            /* ── EMAIL INPUT FORM ── */
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                  <KeyRound className="h-3 w-3" /> Account recovery
                </span>
                <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
                  Forgot password?
                </h1>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)] sm:text-sm">
                  Enter your registered account email and we&apos;ll generate a secure password reset link for you.
                </p>
              </div>

              <form className="space-y-4" onSubmit={submit} noValidate>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-[var(--text-main)]">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-[var(--danger-bg)] p-3 text-xs leading-5 text-[var(--danger)]">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{error}</p>
                      {error.includes('No account found') && (
                        <p className="mt-1 font-semibold">
                          <Link href="/create-account" className="underline">
                            Create a new account instead →
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  disabled={isSubmitting}
                  className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating reset link…
                    </>
                  ) : (
                    <>
                      Generate Reset Link <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

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
