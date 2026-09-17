'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Users,
  CalendarClock,
  FileText,
  Settings,
  Landmark,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Accounts & categories', icon: Landmark },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/split', label: 'Group expenses', icon: Users },
  { href: '/recurring', label: 'Subscriptions', icon: CalendarClock },
  { href: '/reports', label: 'Monthly Reports', icon: FileText, badge: 'PDF' },
  { href: '/settings', label: 'Settings & Data', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] md:min-h-[calc(100vh-4rem)] transition-colors">
      <div className="p-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          Financial Management
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold shadow-xs'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={clsx('h-4 w-4', isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]')} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                      item.badge === 'PDF'
                        ? 'bg-[var(--income-bg)] text-[var(--income)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
