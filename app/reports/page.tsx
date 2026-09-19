'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, addMoney, subtractMoney } from '@/lib/money';
import { FileText, Download, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface MonthlyStats {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  categories: Array<{ name: string; total: number; percentage: number }>;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [currency, setCurrency] = useState('USD');
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const [txRes, meRes] = await Promise.all([
        fetch(`/api/transactions?startDate=${start}&endDate=${end}`).then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.success && meRes.data?.baseCurrency) {
        setCurrency(meRes.data.baseCurrency);
      }

      if (txRes?.success) {
        const txs = txRes.data as Array<{
          amount: number;
          currency: string;
          type: string;
          category: { name: string } | null;
        }>;

        let income = 0;
        let expenses = 0;
        const catMap: Record<string, number> = {};

        for (const t of txs) {
          if (t.type === 'INCOME') income = addMoney(income, t.amount);
          else if (t.type === 'EXPENSE') {
            expenses = addMoney(expenses, t.amount);
            const cat = t.category?.name || 'Uncategorized';
            catMap[cat] = addMoney(catMap[cat] || 0, t.amount);
          }
        }

        const net = subtractMoney(income, expenses);
        const rate = income > 0 ? Math.max(0, (net / income) * 100) : 0;
        const catList = Object.entries(catMap).map(([name, total]) => ({
          name,
          total,
          percentage: expenses > 0 ? (total / expenses) * 100 : 0,
        })).sort((a, b) => b.total - a.total);

        setStats({
          month,
          year,
          totalIncome: income,
          totalExpenses: expenses,
          netSavings: net,
          savingsRate: rate,
          transactionCount: txs.length,
          categories: catList,
        });
      }
    } catch (err) {
      console.error('Failed to load report stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError('');
    try {
      const response = await fetch(`/api/reports/pdf?month=${month}&year=${year}`);
      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error || `Failed to generate PDF (${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `expense-statement-${year}-${String(month).padStart(2, '0')}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      anchor.remove();
    } catch (err: unknown) {
      console.error('PDF download error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to download statement. Please try again.';
      setDownloadError(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Executive Monthly Financial Reports
            </h1>
            <Badge variant="success">pdf-lib Vector Engine</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Generate high-resolution multi-page financial statements with summary metrics, category breakdown, budget variance, and itemized ledger
          </p>
        </div>

        {/* Month / Year Filter */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button size="sm" onClick={handleDownload} isLoading={isDownloading} className="gap-1.5 shadow-sm">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {downloadError && (
        <div role="alert" className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
          {downloadError}
        </div>
      )}

      {/* Report Summary Card */}
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card elevated>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Monthly Total Income
            </span>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 num-tabular">
              +{formatCurrency(stats.totalIncome, currency)}
            </p>
          </Card>

          <Card elevated>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Monthly Total Expenses
            </span>
            <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 num-tabular">
              -{formatCurrency(stats.totalExpenses, currency)}
            </p>
          </Card>

          <Card elevated>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Net Cash Flow
            </span>
            <p
              className={`mt-2 text-2xl font-bold num-tabular ${
                stats.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(stats.netSavings, currency)}
            </p>
          </Card>

          <Card elevated>
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Savings Rate
            </span>
            <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100 num-tabular">
              {stats.savingsRate.toFixed(1)}%
            </p>
          </Card>
        </div>
      ) : null}

      {/* Comparison: Modern Vector Engine vs. Legacy jsPDF */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4 border-emerald-100 bg-emerald-50/20 dark:border-emerald-950/40 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            Modern Executive PDF Engine (Current System)
          </div>
          <ul className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Pure vector PDF rendering with crisp typography and hairline borders
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Deterministic multi-page pagination with repeated table headers
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Executive summary cards, category distributions, and budget variance
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Zero screenshot blur or browser canvas clipping
            </li>
          </ul>

          <div className="pt-2">
            <Button size="sm" variant="primary" onClick={handleDownload} isLoading={isDownloading} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Download Executive Statement
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 border-neutral-200/70 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="text-neutral-500 dark:text-neutral-400 font-semibold text-sm">
            Legacy jsPDF Implementation (Replaced)
          </div>
          <ul className="space-y-2 text-xs text-neutral-500">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Raw unformatted text strings (`pdf.text(...)`) with manual `yOffset += 10`
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              No pagination — clipped into invisible overflow on &gt;10 records
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              No tables, alternating row colors, or visual hierarchy
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
              Stored in single-entry date-keyed localStorage
            </li>
          </ul>
        </Card>
      </div>

      {/* Category Breakdown Table Preview */}
      {stats && stats.categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {MONTHS[month - 1]} {year} Spending Breakdown Preview
            </CardTitle>
            <span className="text-xs text-neutral-500">
              {stats.transactionCount} transactions analyzed
            </span>
          </CardHeader>
          <div className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {stats.categories.map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500 num-tabular">{c.percentage.toFixed(1)}%</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 num-tabular">
                    {formatCurrency(c.total, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
