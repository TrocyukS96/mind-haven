import { describe, expect, it } from 'vitest';
import { canModerateUser, isBanDurationDays, isUserBanned } from './ban';

describe('isUserBanned', () => {
  it('returns false when there is no ban', () => {
    expect(isUserBanned(null)).toBe(false);
    expect(isUserBanned(undefined)).toBe(false);
  });

  it('returns true while the ban is still active', () => {
    expect(isUserBanned(new Date('2026-09-20T12:00:00.000Z'), new Date('2026-09-19T12:00:00.000Z'))).toBe(
      true
    );
  });

  it('returns false after the ban expires', () => {
    expect(isUserBanned(new Date('2026-09-18T12:00:00.000Z'), new Date('2026-09-19T12:00:00.000Z'))).toBe(
      false
    );
  });
});

describe('isBanDurationDays', () => {
  it('accepts only preset durations', () => {
    expect(isBanDurationDays(7)).toBe(true);
    expect(isBanDurationDays(14)).toBe(false);
  });
});

describe('canModerateUser', () => {
  it('does not allow self-moderation', () => {
    expect(
      canModerateUser({
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        targetId: 'admin-1',
        targetRole: 'USER',
      })
    ).toBe(false);
  });

  it('allows an admin to moderate a regular user', () => {
    expect(
      canModerateUser({
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        targetId: 'user-1',
        targetRole: 'USER',
      })
    ).toBe(true);
  });

  it('does not allow an admin to moderate another admin', () => {
    expect(
      canModerateUser({
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        targetId: 'admin-2',
        targetRole: 'ADMIN',
      })
    ).toBe(false);
  });

  it('protects super admins', () => {
    expect(
      canModerateUser({
        actorId: 'super-1',
        actorRole: 'SUPER_ADMIN',
        targetId: 'super-2',
        targetRole: 'SUPER_ADMIN',
      })
    ).toBe(false);
  });
});
