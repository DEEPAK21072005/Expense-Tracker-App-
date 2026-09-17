/** Financial helpers. Persistent values are always integer minor units. */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, locale: 'ja-JP' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, locale: 'en-SG' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, locale: 'en-AU' },
};

export const MAX_MINOR_UNITS = 2_147_483_647;

export function getCurrency(currency = 'INR'): CurrencyConfig {
  const config = SUPPORTED_CURRENCIES[currency];
  if (!config) throw new Error('Unsupported currency');
  return config;
}

/** Parses user input without float rounding. Returns a positive database-safe integer. */
export function parseAmountToMinor(raw: string | number, currency = 'INR'): number {
  const { decimals } = getCurrency(currency);
  const value = typeof raw === 'number' ? String(raw) : raw.trim();
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error('Enter a valid positive amount');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Amounts in ${currency} support at most ${decimals} decimal places`);
  const padded = `${fraction}${'0'.repeat(decimals)}`.slice(0, decimals);
  const minor = Number(whole) * 10 ** decimals + Number(padded || 0);
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > MAX_MINOR_UNITS) {
    throw new Error('Amount is outside the supported range');
  }
  return minor;
}

/** Parses an account opening balance, which may be negative (for example, card debt). */
export function parseSignedAmountToMinor(raw: string | number, currency = 'INR'): number {
  const value = typeof raw === 'number' ? String(raw) : raw.trim();
  if (value === '0' || value === '0.0' || value === '0.00') return 0;
  const negative = value.startsWith('-');
  const minor = parseAmountToMinor(negative ? value.slice(1) : value, currency);
  return negative ? -minor : minor;
}

export function toMinorUnits(amount: number, currency = 'INR'): number {
  return parseAmountToMinor(amount, currency);
}

export function fromMinorUnits(minorUnits: number, currency = 'INR'): number {
  const { decimals } = getCurrency(currency);
  return minorUnits / 10 ** decimals;
}

export function addMinor(a: number, b: number): number {
  const total = a + b;
  if (!Number.isSafeInteger(total) || Math.abs(total) > MAX_MINOR_UNITS) throw new Error('Money total is outside the supported range');
  return total;
}

export function subtractMinor(a: number, b: number): number {
  return addMinor(a, -b);
}

// Display-only decimal helpers retained for client components. Never use these to persist data.
export function addMoney(a: number, b: number, currency = 'INR'): number {
  const minorA = Math.round(a * 10 ** getCurrency(currency).decimals);
  const minorB = Math.round(b * 10 ** getCurrency(currency).decimals);
  return fromMinorUnits(minorA + minorB, currency);
}

export function subtractMoney(a: number, b: number, currency = 'INR'): number {
  return addMoney(a, -b, currency);
}

export function multiplyMoney(amount: number, factor: number, currency = 'INR'): number {
  const minor = Math.round(amount * 10 ** getCurrency(currency).decimals);
  return fromMinorUnits(Math.round(minor * factor), currency);
}

export function distributeEqualMinorUnits(totalMinor: number, memberCount: number): number[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0 || memberCount <= 0) return [];
  const base = Math.floor(totalMinor / memberCount);
  const remainder = totalMinor % memberCount;
  return Array.from({ length: memberCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function distributeEqualShares(totalAmount: number, memberCount: number, currency = 'INR'): number[] {
  const totalMinor = toMinorUnits(totalAmount, currency);
  return distributeEqualMinorUnits(totalMinor, memberCount).map((minor) => fromMinorUnits(minor, currency));
}

export function formatCurrency(
  amount: number,
  currency = 'INR',
  options: { includeDecimals?: boolean; compact?: boolean } = {}
): string {
  const config = getCurrency(currency);
  const decimals = options.includeDecimals === false ? 0 : config.decimals;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency', currency: config.code, minimumFractionDigits: decimals,
    maximumFractionDigits: decimals, notation: options.compact ? 'compact' : 'standard',
  }).format(amount);
}

export interface Settlement { fromId: string; fromName: string; toId: string; toName: string; amount: number }

export function calculateSettlements(
  members: Array<{ id: string; name: string }>,
  expenses: Array<{ paidById: string; amount: number; shares: Array<{ memberId: string; shareAmount: number }> }>,
  currency = 'INR'
): { balances: Record<string, { memberName: string; netBalance: number }>; settlements: Settlement[] } {
  const names = new Map(members.map((member) => [member.id, member.name]));
  const balancesMinor: Record<string, number> = Object.fromEntries(members.map((member) => [member.id, 0]));
  for (const expense of expenses) {
    balancesMinor[expense.paidById] = addMinor(balancesMinor[expense.paidById] ?? 0, Math.round(expense.amount * 10 ** getCurrency(currency).decimals));
    for (const share of expense.shares) balancesMinor[share.memberId] = subtractMinor(balancesMinor[share.memberId] ?? 0, Math.round(share.shareAmount * 10 ** getCurrency(currency).decimals));
  }
  const debtors = Object.entries(balancesMinor).filter(([, value]) => value < 0).map(([id, value]) => ({ id, amount: -value })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balancesMinor).filter(([, value]) => value > 0).map(([id, value]) => ({ id, amount: value })).sort((a, b) => b.amount - a.amount);
  const settlements: Settlement[] = [];
  let debtor = 0; let creditor = 0;
  while (debtor < debtors.length && creditor < creditors.length) {
    const amountMinor = Math.min(debtors[debtor].amount, creditors[creditor].amount);
    settlements.push({ fromId: debtors[debtor].id, fromName: names.get(debtors[debtor].id) ?? 'Unknown', toId: creditors[creditor].id, toName: names.get(creditors[creditor].id) ?? 'Unknown', amount: fromMinorUnits(amountMinor, currency) });
    debtors[debtor].amount -= amountMinor; creditors[creditor].amount -= amountMinor;
    if (debtors[debtor].amount === 0) debtor += 1;
    if (creditors[creditor].amount === 0) creditor += 1;
  }
  return { balances: Object.fromEntries(Object.entries(balancesMinor).map(([id, value]) => [id, { memberName: names.get(id) ?? 'Unknown', netBalance: fromMinorUnits(value, currency) }])), settlements };
}
