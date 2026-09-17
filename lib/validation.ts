import { z } from 'zod';
import { parseAmountToMinor, parseSignedAmountToMinor, SUPPORTED_CURRENCIES } from './money';

const currencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CAD', 'AUD']);
const rawAmountSchema = z.union([z.string(), z.number().finite()]);

function amountForCurrency(value: string | number, currency: keyof typeof SUPPORTED_CURRENCIES, context: z.RefinementCtx): number {
  try { return parseAmountToMinor(value, currency); }
  catch (error) { context.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid amount', path: ['amount'] }); return z.NEVER as never; }
}

export const RegisterInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email address').max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10, 'Use at least 10 characters').max(128).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
  baseCurrency: currencySchema.default('INR'),
});

export const LoginInputSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const TransactionInputSchema = z.object({
  amount: rawAmountSchema,
  currency: currencySchema.default('INR'),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  date: z.coerce.date(),
  accountId: z.string().cuid(),
  toAccountId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  payee: z.string().trim().max(140).optional().nullable(),
  notes: z.string().trim().max(2_000).optional().nullable(),
  tags: z.string().trim().max(300).optional().nullable(),
}).superRefine((value, context) => {
  (value as typeof value & { amountMinor: number }).amountMinor = amountForCurrency(value.amount, value.currency, context);
  if (value.type === 'TRANSFER' && !value.toAccountId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['toAccountId'], message: 'Choose the destination account' });
  if (value.type === 'TRANSFER' && value.toAccountId === value.accountId) context.addIssue({ code: z.ZodIssueCode.custom, path: ['toAccountId'], message: 'Choose a different destination account' });
});

export const AccountInputSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(80),
  type: z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'SAVINGS', 'WALLET', 'INVESTMENT']).default('BANK'),
  currency: currencySchema.default('INR'),
  balance: rawAmountSchema.optional().default('0'),
}).superRefine((value, context) => {
  const target = value as typeof value & { balanceMinor: number };
  if (String(value.balance).trim() === '0') { target.balanceMinor = 0; return; }
  try { target.balanceMinor = parseSignedAmountToMinor(value.balance, value.currency); }
  catch (error) { context.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid opening balance', path: ['balance'] }); }
});

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(60),
  type: z.enum(['EXPENSE', 'INCOME']),
  icon: z.string().trim().max(40).default('tag'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a six-digit hex color').default('#64748B'),
});

export const BudgetInputSchema = z.object({
  categoryId: z.string().cuid().optional().nullable(),
  amount: rawAmountSchema,
  currency: currencySchema.default('INR'),
  period: z.literal('MONTHLY').default('MONTHLY'),
  month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  year: z.coerce.number().int().min(2020).max(2099).optional().nullable(),
  alertThreshold: z.coerce.number().min(0.5).max(1).default(0.85),
}).superRefine((value, context) => { (value as typeof value & { amountMinor: number }).amountMinor = amountForCurrency(value.amount, value.currency, context); });

export const RecurringPaymentInputSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(100),
  amount: rawAmountSchema,
  currency: currencySchema.default('INR'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  nextDate: z.coerce.date(),
  accountId: z.string().cuid(),
  categoryId: z.string().cuid().optional().nullable(),
}).superRefine((value, context) => { (value as typeof value & { amountMinor: number }).amountMinor = amountForCurrency(value.amount, value.currency, context); });

export const SplitGroupInputSchema = z.object({ name: z.string().trim().min(1).max(50), description: z.string().trim().max(200).optional().nullable(), members: z.array(z.string().trim().min(1).max(80)).min(2).max(30) });
export const SplitExpenseInputSchema = z.object({ groupId: z.string().cuid(), paidById: z.string().cuid(), description: z.string().trim().min(1).max(100), amount: rawAmountSchema, currency: currencySchema.default('INR'), date: z.coerce.date(), splitType: z.enum(['EQUAL', 'EXACT']).default('EQUAL'), customShares: z.array(z.object({ memberId: z.string().cuid(), shareAmount: rawAmountSchema })).optional() }).superRefine((value, context) => { (value as typeof value & { amountMinor: number }).amountMinor = amountForCurrency(value.amount, value.currency, context); });
