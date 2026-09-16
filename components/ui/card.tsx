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
          'rounded-2xl border border-neutral-200/80 bg-white p-5 transition-all duration-200 dark:border-neutral-800/80 dark:bg-[#14171f]',
          elevated
            ? 'shadow-md shadow-neutral-900/5 dark:shadow-black/20'
            : 'shadow-sm shadow-neutral-900/3',
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
      className={twMerge('text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100', className)}
      {...props}
    >
      {children}
    </h3>
  );
}
