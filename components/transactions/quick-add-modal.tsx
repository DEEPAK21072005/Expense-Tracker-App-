'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { parseNaturalLanguageInput, ParsedTransactionCandidate } from '@/lib/natural-language';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const [tab, setTab] = useState<'smart' | 'manual'>('smart');
  const [nlInput, setNlInput] = useState('');
  const [candidate, setCandidate] = useState<ParsedTransactionCandidate | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [payee, setPayee] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dropdown options
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; currency: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [userCurrency, setUserCurrency] = useState('INR');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()),
      ]).then(([accRes, catRes, meRes]) => {
        if (meRes.success && meRes.data?.baseCurrency) {
          setUserCurrency(meRes.data.baseCurrency);
        }
        if (accRes.success && accRes.data.length > 0) {
          setAccounts(accRes.data);
          setAccountId(accRes.data[0].id);
          if (accRes.data.length > 1) {
            setToAccountId(accRes.data[1].id);
          }
        }
        if (catRes.success && catRes.data.length > 0) {
          setCategories(catRes.data);
          setCategoryId(catRes.data[0].id);
        }
      });
    }
  }, [isOpen]);

  // Handle Natural Language Typing
  const handleNlChange = (text: string) => {
    setNlInput(text);
    if (text.trim().length > 3) {
      const parsed = parseNaturalLanguageInput(text, userCurrency);
      setCandidate(parsed);
      if (parsed.amount) setAmount(String(parsed.amount));
      setType(parsed.type);
      setPayee(parsed.payee);
      setDate(parsed.date);

      // Match category hint if possible
      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === parsed.categoryHint.toLowerCase()
      );
      if (matchedCat) setCategoryId(matchedCat.id);
    } else {
      setCandidate(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select an account.');
      return;
    }
    if (type === 'TRANSFER' && (!toAccountId || toAccountId === accountId)) {
      setErrorMsg('Transfers require selecting a different destination account.');
      return;
    }

    const selectedAcc = accounts.find((a) => a.id === accountId);
    const activeCurrency = selectedAcc?.currency || userCurrency;

    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          currency: activeCurrency,
          type,
          date,
          accountId,
          toAccountId: type === 'TRANSFER' ? toAccountId : null,
          categoryId: type !== 'TRANSFER' ? categoryId : null,
          payee: payee.trim() || (type === 'INCOME' ? 'Income' : type === 'TRANSFER' ? 'Account transfer' : 'Expense'),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save transaction');
      }

      // Reset and close
      setNlInput('');
      setAmount('');
      setPayee('');
      setNotes('');
      setCandidate(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Transaction"
      description="Record an income, expense, or transfer accurately into your ledger"
      maxWidth="lg"
    >
      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-[var(--bg-elevated)] p-1">
        <button
          type="button"
          onClick={() => setTab('smart')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === 'smart'
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Smart Quick Entry
        </button>
        <button
          type="button"
          onClick={() => setTab('manual')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === 'manual'
              ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Detailed Form
        </button>
      </div>

      {errorMsg ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-[var(--danger-bg)] p-3 text-xs text-[var(--danger)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--warm-surface)] p-6 text-center">
          <p className="text-sm font-semibold text-[var(--text-main)]">No financial accounts yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Create your first account (e.g. Bank, Cash, or Credit Card) before recording transactions.
          </p>
          <div className="mt-4">
            <a
              href="/accounts"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[var(--accent-hover)] transition"
            >
              Set up an Account
            </a>
          </div>
        </div>
      ) : (
        <>
          {tab === 'smart' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Natural Language Expression
                </label>
                <input
                  type="text"
                  placeholder='e.g. "450 dinner at Seoul Kitchen yesterday" or "1500 salary today"'
                  value={nlInput}
                  onChange={(e) => handleNlChange(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text-main)] transition-all placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  autoFocus
                />
              </div>

              {candidate && candidate.amount ? (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-light)] p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] mb-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                    Parsed Information (Review & Confirm)
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[var(--text-muted)]">Amount:</span>
                      <p className="font-semibold text-[var(--text-main)] num-tabular">
                        {userCurrency} {candidate.amount}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Type:</span>
                      <p className="font-semibold text-[var(--text-main)]">
                        {candidate.type}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Payee:</span>
                      <p className="font-semibold text-[var(--text-main)]">
                        {candidate.payee || 'Merchant'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">Date:</span>
                      <p className="font-semibold text-[var(--text-main)]">
                        {candidate.date}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={`Amount (${userCurrency})`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER')}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Payee / Description"
                placeholder="e.g. Grocery Store"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                required
              />

              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {type === 'TRANSFER' ? 'Source Account' : 'Account'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {type === 'TRANSFER' ? (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Destination Account
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    required
                  >
                    <option value="">Select destination</option>
                    {accounts.filter((a) => a.id !== accountId).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  >
                    <option value="">Uncategorized</option>
                    {categories
                      .filter((c) => c.type === type)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <Input
              label="Notes (Optional)"
              placeholder="Add memo or itemized details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Save Transaction
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}
