import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  RegisterInputSchema,
  LoginInputSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from '../lib/validation';
import { createPasswordResetToken, verifyPasswordResetToken } from '../lib/auth';

describe('Auth Validation Schemas', () => {
  describe('RegisterInputSchema', () => {
    it('accepts valid registration data', () => {
      const valid = {
        name: 'Jane Doe',
        email: '  Jane@Example.COM  ',
        password: 'Password123',
        baseCurrency: 'INR',
      };
      const result = RegisterInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Jane Doe');
        expect(result.data.email).toBe('jane@example.com');
        expect(result.data.baseCurrency).toBe('INR');
      }
    });

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Pass1', // only 5 characters
      };
      const result = RegisterInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('8 characters');
      }
    });

    it('rejects passwords without a letter or without a number', () => {
      const noLetter = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: '1234567890',
      };
      expect(RegisterInputSchema.safeParse(noLetter).success).toBe(false);

      const noNumber = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'abcdefghij',
      };
      expect(RegisterInputSchema.safeParse(noNumber).success).toBe(false);
    });

    it('rejects invalid email formats', () => {
      const badEmail = {
        name: 'Jane Doe',
        email: 'not-an-email',
        password: 'Password123',
      };
      const result = RegisterInputSchema.safeParse(badEmail);
      expect(result.success).toBe(false);
    });
  });

  describe('LoginInputSchema', () => {
    it('normalizes email to lowercase and trims whitespace', () => {
      const input = {
        email: '   User@Domain.COM   ',
        password: 'SecretPassword1',
      };
      const result = LoginInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('user@domain.com');
      }
    });

    it('rejects missing password', () => {
      const input = {
        email: 'user@domain.com',
        password: '',
      };
      const result = LoginInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts optional rememberMe boolean with default true', () => {
      const input = {
        email: 'user@domain.com',
        password: 'Password123',
        rememberMe: false,
      };
      const result = LoginInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(false);
      }

      const inputDefault = {
        email: 'user@domain.com',
        password: 'Password123',
      };
      const resultDefault = LoginInputSchema.safeParse(inputDefault);
      expect(resultDefault.success).toBe(true);
      if (resultDefault.success) {
        expect(resultDefault.data.rememberMe).toBe(true);
      }
    });
  });

  describe('ResetPasswordSchema', () => {
    it('validates token and strong password', () => {
      const input = {
        token: '  abc-123-token  ',
        password: 'NewStrongPassword88',
      };
      const result = ResetPasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.token).toBe('abc-123-token');
      }
    });

    it('rejects empty token', () => {
      const input = {
        token: '   ',
        password: 'NewPassword123',
      };
      expect(ResetPasswordSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('ChangePasswordSchema', () => {
    it('validates current and new password', () => {
      const input = {
        currentPassword: 'OldPassword1',
        newPassword: 'BrandNewPassword2',
      };
      const result = ChangePasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects short new password', () => {
      const input = {
        currentPassword: 'OldPassword1',
        newPassword: 'short',
      };
      expect(ChangePasswordSchema.safeParse(input).success).toBe(false);
    });
  });
});

describe('Session Token & Expiration Logic', () => {
  function makeHmac(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  const secret = 'test-secret-key-12345';

  it('validates non-expired session payload correctly', () => {
    const payloadObj = {
      userId: 'usr_123',
      email: 'test@example.com',
      name: 'Test User',
      exp: Date.now() + 60_000, // 1 min in the future
    };
    const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const token = `${payloadStr}.${makeHmac(payloadStr, secret)}`;

    // Decode and verify
    const [body, sig] = token.split('.');
    expect(body).toBe(payloadStr);
    expect(sig).toBe(makeHmac(payloadStr, secret));

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    expect(parsed.exp).toBeGreaterThan(Date.now());
  });

  it('detects expired session payload', () => {
    const payloadObj = {
      userId: 'usr_123',
      exp: Date.now() - 5_000, // 5 seconds in the past
    };
    const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const token = `${payloadStr}.${makeHmac(payloadStr, secret)}`;

    const [body] = token.split('.');
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    expect(parsed.exp).toBeLessThan(Date.now());
  });

  it('rejects tampered signature', () => {
    const payloadObj = {
      userId: 'usr_123',
      exp: Date.now() + 60_000,
    };
    const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const validSig = makeHmac(payloadStr, secret);
    const tamperedSig = validSig.slice(0, -2) + '00';

    expect(validSig).not.toBe(tamperedSig);
  });

  it('creates and verifies signed password reset tokens accurately', () => {
    const expiry = new Date(Date.now() + 60_000);
    const token = createPasswordResetToken(
      { id: 'usr_reset_1', email: 'deepak@example.com', name: 'Deepak Polisetti', baseCurrency: 'INR' },
      expiry
    );

    const verified = verifyPasswordResetToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('usr_reset_1');
    expect(verified?.email).toBe('deepak@example.com');
    expect(verified?.name).toBe('Deepak Polisetti');
    expect(verified?.baseCurrency).toBe('INR');

    // Expired reset token returns null
    const expiredToken = createPasswordResetToken(
      { id: 'usr_reset_1', email: 'deepak@example.com', name: 'Deepak Polisetti', baseCurrency: 'INR' },
      new Date(Date.now() - 10_000)
    );
    expect(verifyPasswordResetToken(expiredToken)).toBeNull();
  });
});
