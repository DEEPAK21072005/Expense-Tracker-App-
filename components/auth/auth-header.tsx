'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, WalletCards } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface AuthHeaderProps {
  subtitle?: string;
}

export function AuthHeader({ subtitle = 'Private personal finance' }: AuthHeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="mb-8 flex items-center justify-between">
      <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-85">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-[var(--ink-contrast)] shadow-md ring-1 ring-black/5 dark:ring-white/10">
          <WalletCards className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-tight text-[var(--text-main)]">
              Expense<span className="text-[var(--accent)] font-bold">Tracker</span>
            </span>
            <span className="rounded-full bg-[var(--accent-light)] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[var(--accent)] uppercase">
              Pro
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] shadow-xs transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-400" />
        ) : (
          <Moon className="h-4 w-4 text-stone-600" />
        )}
      </button>
    </div>
  );
}
