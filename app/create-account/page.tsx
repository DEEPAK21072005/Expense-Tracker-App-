'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { AuthHeader } from '@/components/auth/auth-header';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

export default function CreateAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    baseCurrency: 'INR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password requirements
  const hasMinLength = form.password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(form.password);
  const hasNumber = /\d/.test(form.password);
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!form.email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
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
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          baseCurrency: form.baseCurrency,
        }),
      });
      let result: { success?: boolean; error?: string } | null = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }
      if (!response.ok) {
        setError(result?.error ?? 'Unable to create your account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      window.location.href = '/';
    } catch {
      setError('We could not reach the server. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[750px] rounded-full bg-blue-500/5 blur-[130px] dark:bg-blue-400/10" />
      </div>

      <section className="relative mx-auto w-full max-w-[760px]">
        <AuthHeader subtitle="Set up your private financial ledger" />

        <div className="grid overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_20px_60px_-34px_rgba(27,32,44,.35)] dark:shadow-[0_20px_60px_-34px_rgba(0,0,0,.7)] md:grid-cols-[.85fr_1.15fr]">
          {/* Left decorative panel */}
          <aside className="border-b border-[var(--border-subtle)] bg-[var(--warm-surface)] p-7 md:border-b-0 md:border-r md:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
              <Sparkles className="h-3 w-3" /> Get started
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Make space for financial clarity.
            </h1>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Create an independent ledger with complete privacy and zero advertisements.
            </p>

            <ul className="mt-6 space-y-3.5 text-xs leading-5 text-[var(--text-muted)]">
              {[
                { title: 'Zero imported clutter', desc: 'Start completely fresh with your own accounts' },
                { title: 'Exact minor-unit math', desc: 'No floating point errors in totals or balances' },
                { title: 'Multi-account isolation', desc: 'Separate cash, bank, credit card, and savings' },
                { title: 'Built-in monthly reports', desc: 'Generate professional downloadable PDFs anytime' },
              ].map((item) => (
                <li className="flex gap-2.5" key={item.title}>
                  <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--income-bg)] text-[var(--income)]">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <strong className="font-semibold text-[var(--text-main)]">{item.title}:</strong>{' '}
                    {item.desc}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2 font-medium text-[var(--text-main)]">
                <ShieldCheck className="h-4 w-4 text-[var(--income)]" /> Private by design
              </div>
              <p className="mt-1 text-[11px] leading-4">
                Your data is stored securely and accessible only to your account.
              </p>
            </div>
          </aside>

          {/* Right form panel */}
          <div className="p-7 md:p-9">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
              Create your account
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Fill in your details below to set up your profile.
            </p>

            <form className="mt-5 space-y-3.5" onSubmit={submit} noValidate>
              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-[var(--text-main)]">
                  Your full name
                </label>
                <input
                  id="reg-name"
                  autoComplete="name"
                  autoFocus
                  placeholder="e.g. John Doe"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-[var(--text-main)]">
                  Email address
                </label>
                <input
                  id="reg-email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>

              {/* Base Currency */}
              <div>
                <label htmlFor="reg-currency" className="block text-xs font-medium text-[var(--text-main)]">
                  Primary currency
                </label>
                <select
                  id="reg-currency"
                  className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                  value={form.baseCurrency}
                  onChange={set('baseCurrency')}
                >
                  {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-xs font-medium text-[var(--text-main)]">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="reg-password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 pr-11 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-medium text-[var(--text-main)]">
                  Confirm password
                </label>
                <div className="relative mt-1">
                  <input
                    id="reg-confirm"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-2.5 pr-11 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
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

              {/* Password Requirements Badges */}
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
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--danger-bg)] p-3 text-xs text-[var(--danger)]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{error}</p>
                    {error.includes('already exists') && (
                      <p className="mt-1">
                        <Link href="/login" className="font-semibold underline">
                          Sign in to your existing account →
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                disabled={isSubmitting}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-[var(--ink-contrast)] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link className="font-semibold text-[var(--accent)] hover:underline" href="/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
