/**
 * Natural Language Transaction Quick-Entry Parser
 *
 * Parses human text into structured transaction fields.
 * RULE: This parser is ASSISTIVE only; parsed candidates are always displayed
 * to the user for visual confirmation and manual editing before saving.
 */

export interface ParsedTransactionCandidate {
  amount: number | null;
  currency: string;
  type: 'EXPENSE' | 'INCOME';
  date: string; // YYYY-MM-DD
  payee: string;
  categoryHint: string;
  rawInput: string;
}

export function parseNaturalLanguageInput(
  input: string,
  defaultCurrency: string = 'INR'
): ParsedTransactionCandidate {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      amount: null,
      currency: defaultCurrency,
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
      payee: '',
      categoryHint: 'General',
      rawInput: input,
    };
  }

  // 1. Detect currency symbol
  let currency = defaultCurrency;
  if (trimmed.includes('₹') || /inr\b/i.test(trimmed)) currency = 'INR';
  else if (trimmed.includes('$') || /usd\b/i.test(trimmed)) currency = 'USD';
  else if (trimmed.includes('€') || /eur\b/i.test(trimmed)) currency = 'EUR';
  else if (trimmed.includes('£') || /gbp\b/i.test(trimmed)) currency = 'GBP';
  else if (trimmed.includes('¥') || /jpy\b/i.test(trimmed)) currency = 'JPY';

  // 2. Extract amount: matches e.g. "₹450", "$ 1,500.50", "450.00", "1500"
  let amount: number | null = null;
  const amountMatch = trimmed.match(/(?:[₹$€£¥]|(?:rs\.?|inr|usd|eur)\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i);
  if (amountMatch && amountMatch[1]) {
    const cleanNumStr = amountMatch[1].replace(/,/g, '');
    const parsed = parseFloat(cleanNumStr);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Extract date
  const now = new Date();
  let dateObj = new Date();
  const lower = trimmed.toLowerCase();

  if (/\byesterday\b/.test(lower)) {
    dateObj.setDate(now.getDate() - 1);
  } else if (/\btomorrow\b/.test(lower)) {
    dateObj.setDate(now.getDate() + 1);
  } else {
    // Check for YYYY-MM-DD or DD/MM/YYYY
    const isoDateMatch = trimmed.match(/\b(20\d\d[-/]\d{1,2}[-/]\d{1,2})\b/);
    if (isoDateMatch) {
      const parsedDate = new Date(isoDateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        dateObj = parsedDate;
      }
    }
  }
  const dateStr = dateObj.toISOString().split('T')[0];

  // 4. Infer transaction type
  const isIncome = /\b(salary|paycheck|bonus|freelance|dividend|income|received|stipend)\b/i.test(lower);
  const type: 'EXPENSE' | 'INCOME' = isIncome ? 'INCOME' : 'EXPENSE';

  // 5. Category hints & Payee inference
  let categoryHint = isIncome ? 'Income' : 'General';
  if (/\b(dinner|lunch|breakfast|coffee|cafe|restaurant|food|burger|pizza|kitchen)\b/i.test(lower)) {
    categoryHint = 'Food & Dining';
  } else if (/\b(uber|taxi|metro|train|flight|bus|fuel|petrol|gas)\b/i.test(lower)) {
    categoryHint = 'Transportation';
  } else if (/\b(grocery|groceries|supermarket|vegetables|milk)\b/i.test(lower)) {
    categoryHint = 'Groceries';
  } else if (/\b(rent|maintenance|electricity|wifi|water|utility|utilities)\b/i.test(lower)) {
    categoryHint = 'Housing & Utilities';
  } else if (/\b(netflix|spotify|movie|cinema|game|entertainment)\b/i.test(lower)) {
    categoryHint = 'Entertainment';
  } else if (/\b(doctor|medicine|hospital|pharmacy|health)\b/i.test(lower)) {
    categoryHint = 'Healthcare';
  } else if (/\b(amazon|shopping|clothes|shoes|electronics)\b/i.test(lower)) {
    categoryHint = 'Shopping';
  }

  // 6. Payee extraction (look for "at <Payee>" or "to <Payee>" or "from <Payee>")
  let payee = '';
  const atMatch = trimmed.match(/\b(?:at|to|from)\s+([A-Za-z0-9\s&'-]+?)(?:\s+(?:yesterday|today|tomorrow|on|\d|\$|₹|€)|$)/i);
  if (atMatch && atMatch[1]) {
    payee = atMatch[1].trim();
  } else {
    // If no explicit preposition, try removing amount, keywords, and currency
    let clean = trimmed
      .replace(/[₹$€£¥]/g, '')
      .replace(/\b(?:yesterday|today|tomorrow|inr|usd|eur|gbp)\b/gi, '')
      .replace(new RegExp(`\\b${amount}\\b`, 'g'), '')
      .trim();
    if (clean.length > 0 && clean.length < 50) {
      payee = clean;
    }
  }

  return {
    amount,
    currency,
    type,
    date: dateStr,
    payee: payee || (isIncome ? 'Employer / Client' : 'Merchant'),
    categoryHint,
    rawInput: input,
  };
}
