import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98] select-none cursor-pointer';

    const variants = {
      primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs',
      secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--border-hover)]/30 text-[var(--text-main)]',
      outline: 'border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-main)]',
      danger: 'bg-[var(--danger)] hover:opacity-90 text-white shadow-xs',
      ghost: 'hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-main)]',
      subtle: 'bg-[var(--accent-light)] hover:opacity-90 text-[var(--accent)]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
