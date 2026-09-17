'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, addMoney } from '@/lib/money';
import { CalendarClock, Plus, CreditCard, RefreshCw } from 'lucide-react';

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextDate: string;
  account: { name: string };
  category: { name: string } | null;
}

export default function RecurringPage() {
  const [subscriptions, setSubscriptions] = useState<RecurringItem[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; currency?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [currency, setCurrency] = useState('INR');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [rRes, aRes, cRes, meRes] = await Promise.all([
        fetch('/api/recurring').then((r) => r.json()),
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]);

      if (rRes.success) setSubscriptions(rRes.data);
      if (meRes.success && meRes.data?.baseCurrency) setCurrency(meRes.data.baseCurrency);
      if (aRes.success && aRes.data.length > 0) {
        setAccounts(aRes.data);
        setAccountId(aRes.data[0].id);
      }
      if (cRes.success && cRes.data.length > 0) {
        setCategories(cRes.data);
        setCategoryId(cRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load recurring data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute monthly commitment
  const monthlyTotal = subscriptions.reduce((sum, s) => {
    let factor = 1;
    if (s.frequency === 'DAILY') factor = 30;
    else if (s.frequency === 'WEEKLY') factor = 4.33;
    else if (s.frequency === 'YEARLY') factor = 1 / 12;
    return addMoney(sum, s.amount * factor);
  }, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    setIsLoading(true);
    const selectedAcc = accounts.find((a) => a.id === accountId);
    const activeCurrency = selectedAcc?.currency || currency;

    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: parsedAmount,
          currency: activeCurrency,
          frequency,
          nextDate,
          accountId,
          categoryId: categoryId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(data?.error ?? 'Unable to save subscription. Please try again.');
        return;
      }
      setDescription('');
      setAmount('');
      setSaveError('');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create recurring subscription:', err);
      setSaveError('Network error — please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Subscriptions & Recurring Bills
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Track fixed monthly obligations, upcoming utility bills, and active SaaS memberships
          </p>
        </div>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {/* Monthly Commitment Banner */}
      <Card elevated className="border-[var(--border-subtle)] bg-[var(--accent-light)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--accent)] p-2.5 text-white shadow-xs">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Monthly Recurring Commitment
              </span>
              <p className="text-2xl font-bold text-[var(--text-main)] num-tabular">
                {formatCurrency(monthlyTotal, currency)}
                <span className="text-xs font-normal text-[var(--text-muted)] ml-1.5">/ month</span>
              </p>
            </div>
          </div>

          <Badge variant="info">{subscriptions.length} active recurring items</Badge>
        </div>
      </Card>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subscriptions.length === 0 ? (
          <div className="col-span-full py-16 text-center text-sm text-neutral-400">
            No recurring subscriptions tracked yet. Click &quot;Add Subscription&quot; to register your monthly bills.
          </div>
        ) : (
          subscriptions.map((s) => {
            const dueDate = new Date(s.nextDate);
            const daysRemaining = Math.ceil(
              (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <Card key={s.id} elevated className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {s.description}
                    </h3>
                    <p className="text-xs text-neutral-500">{s.category?.name || 'Subscription'}</p>
                  </div>
                  <Badge variant="neutral">{s.frequency}</Badge>
                </div>

                <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 num-tabular">
                  {formatCurrency(s.amount, s.currency)}
                </div>

                <div className="border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{s.account.name}</span>
                  </div>

                  <span
                    className={`font-medium ${
                      daysRemaining <= 3
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {daysRemaining <= 0
                      ? 'Due today'
                      : daysRemaining === 1
                      ? 'Due tomorrow'
                      : `Due in ${daysRemaining} days`}
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Subscription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Track Subscription / Bill"
        description="Register a recurring payment with automated renewal projection"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Service / Description"
            placeholder="e.g. Netflix, GitHub Pro, Gym"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Amount (${currency})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY')}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Next Billing Date"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Payment Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Save Subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
