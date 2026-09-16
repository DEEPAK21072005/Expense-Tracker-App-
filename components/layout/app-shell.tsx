'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { QuickAddModal } from '../transactions/quick-add-modal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Global Keyboard shortcut: "n" or "Ctrl+K" / "Cmd+K" opens Quick Add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is currently typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb] text-neutral-900 dark:bg-[#0b0d11] dark:text-neutral-100 transition-colors">
      <Navbar onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
      <div className="flex-1 flex flex-col md:flex-row mx-auto w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => {
          // Trigger a custom event so child pages can refresh if needed
          window.dispatchEvent(new Event('transaction-updated'));
        }}
      />
    </div>
  );
}
