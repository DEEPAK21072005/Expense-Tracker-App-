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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch accounts and categories
      Promise.all([
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ]).then(([accRes, catRes]) => {
        if (accRes.success && accRes.data.length > 0) {
          setAccounts(accRes.data);
          setAccountId(accRes.data[0].id);
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
      const parsed = parseNaturalLanguageInput(text, 'INR');
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

    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          currency: 'INR',
          type,
          date,
          accountId,
          categoryId: type !== 'TRANSFER' ? categoryId : null,
          payee: payee.trim() || (type === 'INCOME' ? 'Income' : 'Expense'),
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
      description="Record an income or expense accurately into your ledger"
      maxWidth="lg"
    >
      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setTab('smart')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === 'smart'
              ? 'bg-white text-blue-600 shadow-sm dark:bg-[#14171f] dark:text-blue-400'
              : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
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
              ? 'bg-white text-blue-600 shadow-sm dark:bg-[#14171f] dark:text-blue-400'
              : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
          }`}
        >
          Detailed Form
        </button>
      </div>

      {errorMsg ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {tab === 'smart' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Natural Language Expression
            </label>
            <input
              type="text"
              placeholder='e.g. "₹450 dinner at Seoul Kitchen yesterday" or "1500 salary today"'
              value={nlInput}
              onChange={(e) => handleNlChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              autoFocus
            />
          </div>

          {candidate && candidate.amount ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Parsed Information (Review & Confirm)
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Amount:</span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    ₹{candidate.amount}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Type:</span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {candidate.type}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Payee:</span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {candidate.payee || 'Merchant'}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">Date:</span>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
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
            label="Amount (INR)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER')}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
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
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
          </div>

          {type !== 'TRANSFER' ? (
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              >
                {categories
                  .filter((c) => c.type === type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
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
    </Modal>
  );
}
