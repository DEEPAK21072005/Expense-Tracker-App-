import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  addMoney,
  subtractMoney,
  multiplyMoney,
  distributeEqualShares,
  formatCurrency,
  calculateSettlements,
} from '../lib/money';

describe('Money Engine & Minor-Unit Math', () => {
  it('converts to and from minor units accurately', () => {
    expect(toMinorUnits(12.34, 'INR')).toBe(1234);
    expect(fromMinorUnits(1234, 'INR')).toBe(12.34);
    expect(toMinorUnits(500, 'JPY')).toBe(500); // 0 decimals
    expect(fromMinorUnits(500, 'JPY')).toBe(500);
  });

  it('eliminates floating point errors in addition', () => {
    // Standard JS: 0.1 + 0.2 === 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);
    // Money utility:
    expect(addMoney(0.1, 0.2, 'INR')).toBe(0.3);
  });

  it('handles exact subtraction', () => {
    expect(subtractMoney(100.5, 30.25, 'INR')).toBe(70.25);
  });

  it('handles multiplication with rounding', () => {
    expect(multiplyMoney(10.33, 3, 'INR')).toBe(30.99);
  });

  it('distributes equal shares with guaranteed zero-remainder invariant', () => {
    // ₹100 divided among 3 members: 33.34, 33.33, 33.33 -> sum must be 100.00
    const shares3 = distributeEqualShares(100, 3, 'INR');
    expect(shares3).toHaveLength(3);
    expect(shares3).toEqual([33.34, 33.33, 33.33]);
    const total3 = shares3.reduce((sum, val) => addMoney(sum, val, 'INR'), 0);
    expect(total3).toBe(100.0);

    // ₹1000 divided among 7 members
    const shares7 = distributeEqualShares(1000, 7, 'INR');
    expect(shares7).toHaveLength(7);
    const total7 = shares7.reduce((sum, val) => addMoney(sum, val, 'INR'), 0);
    expect(total7).toBe(1000.0);
  });

  it('formats currency with locale symbols', () => {
    const formattedInr = formatCurrency(1500.5, 'INR');
    expect(formattedInr).toContain('1,500.50');
    expect(formattedInr).toContain('₹');

    const formattedUsd = formatCurrency(2500, 'USD');
    expect(formattedUsd).toContain('$2,500.00');
  });

  it('solves multi-member debt minimization correctly', () => {
    const members = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];

    // Alice paid ₹300 for dinner for all 3 (₹100 each)
    const expenses = [
      {
        paidById: '1',
        amount: 300,
        shares: [
          { memberId: '1', shareAmount: 100 },
          { memberId: '2', shareAmount: 100 },
          { memberId: '3', shareAmount: 100 },
        ],
      },
    ];

    const result = calculateSettlements(members, expenses, 'INR');

    // Bob owes Alice 100, Charlie owes Alice 100
    expect(result.balances['1'].netBalance).toBe(200);
    expect(result.balances['2'].netBalance).toBe(-100);
    expect(result.balances['3'].netBalance).toBe(-100);

    expect(result.settlements).toHaveLength(2);
    expect(result.settlements).toContainEqual({
      fromId: '2',
      fromName: 'Bob',
      toId: '1',
      toName: 'Alice',
      amount: 100,
    });
    expect(result.settlements).toContainEqual({
      fromId: '3',
      fromName: 'Charlie',
      toId: '1',
      toName: 'Alice',
      amount: 100,
    });
  });
});
