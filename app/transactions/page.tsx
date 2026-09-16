'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, addMoney } from '@/lib/money';
import { Search, Filter, Trash2, ArrowUpDown, Download } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  date: string;
  payee: string | null;
  notes: string | null;
  tags: string | null;
  category: { id: string; name: string; color: string } | null;
  account: { id: string; name: string };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txRes, catRes, accRes] = await Promise.all([
        fetch('/api/transactions').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/accounts').then((r) => r.json()),
      ]);
      if (txRes.success) setTransactions(txRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (accRes.success) setAccounts(accRes.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('transaction-updated', loadData);
    return () => window.removeEventListener('transaction-updated', loadData);
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Client-side filtering for zero-latency UI
  const filtered = transactions.filter((tx) => {
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && tx.category?.id !== categoryFilter) return false;
    if (accountFilter !== 'ALL' && tx.account.id !== accountFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const payeeMatch = (tx.payee || '').toLowerCase().includes(q);
      const notesMatch = (tx.notes || '').toLowerCase().includes(q);
      const catMatch = (tx.category?.name || '').toLowerCase().includes(q);
      if (!payeeMatch && !notesMatch && !catMatch) return false;
    }
    return true;
  });

  const totalFilteredExpense = filtered
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => addMoney(sum, t.amount), 0);

  const totalFilteredIncome = filtered
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => addMoney(sum, t.amount), 0);

  // CSV Export utility
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Payee', 'Category', 'Account', 'Amount', 'Currency', 'Notes'];
    const rows = filtered.map((t) => [
      t.date.split('T')[0],
      t.type,
      `"${(t.payee || '').replace(/"/g, '""')}"`,
      `"${(t.category?.name || 'Uncategorized').replace(/"/g, '""')}"`,
      `"${t.account.name.replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Transactions_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Transaction Ledger
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Showing {filtered.length} of {transactions.length} total entries
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by payee, memo, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800 text-xs">
            {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                  typeFilter === t
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-[#14171f] dark:text-blue-400'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                }`}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Account
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="ALL">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Filtered Totals Summary Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-neutral-100/70 p-4 dark:bg-neutral-900/60 text-xs">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-neutral-500">Filtered Expenses:</span>{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400 num-tabular">
              -{formatCurrency(totalFilteredExpense, 'INR')}
            </span>
          </div>
          <div>
            <span className="text-neutral-500">Filtered Income:</span>{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400 num-tabular">
              +{formatCurrency(totalFilteredIncome, 'INR')}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3.5 pl-4">Date</th>
                <th className="py-3.5">Payee & Notes</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Account</th>
                <th className="py-3.5 text-right">Amount</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No transactions match the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isExp = tx.type === 'EXPENSE';
                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 pl-4 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {tx.payee || (isExp ? 'Expense' : 'Income')}
                        </span>
                        {tx.notes ? (
                          <span className="block text-[11px] text-neutral-400 truncate max-w-sm">
                            {tx.notes}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5">
                        {tx.category ? (
                          <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {tx.account.name}
                      </td>
                      <td className="py-3.5 text-right font-semibold whitespace-nowrap num-tabular">
                        <span
                          className={
                            isExp
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {isExp ? '-' : '+'}
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-4">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="rounded p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
