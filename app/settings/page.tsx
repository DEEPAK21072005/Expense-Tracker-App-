'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Download, ShieldCheck, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { SUPPORTED_CURRENCIES } from '@/lib/money';

type User = {
  name: string;
  email: string;
  baseCurrency: string;
  timezone: string;
  theme: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/auth/me');
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      const result = await response.json();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        setLoadError(result.error ?? 'We could not load your profile.');
      }
    } catch {
      setLoadError('Unable to connect to server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setStatus(null);
    setIsSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ kind: 'error', text: result.error ?? 'Unable to save your preferences.' });
        return;
      }
      setUser(result.data);
      setStatus({ kind: 'success', text: 'Preferences saved successfully.' });
    } catch {
      setStatus({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function download() {
    setStatus(null);
    try {
      const response = await fetch('/api/backup');
      if (!response.ok) throw new Error('Failed to generate backup');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      URL.revokeObjectURL(url);
      anchor.remove();
      setStatus({ kind: 'success', text: 'Your private JSON backup has been downloaded.' });
    } catch {
      setStatus({ kind: 'error', text: 'Unable to create a backup. Please try again.' });
    }
  }

  async function restore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus(null);
    try {
      if (file.size > 10_000_000) throw new Error('This file is too large (maximum 10MB).');
      const data = JSON.parse(await file.text());
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RESTORE_JSON', data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to restore the backup.');
      setStatus({
        kind: 'success',
        text: `Restored ${result.data.imported} transaction${result.data.imported === 1 ? '' : 's'}; skipped ${result.data.skipped} duplicate${result.data.skipped === 1 ? '' : 's'}.`,
      });
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : 'Choose a valid Expense Tracker backup.' });
    } finally {
      event.target.value = '';
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading your preferences…</p>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-[var(--danger)]" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Unable to load settings</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{loadError || 'Session expired or not found.'}</p>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={loadUser}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Try Again
          </Button>
          <Button onClick={() => router.push('/login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">Personal space</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-neutral-900 dark:text-neutral-100">
          Settings & data
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Control how your private workspace is presented and backed up.
        </p>
      </header>

      {status && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            status.kind === 'success'
              ? 'bg-[var(--income-bg)] text-[var(--income)]'
              : 'bg-[var(--danger-bg)] text-[var(--danger)]'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {status.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile & base currency</CardTitle>
        </CardHeader>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Name
              <input
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                value={user.name}
                onChange={(event) => setUser({ ...user, name: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                value={user.email}
                disabled
              />
            </label>
          </div>

          <label className="block max-w-sm text-sm font-medium">
            Base currency
            <select
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={user.baseCurrency}
              onChange={(event) => setUser({ ...user, baseCurrency: event.target.value })}
            >
              {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-xs font-normal leading-5 text-neutral-500 dark:text-neutral-400">
              Used for overall summaries and new accounts. Existing accounts maintain their currency.
            </span>
          </label>

          <Button type="submit" isLoading={isSaving}>
            Save preferences
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Private backup</CardTitle>
        </CardHeader>
        <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
          Export a portable snapshot of your accounts, categories, transactions, budgets, and recurring payments.
          Backup files contain personal financial records—store them securely.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" onClick={download}>
            <Download className="h-4 w-4 mr-1.5" /> Download JSON backup
          </Button>
          <input
            ref={fileInput}
            className="sr-only"
            accept="application/json,.json"
            type="file"
            onChange={restore}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Restore a backup
          </Button>
        </div>
      </Card>

      <Card className="border-[var(--border-subtle)] bg-[var(--warm-surface)]">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--income)]" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">How your data is protected</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              Your data is isolated by your signed-in account. Sessions are HTTP-only HMAC tokens, input is validated on the server,
              and monetary amounts are stored as exact minor integer units to avoid floating-point loss.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
