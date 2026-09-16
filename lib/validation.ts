import { z } from 'zod';

export const TransactionInputSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('INR'),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  accountId: z.string().min(1, 'Account is required'),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  payee: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  tags: z.string().max(100).optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
});

export const AccountInputSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50),
  type: z.enum(['BANK', 'CASH', 'CREDIT_CARD', 'SAVINGS', 'WALLET', 'INVESTMENT']),
  currency: z.string().default('INR'),
  balance: z.number().default(0.0),
});

export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  type: z.enum(['EXPENSE', 'INCOME']),
  icon: z.string().default('tag'),
  color: z.string().default('#3B82F6'),
});

export const BudgetInputSchema = z.object({
  categoryId: z.string().optional().nullable(),
  amount: z.number().positive('Budget amount must be positive'),
  period: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  month: z.number().min(1).max(12).optional().nullable(),
  year: z.number().min(2020).max(2099).optional().nullable(),
  alertThreshold: z.number().min(0.1).max(1.0).default(0.85),
});

export const RecurringPaymentInputSchema = z.object({
  description: z.string().min(1, 'Description is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  nextDate: z.string().or(z.date()).transform((val) => new Date(val)),
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional().nullable(),
});

export const SplitGroupInputSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(50),
  description: z.string().max(200).optional().nullable(),
  members: z.array(z.string().min(1)).min(2, 'At least 2 members are required'),
});

export const SplitExpenseInputSchema = z.object({
  groupId: z.string().min(1),
  paidById: z.string().min(1),
  description: z.string().min(1).max(100),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  splitType: z.enum(['EQUAL', 'EXACT']).default('EQUAL'),
  customShares: z
    .array(
      z.object({
        memberId: z.string(),
        shareAmount: z.number().min(0),
      })
    )
    .optional(),
});
