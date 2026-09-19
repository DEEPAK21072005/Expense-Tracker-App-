'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Landmark, Plus, Tag, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/money';

type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  isArchived: boolean;
  _count: { transactions: number };
};
type Category = {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  color: string;
  _count: { transactions: number };
};

// Account type options with correct enum value + readable label
const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'WALLET', label: 'Digital Wallet' },
  { value: 'INVESTMENT', label: 'Investment' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('INR');

  // Status messages
  const [accountError, setAccountError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [pageError, setPageError] = useState('');

  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [accountForm, setAccountForm] = useState({ name: '', type: 'BANK', balance: '0' });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'EXPENSE', color: '#365EAA' });

  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const load = useCallback(async () => {
    try {
      const [accountResponse, categoryResponse, userResponse] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/auth/me'),
      ]);
      if (userResponse.status === 401 || accountResponse.status === 401) {
        window.location.href = '/login';
        return;
      }
      const [accountResult, categoryResult, userResult] = await Promise.all([
        accountResponse.json(),
        categoryResponse.json(),
        userResponse.json(),
      ]);
      if (accountResult.success) setAccounts(accountResult.data);
      if (categoryResult.success) setCategories(categoryResult.data);
      if (userResult.success) setCurrency(userResult.data.baseCurrency);
    } catch {
      setPageError('We could not load your setup data. Please refresh and try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError('');
    setIsCreatingAccount(true);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...accountForm, currency }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        setAccountError(result.error ?? 'Unable to create the account. Please try again.');
        return;
      }
      setAccountForm({ name: '', type: 'BANK', balance: '0' });
      setAccountOpen(false);
      await load();
    } catch {
      setAccountError('Network error — please check your connection and try again.');
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCategoryError('');
    setIsCreatingCategory(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        setCategoryError(result.error ?? 'Unable to create the category. Please try again.');
        return;
      }
      setCategoryForm({ name: '', type: 'EXPENSE', color: '#365EAA' });
      setCategoryOpen(false);
      await load();
    } catch {
      setCategoryError('Network error — please check your connection and try again.');
    } finally {
      setIsCreatingCategory(false);
    }
  }

  async function archiveAccount(id: string, name: string) {
    if (!window.confirm(`Archive "${name}"? Historical transactions will remain visible.`)) return;
    const response = await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isArchived: true }),
    });
    if (!response.ok) {
      setPageError('Unable to archive this account. Please try again.');
      return;
    }
    await load();
  }

  const activeAccounts = accounts.filter((account) => !account.isArchived);

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">Foundation</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-neutral-900 dark:text-neutral-100">
            Accounts &amp; categories
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            Set up the places you hold money and the labels that make your spending meaningful. Nothing is prefilled.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCategoryError(''); setCategoryOpen(true); }}>
            <Tag className="h-4 w-4" /> New category
          </Button>
          <Button onClick={() => { setAccountError(''); setAccountOpen(true); }}>
            <Plus className="h-4 w-4" /> New account
          </Button>
        </div>
      </header>

      {pageError && (
        <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
          {pageError}
        </p>
      )}

      {/* Accounts section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Your accounts</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{activeAccounts.length} active</span>
        </div>

        {activeAccounts.length === 0 ? (
          <Card className="border-dashed py-9 text-center">
            <WalletCards className="mx-auto h-7 w-7 text-[var(--accent)]" />
            <h3 className="mt-3 font-semibold">Add your first account</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              A bank account, cash wallet, or credit card is all you need before recording a transaction.
            </p>
            <Button className="mt-5" onClick={() => { setAccountError(''); setAccountOpen(true); }}>
              <Plus className="h-4 w-4" /> Add account
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeAccounts.map((account) => (
              <Card key={account.id} elevated className="group">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-[var(--accent-light)] p-2 text-[var(--accent)]">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <button
                    className="rounded-lg p-2 text-neutral-400 opacity-0 transition hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    onClick={() => archiveAccount(account.id, account.name)}
                    aria-label={`Archive ${account.name}`}
                    title="Archive account"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{account.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {account.type.replace(/_/g, ' ')} · {account._count.transactions} transactions
                </p>
                <p className="mt-5 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 num-tabular">
                  {formatCurrency(account.balance, account.currency)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Categories section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Categories</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Optional, but useful for budgets and monthly reports.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setCategoryError(''); setCategoryOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>

        {categories.length === 0 ? (
          <Card className="border-dashed py-7 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Create categories such as Groceries, Rent, Salary, or Freelance work.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(['EXPENSE', 'INCOME'] as const).map((type) => (
              <Card key={type}>
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-neutral-500 dark:text-neutral-400">
                  {type === 'EXPENSE' ? 'Spending' : 'Income'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories
                    .filter((category) => category.type === type)
                    .map((category) => (
                      <span
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                        key={category.id}
                      >
                        <i className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                        <span className="text-neutral-400">{category._count.transactions}</span>
                      </span>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* New Account Modal */}
      <Modal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="New account"
        description="Your opening balance can be negative for credit-card debt."
      >
        <form className="space-y-4" onSubmit={createAccount}>
          <label className="block text-sm font-medium">
            Account name
            <input
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={accountForm.name}
              onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })}
              placeholder="e.g. SBI Savings, HDFC Credit Card"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Type
              <select
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                value={accountForm.type}
                onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })}
              >
                {ACCOUNT_TYPES.map(({ value, label }) => (
                  // ✅ value attribute MUST be separate from display label
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Opening balance ({currency})
              <input
                inputMode="decimal"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                value={accountForm.balance}
                onChange={(event) => setAccountForm({ ...accountForm, balance: event.target.value })}
                placeholder="0"
                required
              />
            </label>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Currency: <strong>{currency}</strong>. Change it in profile settings before creating accounts.
          </p>

          {accountError && (
            <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">
              {accountError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setAccountOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingAccount}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Category Modal */}
      <Modal
        isOpen={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="New category"
        description="Keep names short and clear."
      >
        <form className="space-y-4" onSubmit={createCategory}>
          <label className="block text-sm font-medium">
            Category name
            <input
              className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
              placeholder="e.g. Groceries, Rent, Salary"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Kind
              <select
                className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--accent)] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                value={categoryForm.type}
                onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}
              >
                <option value="EXPENSE">Spending</option>
                <option value="INCOME">Income</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Color
              <input
                className="mt-1.5 h-11 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-900"
                type="color"
                value={categoryForm.color}
                onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })}
              />
            </label>
          </div>

          {categoryError && (
            <p role="alert" className="rounded-xl bg-[var(--danger-bg)] px-3 py-2.5 text-sm text-[var(--danger)]">
              {categoryError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingCategory}>
              Create category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
