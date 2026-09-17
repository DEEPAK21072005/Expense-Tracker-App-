'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Check, WalletCards } from 'lucide-react';

export default function CreateAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', baseCurrency: 'INR' });
  const [error, setError] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    try { const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) { setError(result.error ?? 'Unable to create your account'); return; } router.replace('/'); router.refresh(); }
    catch { setError('We could not reach the service. Check your connection and try again.'); } finally { setIsSubmitting(false); }
  }
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-main)] sm:grid sm:place-items-center"><section className="mx-auto w-full max-w-[700px]">
    <Link className="mb-8 flex items-center gap-3" href="/login"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-white"><WalletCards className="h-5 w-5" /></div><span className="font-semibold tracking-tight">Expense Tracker</span></Link>
    <div className="grid overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_20px_60px_-34px_rgba(27,32,44,.45)] md:grid-cols-[.8fr_1.2fr]"><aside className="bg-[var(--warm-surface)] p-7 md:p-9"><p className="text-sm font-medium text-[var(--accent)]">Start with a clean slate</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Make space for clarity.</h1><ul className="mt-7 space-y-3 text-sm leading-6 text-[var(--text-muted)]">{['No imported demo balances','Your data stays separated by account','Amounts are stored with exact minor-unit precision'].map((item) => <li className="flex gap-2" key={item}><Check className="mt-1 h-4 w-4 shrink-0 text-[var(--income)]" />{item}</li>)}</ul></aside>
      <div className="p-7 md:p-9"><h2 className="text-xl font-semibold tracking-tight">Create your account</h2><p className="mt-1 text-sm text-[var(--text-muted)]">It takes less than a minute.</p><form className="mt-6 space-y-3.5" onSubmit={submit} noValidate>
        <label className="block text-sm font-medium">Your name<input autoComplete="name" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]" value={form.name} onChange={set('name')} required /></label>
        <label className="block text-sm font-medium">Email address<input autoComplete="email" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]" type="email" value={form.email} onChange={set('email')} required /></label>
        <label className="block text-sm font-medium">Base currency<select className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]" value={form.baseCurrency} onChange={set('baseCurrency')}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="JPY">JPY — Japanese Yen</option><option value="SGD">SGD — Singapore Dollar</option></select></label>
        <label className="block text-sm font-medium">Password<input autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-transparent px-3.5 py-3 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]" type="password" value={form.password} onChange={set('password')} aria-describedby="password-help" required /><span id="password-help" className="mt-1 block text-xs font-normal text-[var(--text-muted)]">At least 10 characters, with a letter and a number.</span></label>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">{error}</p>}
        <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60" type="submit">{isSubmitting ? 'Creating your account…' : <>Create account <ArrowRight className="h-4 w-4" /></>}</button>
      </form><p className="mt-5 text-center text-sm text-[var(--text-muted)]">Already have an account? <Link className="font-semibold text-[var(--accent)] hover:underline" href="/login">Sign in</Link></p></div></div>
  </section></main>;
}
