import { randomBytes } from 'node:crypto';

/** 25-character id that satisfies the ascent key alphabet. */
export function createAscentId(): string {
  return `c${randomBytes(12).toString('hex')}`;
}
