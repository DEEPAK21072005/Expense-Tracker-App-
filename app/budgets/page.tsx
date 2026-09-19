'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/money';
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react';

interface BudgetItem {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverspent: boolean;
  isWarning: boolean;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [currency, setCurrency] = useState('INR');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Track whether the initial category has been set to avoid the infinite loop
  // that previously occurred by including `selectedCatId` in `useCallback` deps
  const catInitialised = useRef(false);

  const loadBudgets = useCallback(async () => {
    try {
      const [bRes, cRes, meRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);
      if (bRes.success) setBudgets(bRes.data);
      if (meRes.success && meRes.data?.baseCurrency) setCurrency(meRes.data.baseCurrency);
      if (cRes.success) {
        const expenseCats = cRes.data.filter((c: { type: string }) => c.type === 'EXPENSE');
        setCategories(expenseCats);
        if (expenseCats.length > 0) {
          setSelectedCatId((prev) => (prev && expenseCats.some((c: { id: string }) => c.id === prev) ? prev : expenseCats[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    }
  }, [month, year]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setSaveError('Please enter a valid budget amount greater than zero.');
      return;
    }

    const targetCatId = selectedCatId || (categories.length > 0 ? categories[0].id : null);
    if (!targetCatId) {
      setSaveError('Please select a category for this budget.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: targetCatId,
          amount: parsedAmount,
          currency,
          month,
          year,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(data?.error ?? 'Unable to save budget. Please try again.');
        return;
      }
      setAmount('');
      setIsModalOpen(false);
      loadBudgets();
    } catch (err) {
      console.error('Failed to save budget:', err);
      setSaveError('Network error — please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Monthly Budgets
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Keep expenses under control with category limits and early overspend alerts
          </p>
        </div>

        <Button size="sm" onClick={() => { setSaveError(''); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Set Category Budget
        </Button>
      </div>

      {/* Grid of Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-neutral-400">
            No budgets defined for this month. Click &quot;Set Category Budget&quot; to establish spending boundaries.
          </div>
        ) : (
          budgets.map((b) => (
            <Card key={b.id} elevated className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: b.categoryColor }}
                  />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {b.categoryName}
                  </h3>
                </div>
                {b.isOverspent ? (
                  <Badge variant="danger" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Overspent
                  </Badge>
                ) : b.isWarning ? (
                  <Badge variant="warning">At Limit</Badge>
                ) : (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    On Track
                  </Badge>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-muted)]">Spent:</span>
                  <span className="font-semibold text-[var(--text-main)] num-tabular">
                    {formatCurrency(b.spent, currency)}{' '}
                    <span className="font-normal text-[var(--text-dim)]">/ {formatCurrency(b.limit, currency)}</span>
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.isOverspent ? 'bg-[var(--danger)]' : b.isWarning ? 'bg-[var(--warning)]' : 'bg-[var(--income)]'
                    }`}
                    style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                <span className="text-[var(--text-muted)]">
                  {b.remaining >= 0 ? 'Remaining to spend:' : 'Amount exceeded:'}
                </span>
                <span
                  className={`font-semibold num-tabular ${
                    b.remaining >= 0 ? 'text-[var(--income)]' : 'text-[var(--expense)]'
                  }`}
                >
                  {formatCurrency(Math.abs(b.remaining), currency)}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Set Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Budget Limit"
        description="Establish a monthly spending ceiling for a category"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Category
            </label>
            {categories.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2">
                No expense categories found. Add categories first.
              </p>
            ) : (
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Input
            label={`Monthly Limit (${currency})`}
            type="number"
            step="100"
            min="1"
            placeholder="e.g. 10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          {saveError && (
            <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={categories.length === 0}>
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
