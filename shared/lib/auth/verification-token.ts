import { createHash, randomBytes } from 'node:crypto';

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
