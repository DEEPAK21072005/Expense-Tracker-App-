'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, addMoney, subtractMoney } from '@/lib/money';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  FileDown,
  ArrowRight,
  Sparkles,
  Users,
  CalendarClock,
  Trash2,
} from 'lucide-react';

interface TransactionItem {
  id: string;
  amount: number;
  currency: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  date: string;
  payee: string | null;
  notes: string | null;
  category: { name: string; color: string } | null;
  account: { name: string };
}

interface AccountItem {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
}

interface BudgetItem {
  id: string;
  categoryName: string;
  categoryColor: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverspent: boolean;
  isWarning: boolean;
}

interface SplitGroupItem {
  id: string;
  name: string;
  totalGroupSpent: number;
  settlements: Array<{
    fromName: string;
    toName: string;
    amount: number;
  }>;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [splitGroups, setSplitGroups] = useState<SplitGroupItem[]>([]);
  const [currency, setCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(true);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, txRes, bRes, sRes, meRes] = await Promise.all([
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/transactions').then((r) => r.json()),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`).then((r) => r.json()),
        fetch('/api/split').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      if (accRes.success) setAccounts(accRes.data);
      if (txRes.success) setTransactions(txRes.data);
      if (bRes.success) setBudgets(bRes.data);
      if (sRes.success) setSplitGroups(sRes.data);
      if (meRes.success) setCurrency(meRes.data.baseCurrency);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    loadData();

    // Listen to global updates
    const handleUpdate = () => loadData();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [loadData]);

  // Compute metrics
  const totalNetWorth = accounts.reduce((sum, acc) => addMoney(sum, acc.balance), 0);

  // Month-to-date income & expenses
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTransactions = transactions.filter((t) => new Date(t.date) >= startOfMonth);

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => addMoney(sum, t.amount), 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => addMoney(sum, t.amount), 0);

  const netCashFlow = subtractMoney(monthlyIncome, monthlyExpenses);
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (netCashFlow / monthlyIncome) * 100) : 0;

  // Category spending breakdown
  const categoryTotals: Record<string, { name: string; color: string; amount: number }> = {};
  for (const t of monthlyTransactions.filter((tx) => tx.type === 'EXPENSE')) {
    const name = t.category?.name || 'Other';
    const color = t.category?.color || '#3B82F6';
    if (!categoryTotals[name]) {
      categoryTotals[name] = { name, color, amount: 0 };
    }
    categoryTotals[name].amount = addMoney(categoryTotals[name].amount, t.amount);
  }
  const topCategories = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount).slice(0, 5);

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction? Account balance will be restored.')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Financial Overview
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href={`/api/reports/pdf?month=${currentMonth}&year=${currentYear}`} target="_blank">
            <Button variant="outline" size="sm" className="gap-2">
              <FileDown className="h-4 w-4" />
              Download Monthly Statement (PDF)
            </Button>
          </Link>
        </div>
      </div>

      {accounts.length === 0 && !isLoading ? (
        <Card className="border-[var(--border-subtle)] bg-[var(--warm-surface)] p-6 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">A clean beginning</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Start with the account you use most.</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">Your dashboard stays empty until you add your own account, categories, and transactions. We never add made-up finance data.</p>
            </div>
            <Link href="/accounts"><Button><Wallet className="h-4 w-4" /> Set up accounts</Button></Link>
          </div>
        </Card>
      ) : null}

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevated>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Net Worth
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 num-tabular">
              {formatCurrency(totalNetWorth, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Across {accounts.length} active accounts
            </p>
          </div>
        </Card>

        <Card elevated>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Monthly Income
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 num-tabular">
              +{formatCurrency(monthlyIncome, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Current month total</p>
          </div>
        </Card>

        <Card elevated>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Monthly Expenses
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 num-tabular">
              -{formatCurrency(monthlyExpenses, currency)}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Current month spend</p>
          </div>
        </Card>

        <Card elevated>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Savings Rate
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 num-tabular">
              {savingsRate.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Net cash flow: {formatCurrency(netCashFlow, currency)}
            </p>
          </div>
        </Card>
      </div>

      {/* Secondary Row: Spending by Category & Active Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">This Month</span>
          </CardHeader>
          <div className="mt-2 space-y-3">
            {topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">No expense transactions recorded yet.</p>
            ) : (
              topCategories.map((cat) => {
                const percent = monthlyExpenses > 0 ? (cat.amount / monthlyExpenses) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-neutral-700 dark:text-neutral-300">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 num-tabular">{percent.toFixed(1)}%</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 num-tabular">
                          {formatCurrency(cat.amount, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(2, percent))}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Budget Variance Tracker (1 Col) */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Health</CardTitle>
            <Link href="/budgets" className="text-xs text-blue-600 hover:underline">
              View All
            </Link>
          </CardHeader>
          <div className="mt-2 space-y-3.5">
            {budgets.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">No budgets defined for this month.</p>
            ) : (
              budgets.slice(0, 3).map((b) => (
                <div key={b.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{b.categoryName}</span>
                    <span className={b.isOverspent ? 'text-rose-600 font-semibold' : 'text-neutral-500'}>
                      {b.percentUsed}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${
                        b.isOverspent
                          ? 'bg-rose-500'
                          : b.isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>Spent: {formatCurrency(b.spent, currency)}</span>
                    <span>Limit: {formatCurrency(b.limit, currency)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {splitGroups.length > 0 ? (
        <Card className="border-blue-100/60 bg-gradient-to-r from-blue-50/40 via-white to-white dark:border-blue-900/30 dark:from-blue-950/20 dark:via-[#14171f] dark:to-[#14171f]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    Group Expense Splitter
                  </h3>
                  <Badge variant="info">Shared expenses</Badge>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {splitGroups[0].name} — Total pool spent: {formatCurrency(splitGroups[0].totalGroupSpent, currency)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {splitGroups[0].settlements.length > 0 ? (
                <div className="text-xs text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {splitGroups[0].settlements[0].fromName}
                  </span>{' '}
                  owes{' '}
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {splitGroups[0].settlements[0].toName}
                  </span>{' '}
                  <span className="font-bold text-blue-600 dark:text-blue-400 num-tabular">
                    {formatCurrency(splitGroups[0].settlements[0].amount, currency)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-emerald-600 font-medium">All group expenses settled!</span>
              )}
              <Link href="/split">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <span>Manage Split</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Recent Ledger Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <Link href="/transactions" className="text-xs font-semibold text-blue-600 hover:underline">
            View All Transactions ({transactions.length})
          </Link>
        </CardHeader>
        <div className="mt-2 overflow-x-auto">
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              No transactions recorded. Click &quot;Add Transaction&quot; or press &quot;N&quot; on your keyboard to start!
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200/80 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:border-neutral-800">
                <tr>
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Payee / Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Account</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {transactions.slice(0, 8).map((tx) => {
                  const isExp = tx.type === 'EXPENSE';
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 pl-2 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 font-medium text-neutral-900 dark:text-neutral-100">
                        {tx.payee || (isExp ? 'Expense' : 'Income')}
                        {tx.notes ? (
                          <span className="block text-[10px] font-normal text-neutral-400 truncate max-w-xs">
                            {tx.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3">
                        {tx.category ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {tx.account.name}
                      </td>
                      <td className="py-3 text-right font-semibold whitespace-nowrap num-tabular">
                        <span className={isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {isExp ? '-' : '+'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
