import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageInput } from '../lib/natural-language';

describe('Natural Language Transaction Parsing Engine', () => {
  it('parses expense with currency symbol, payee, and relative date', () => {
    const result = parseNaturalLanguageInput('₹450 dinner at Seoul Kitchen yesterday');
    expect(result.amount).toBe(450);
    expect(result.currency).toBe('INR');
    expect(result.type).toBe('EXPENSE');
    expect(result.categoryHint).toBe('Food & Dining');
    expect(result.payee).toContain('Seoul Kitchen');

    // Date must be yesterday
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    expect(result.date).toBe(expected.toISOString().split('T')[0]);
  });

  it('parses income transaction with keyword detection', () => {
    const result = parseNaturalLanguageInput('1500 salary today');
    expect(result.amount).toBe(1500);
    expect(result.type).toBe('INCOME');
    expect(result.categoryHint).toBe('Income');
  });

  it('handles USD and decimal amounts', () => {
    const result = parseNaturalLanguageInput('$45.50 groceries at Whole Foods');
    expect(result.amount).toBe(45.5);
    expect(result.currency).toBe('USD');
    expect(result.type).toBe('EXPENSE');
    expect(result.categoryHint).toBe('Groceries');
    expect(result.payee).toContain('Whole Foods');
  });
});
