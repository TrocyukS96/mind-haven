import { describe, expect, it } from 'vitest';
import { hashPassword, isValidEmail, normalizeEmail, verifyPassword } from './password';

describe('password helpers', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Test@Example.COM ')).toBe('test@example.com');
  });

  it('validates email format', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct-horse');
    await expect(verifyPassword('correct-horse', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
