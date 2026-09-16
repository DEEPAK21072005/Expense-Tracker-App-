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
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/split', label: 'Group Splitter', icon: Users, badge: 'Legacy Upgrade' },
  { href: '/recurring', label: 'Subscriptions', icon: CalendarClock },
  { href: '/reports', label: 'Monthly Reports', icon: FileText, badge: 'PDF' },
  { href: '/settings', label: 'Settings & Data', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-[#14171f] md:min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
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
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={clsx('h-4 w-4', isActive ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500')} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                      item.badge === 'PDF'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-200/60 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
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
