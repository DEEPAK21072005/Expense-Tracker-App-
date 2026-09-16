'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  const [currency, setCurrency] = useState('INR');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [legacyFound, setLegacyFound] = useState(false);
  const [legacyCount, setLegacyCount] = useState(0);

  // Check for legacy localStorage data
  useEffect(() => {
    try {
      const raw = localStorage.getItem('monthlyData');
      if (raw) {
        const parsed = JSON.parse(raw);
        const count = Object.keys(parsed).length;
        if (count > 0) {
          setLegacyFound(true);
          setLegacyCount(count);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // One-click Legacy localStorage Ingestion
  const handleMigrateLegacyData = async () => {
    try {
      const raw = localStorage.getItem('monthlyData');
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Fetch accounts to link
      const accRes = await fetch('/api/accounts').then((r) => r.json());
      const defaultAccount = accRes.data?.[0];
      if (!defaultAccount) {
        setStatusMsg({ type: 'error', text: 'No active accounts found to assign legacy transactions.' });
        return;
      }

      let count = 0;
      for (const [dateStr, val] of Object.entries(parsed) as [
        string,
        { income: number; expenses: number; savings: number; remaining: number }
      ][]) {
        if (val.income > 0) {
          await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: val.income,
              currency: 'INR',
              type: 'INCOME',
              date: new Date(dateStr).toISOString(),
              accountId: defaultAccount.id,
              payee: `Legacy Income (${dateStr})`,
              notes: 'Migrated from legacy localStorage',
            }),
          });
          count++;
        }
        if (val.expenses > 0) {
          await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: val.expenses,
              currency: 'INR',
              type: 'EXPENSE',
              date: new Date(dateStr).toISOString(),
              accountId: defaultAccount.id,
              payee: `Legacy Expense (${dateStr})`,
              notes: 'Migrated from legacy localStorage',
            }),
          });
          count++;
        }
      }

      // Backup and clear
      localStorage.setItem('monthlyData_legacy_backup', raw);
      localStorage.removeItem('monthlyData');
      setLegacyFound(false);
      setStatusMsg({
        type: 'success',
        text: `Successfully migrated ${count} transactions from legacy localStorage!`,
      });
      window.dispatchEvent(new Event('transaction-updated'));
    } catch (err) {
      console.error('Migration failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to migrate legacy data.' });
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ExpenseTracker_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatusMsg({ type: 'success', text: 'JSON database backup downloaded successfully!' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to download backup.' });
    }
  };

  // Restore JSON Backup
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RESTORE_JSON', data: json }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Backup restored successfully!' });
        window.dispatchEvent(new Event('transaction-updated'));
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to restore backup.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Invalid JSON file format.' });
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Settings & Data Management
        </h1>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Preferences, currency standards, legacy data migration, and full ledger backups
        </p>
      </div>

      {statusMsg ? (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-medium ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      ) : null}

      {/* Legacy Data Ingestion Banner */}
      {legacyFound ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCcw className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Legacy Expense Tracker Data Detected
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Found {legacyCount} monthly records in your browser's legacy localStorage (`monthlyData`).
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleMigrateLegacyData} className="bg-amber-600 hover:bg-amber-700 text-white">
              Migrate to Ledger
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Currency & Locale Settings */}
      <Card className="space-y-4">
        <CardHeader>
          <CardTitle>Base Currency Standards</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Primary Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {Object.values(SUPPORTED_CURRENCIES).map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.name} ({curr.symbol} {curr.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Accounting Precision
            </label>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
              Integer Minor Units (100 Minor Units = 1.00 Unit, Zero Float Precision Loss)
            </div>
          </div>
        </div>
      </Card>

      {/* Backup & Data Ownership */}
      <Card className="space-y-4">
        <CardHeader>
          <CardTitle>Data Sovereignty & Local Backups</CardTitle>
        </CardHeader>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Your personal finance data is stored strictly in your relational database. You can export complete,
          unencrypted JSON backups or restore a previously exported snapshot at any time.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportBackup} className="gap-2">
            <Download className="h-4 w-4" />
            Export Complete JSON Backup
          </Button>

          <label className="cursor-pointer">
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
              <Upload className="h-4 w-4" />
              Restore from JSON Backup
            </span>
          </label>
        </div>
      </Card>

      {/* System Security & Verification */}
      <Card className="space-y-3 border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="flex items-center gap-2 font-semibold text-xs text-neutral-800 dark:text-neutral-200">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Production Engineering & Security Hardening
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
          <div>✓ Zod schema-enforced input validation at API boundaries</div>
          <div>✓ Parameterized relational SQL queries via Prisma ORM</div>
          <div>✓ OWASP Top 10 security headers (CSP, HSTS, X-Frame-Options)</div>
          <div>✓ WCAG 2.2 AA compliant typography and contrast tokens</div>
        </div>
      </Card>
    </div>
  );
}
