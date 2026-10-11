import { describe, it, expect } from 'vitest';
import prisma from '../lib/db';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES } from '../lib/auth';

describe('Prisma User Registration integration', () => {
  it('successfully creates user with nested categories and accounts', async () => {
    const testEmail = `test_${Date.now()}@example.com`;
    try {
      const user = await prisma.user.create({
        data: {
          name: 'DEEPAK POLISETTI',
          email: testEmail,
          baseCurrency: 'INR',
          passwordHash: await bcrypt.hash('Password123!', 12),
          categories: {
            create: DEFAULT_CATEGORIES,
          },
          accounts: {
            create: [
              {
                name: 'Primary Account',
                type: 'BANK',
                currency: 'INR',
                balanceMinor: 0,
              },
            ],
          },
        },
        include: {
          accounts: true,
          categories: true,
        },
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.accounts.length).toBe(1);
      expect(user.categories.length).toBe(DEFAULT_CATEGORIES.length);
      console.log('Successfully registered test user:', user.id);

      // Clean up
      await prisma.user.delete({ where: { id: user.id } });
    } catch (err) {
      console.error('ERROR in registration test:', err);
      throw err;
    }
  });
});
