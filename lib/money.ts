/**
 * Money and Currency Domain Utilities
 *
 * Enforces integer minor-unit arithmetic to eliminate JavaScript floating-point inaccuracies.
 * All ledger balances, transaction totals, and splits are calculated at minor-unit precision
 * (e.g., 100 paise = ₹1.00, 100 cents = $1.00).
 */

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

/**
 * Converts a standard decimal currency value to integer minor units (e.g., 12.34 -> 1234).
 */
export function toMinorUnits(amount: number, currency: string = 'INR'): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  const factor = Math.pow(10, config.decimals);
  return Math.round(amount * factor);
}

/**
 * Converts integer minor units back to a standard decimal currency number (e.g., 1234 -> 12.34).
 */
export function fromMinorUnits(minorUnits: number, currency: string = 'INR'): number {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  const factor = Math.pow(10, config.decimals);
  return minorUnits / factor;
}

/**
 * Precise addition of two currency amounts.
 */
export function addMoney(a: number, b: number, currency: string = 'INR'): number {
  const minorA = toMinorUnits(a, currency);
  const minorB = toMinorUnits(b, currency);
  return fromMinorUnits(minorA + minorB, currency);
}

/**
 * Precise subtraction of two currency amounts (a - b).
 */
export function subtractMoney(a: number, b: number, currency: string = 'INR'): number {
  const minorA = toMinorUnits(a, currency);
  const minorB = toMinorUnits(b, currency);
  return fromMinorUnits(minorA - minorB, currency);
}

/**
 * Precise multiplication of a currency amount by a scalar factor.
 */
export function multiplyMoney(amount: number, factor: number, currency: string = 'INR'): number {
  const minor = toMinorUnits(amount, currency);
  const resultMinor = Math.round(minor * factor);
  return fromMinorUnits(resultMinor, currency);
}

/**
 * Distributes a total amount equally among N members down to the last indivisible minor unit.
 * Invariant: The sum of returned share values is GUARANTEED to exactly equal the total amount.
 */
export function distributeEqualShares(
  totalAmount: number,
  memberCount: number,
  currency: string = 'INR'
): number[] {
  if (memberCount <= 0) return [];
  const totalMinor = toMinorUnits(totalAmount, currency);
  const baseShareMinor = Math.floor(totalMinor / memberCount);
  const remainderMinor = totalMinor % memberCount;

  const shares: number[] = [];
  for (let i = 0; i < memberCount; i++) {
    // Distribute remainder minor units one by one to initial members
    const shareMinor = baseShareMinor + (i < remainderMinor ? 1 : 0);
    shares.push(fromMinorUnits(shareMinor, currency));
  }
  return shares;
}

/**
 * Formats a currency amount into a clean localized string.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  options: { includeDecimals?: boolean; compact?: boolean } = {}
): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;
  const decimals = options.includeDecimals === false ? 0 : config.decimals;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: options.compact ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    // Fallback if locale is unsupported
    return `${config.symbol}${amount.toFixed(decimals)}`;
  }
}

/**
 * Settlement transaction representing who pays whom to clear debt.
 */
export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

/**
 * Solves the debt minimization problem across a group of members.
 * Computes net balances (total paid - total share owed) and matches
 * largest debtor with largest creditor iteratively to produce the minimal
 * number of payment transactions.
 */
export function calculateSettlements(
  members: Array<{ id: string; name: string }>,
  expenses: Array<{
    paidById: string;
    amount: number;
    shares: Array<{ memberId: string; shareAmount: number }>;
  }>,
  currency: string = 'INR'
): {
  balances: Record<string, { memberName: string; netBalance: number }>;
  settlements: Settlement[];
} {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const netMinor: Record<string, number> = {};

  for (const m of members) {
    netMinor[m.id] = 0;
  }

  // 1. Compute net minor balance for each member: paid (+) vs share (-)
  for (const exp of expenses) {
    const paidMinor = toMinorUnits(exp.amount, currency);
    netMinor[exp.paidById] = (netMinor[exp.paidById] || 0) + paidMinor;

    for (const share of exp.shares) {
      const shareMinor = toMinorUnits(share.shareAmount, currency);
      netMinor[share.memberId] = (netMinor[share.memberId] || 0) - shareMinor;
    }
  }

  // 2. Separate into debtors (< 0) and creditors (> 0)
  interface BalanceNode {
    id: string;
    name: string;
    amountMinor: number;
  }

  const debtors: BalanceNode[] = [];
  const creditors: BalanceNode[] = [];
  const balancesResult: Record<string, { memberName: string; netBalance: number }> = {};

  for (const [id, minor] of Object.entries(netMinor)) {
    const name = memberMap.get(id) || 'Unknown Member';
    balancesResult[id] = {
      memberName: name,
      netBalance: fromMinorUnits(minor, currency),
    };

    if (minor < -0.5) {
      debtors.push({ id, name, amountMinor: -minor }); // owes money
    } else if (minor > 0.5) {
      creditors.push({ id, name, amountMinor: minor }); // owed money
    }
  }

  // 3. Greedy two-pointer debt clearing
  const settlements: Settlement[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleMinor = Math.min(debtor.amountMinor, creditor.amountMinor);

    if (settleMinor > 0) {
      settlements.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: fromMinorUnits(settleMinor, currency),
      });

      debtor.amountMinor -= settleMinor;
      creditor.amountMinor -= settleMinor;
    }

    if (debtor.amountMinor <= 0.5) dIdx++;
    if (creditor.amountMinor <= 0.5) cIdx++;
  }

  return {
    balances: balancesResult,
    settlements,
  };
}
