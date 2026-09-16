'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, Plus, WalletCards } from 'lucide-react';
import { useTheme } from '../theme-provider';
import { Button } from '../ui/button';

export interface NavbarProps {
  onOpenQuickAdd: () => void;
  onToggleMobileMenu?: () => void;
}

export function Navbar({ onOpenQuickAdd }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-md dark:border-neutral-800/80 dark:bg-[#0b0d11]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            {/* App Icon */}
            <img
              src="/icon-192.png"
              alt="Expense Tracker Pro Icon"
              className="h-9 w-9 rounded-xl object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
            />
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Expense<span className="text-blue-600 dark:text-blue-400">Tracker</span>
              </span>
              <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                PRO
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Add Button */}
          <Button
            onClick={onOpenQuickAdd}
            size="sm"
            className="shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-neutral-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
