'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Plus, LogOut } from 'lucide-react';
import { useTheme } from '../theme-provider';
import { Button } from '../ui/button';

export interface NavbarProps {
  onOpenQuickAdd: () => void;
  onToggleMobileMenu?: () => void;
}

export function Navbar({ onOpenQuickAdd }: NavbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((result) => {
        if (result.success) setName(result.data.name);
      })
      .catch(() => undefined);
  }, []);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <img
              src="/icon-192.png"
              alt="Expense Tracker Pro Icon"
              className="h-8 w-8 rounded-xl object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10"
            />
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-[var(--text-main)]">
                Expense<span className="text-[var(--accent)] font-bold">Tracker</span>
              </span>
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--accent)] uppercase">
                Pro
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
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-stone-600" />
            )}
          </button>

          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-transparent px-2.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]"
          >
            <span className="hidden max-w-28 truncate sm:inline">{name || 'Account'}</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
