import { describe, it, expect } from 'vitest';
import { generateExecutiveMonthlyPdf } from '../lib/pdf-generator';

describe('PDF Generation Engine', () => {
  it('generates a valid binary PDF document with executive tables and ledger', async () => {
    const pdfBytes = await generateExecutiveMonthlyPdf({
      periodMonth: 9,
      periodYear: 2026,
      currency: 'INR',
      userName: 'Test User',
      totalIncome: 85000,
      totalExpenses: 28600,
      netSavings: 56400,
      savingsRate: 66.3,
      categories: [
        { name: 'Housing & Utilities', type: 'EXPENSE', total: 22000, percentage: 76.9 },
        { name: 'Groceries', type: 'EXPENSE', total: 4350, percentage: 15.2 },
        { name: 'Food & Dining', type: 'EXPENSE', total: 1450, percentage: 5.1 },
        { name: 'Transportation', type: 'EXPENSE', total: 800, percentage: 2.8 },
      ],
      budgets: [
        { categoryName: 'Housing & Utilities', limit: 25000, spent: 22000, variance: 3000, percentUsed: 88 },
        { categoryName: 'Groceries', limit: 6000, spent: 4350, variance: 1650, percentUsed: 72.5 },
      ],
      transactions: [
        {
          date: '2026-09-02',
          payee: 'Apartment Rent',
          category: 'Housing & Utilities',
          account: 'Primary Checking',
          type: 'EXPENSE',
          amount: 22000,
        },
        {
          date: '2026-09-05',
          payee: 'Supermarket',
          category: 'Groceries',
          account: 'Credit Card',
          type: 'EXPENSE',
          amount: 4350,
        },
      ],
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF Magic Bytes: %PDF
    const header = String.fromCharCode(...pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });
});
