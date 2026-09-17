import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-xs font-medium text-[var(--text-muted)]">
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm text-[var(--text-main)] transition-all placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-rose-500/20',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
