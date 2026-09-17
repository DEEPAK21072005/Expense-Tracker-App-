'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/money';
import { Users, Plus, ArrowRight, CheckCircle2, Receipt } from 'lucide-react';

interface Member {
  id: string;
  name: string;
}

interface SplitGroup {
  id: string;
  name: string;
  description: string | null;
  totalGroupSpent: number;
  members: Member[];
  balances: Record<string, { memberName: string; netBalance: number }>;
  settlements: Array<{
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    paidBy: { id: string; name: string };
    shares: Array<{ member: { name: string }; shareAmount: number }>;
  }>;
}

export default function SplitPage() {
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // New Group form
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [membersInput, setMembersInput] = useState('');
  const [currency, setCurrency] = useState('INR');

  // Add Expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidById, setExpPaidById] = useState('');

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, meRes] = await Promise.all([
        fetch('/api/split'),
        fetch('/api/auth/me'),
      ]);
      const json = await res.json();
      const meJson = await meRes.json();
      if (meJson.success && meJson.data?.baseCurrency) {
        setCurrency(meJson.data.baseCurrency);
      }
      if (json.success && json.data.length > 0) {
        setGroups(json.data);
        if (!selectedGroupId) setSelectedGroupId(json.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const members = membersInput
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (members.length < 2) {
      alert('Please enter at least 2 member names separated by commas.');
      return;
    }

    try {
      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_GROUP',
          name: groupName.trim(),
          description: groupDesc.trim() || undefined,
          members,
        }),
      });
      if (res.ok) {
        setGroupName('');
        setGroupDesc('');
        setIsNewGroupOpen(false);
        loadGroups();
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!activeGroup || !expPaidById) {
      alert('Please select who paid for the expense.');
      return;
    }

    try {
      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroup.id,
          paidById: expPaidById,
          description: expDesc.trim() || 'Shared Group Expense',
          amount: parsedAmount,
          currency: currency || 'INR',
          date: new Date().toISOString(),
          splitType: 'EQUAL',
        }),
      });

      if (res.ok) {
        setExpDesc('');
        setExpAmount('');
        setIsAddExpenseOpen(false);
        loadGroups();
      }
    } catch (err) {
      console.error('Failed to add split expense:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Group Expense Splitter
            </h1>
            <Badge variant="info">Legacy Mode Upgraded</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Split shared apartment, dinner, or travel bills with zero-sum minor unit accuracy and automated debt settlement
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => setIsNewGroupOpen(true)} className="gap-1.5">
            <Users className="h-4 w-4" />
            New Group
          </Button>

          {activeGroup ? (
            <Button
              size="sm"
              onClick={() => {
                setExpPaidById(activeGroup.members[0]?.id || '');
                setIsAddExpenseOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Record Group Expense
            </Button>
          ) : null}
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-sm text-neutral-400">No split groups created yet. Click &quot;New Group&quot; to get started.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Group Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`rounded-2xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeGroup.id === g.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                }`}
              >
                {g.name} ({g.members.length} members)
              </button>
            ))}
          </div>

          {/* Group Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Member Net Balances */}
            <Card className="lg:col-span-2 space-y-4">
              <CardHeader>
                <div>
                  <CardTitle>{activeGroup.name} — Member Balances</CardTitle>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Total pool spend: {formatCurrency(activeGroup.totalGroupSpent, currency)}
                  </p>
                </div>
              </CardHeader>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {Object.entries(activeGroup.balances).map(([mId, b]) => {
                  const isPositive = b.netBalance > 0.01;
                  const isNegative = b.netBalance < -0.01;

                  return (
                    <div key={mId} className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                          {b.memberName}
                        </span>
                        <p className="text-xs text-neutral-500">
                          {isPositive ? 'Paid more than equal share' : isNegative ? 'Owes group pool' : 'Fully settled'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-bold num-tabular ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isNegative
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(b.netBalance, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Automated Debt Settlement Matrix */}
            <Card className="space-y-4">
              <CardHeader>
                <CardTitle>Suggested Settlements</CardTitle>
              </CardHeader>

              {activeGroup.settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    All members are completely even!
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">No outstanding balances to settle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeGroup.settlements.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 dark:border-neutral-800/80 dark:bg-neutral-850/40 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-neutral-800 dark:text-neutral-200">{s.fromName}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="text-neutral-800 dark:text-neutral-200">{s.toName}</span>
                      </div>
                      <div className="text-center font-bold text-blue-600 dark:text-blue-400 text-sm num-tabular">
                        {formatCurrency(s.amount, currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Group Expenses History */}
          <Card>
            <CardHeader>
              <CardTitle>Group Expense History ({activeGroup.expenses.length})</CardTitle>
            </CardHeader>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-xs">
              {activeGroup.expenses.length === 0 ? (
                <p className="py-8 text-center text-neutral-400">No expenses recorded in this group yet.</p>
              ) : (
                activeGroup.expenses.map((e) => (
                  <div key={e.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-neutral-100 p-2 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">{e.description}</span>
                        <p className="text-neutral-500 text-[11px]">
                          Paid by <span className="font-medium text-neutral-700 dark:text-neutral-300">{e.paidBy.name}</span> on{' '}
                          {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm num-tabular">
                        {formatCurrency(e.amount, e.currency)}
                      </span>
                      <p className="text-[11px] text-neutral-400">
                        Split equally ({formatCurrency(e.amount / activeGroup.members.length, e.currency || currency)} each)
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* New Group Modal */}
      <Modal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
        title="Create Split Group"
        description="Set up a new group for apartment roommates, team dinners, or road trips"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Flat 302 Roommates"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Monthly rent, groceries, and broadband"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Member Names (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Alice, Bob, Charlie"
              value={membersInput}
              onChange={(e) => setMembersInput(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              required
            />
            <p className="text-[11px] text-neutral-400 mt-1">At least 2 members are required to split expenses.</p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewGroupOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Group</Button>
          </div>
        </form>
      </Modal>

      {/* Record Expense Modal */}
      {activeGroup ? (
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title={`Add Expense to ${activeGroup.name}`}
          description="Log a bill paid on behalf of the group"
        >
          <form onSubmit={handleAddExpense} className="space-y-4">
            <Input
              label="Expense Description"
              placeholder="e.g. Groceries & Pantry Supplies"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              required
            />

            <Input
              label="Total Amount (INR)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Paid By
              </label>
              <select
                value={expPaidById}
                onChange={(e) => setExpPaidById(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                required
              >
                {activeGroup.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              This amount will be split equally among all {activeGroup.members.length} group members (
              {expAmount ? formatCurrency(parseFloat(expAmount) / activeGroup.members.length, currency) : formatCurrency(0, currency)}{' '}
              each).
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsAddExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Expense</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
