import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className, elevated = false, children, ...props }: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all duration-200 text-[var(--text-main)]',
          elevated
            ? 'shadow-[0_4px_24px_-6px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.4)]'
            : 'shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge('flex items-center justify-between pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={twMerge('text-sm font-semibold tracking-tight text-[var(--text-main)]', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
