import { describe, expect, it } from 'vitest';
import { canChangeUserRole, isAssignableUserRole } from './roles';

describe('isAssignableUserRole', () => {
  it('allows user and admin roles only', () => {
    expect(isAssignableUserRole('USER')).toBe(true);
    expect(isAssignableUserRole('ADMIN')).toBe(true);
    expect(isAssignableUserRole('SUPER_ADMIN')).toBe(false);
    expect(isAssignableUserRole('GUEST')).toBe(false);
  });
});

describe('canChangeUserRole', () => {
  it('allows a super admin to change user and admin roles', () => {
    expect(
      canChangeUserRole({
        actorId: 'super-1',
        actorRole: 'SUPER_ADMIN',
        targetId: 'user-1',
        targetRole: 'USER',
      })
    ).toBe(true);
    expect(
      canChangeUserRole({
        actorId: 'super-1',
        actorRole: 'SUPER_ADMIN',
        targetId: 'admin-1',
        targetRole: 'ADMIN',
      })
    ).toBe(true);
  });

  it('does not allow changing your own role or another super admin', () => {
    expect(
      canChangeUserRole({
        actorId: 'super-1',
        actorRole: 'SUPER_ADMIN',
        targetId: 'super-1',
        targetRole: 'SUPER_ADMIN',
      })
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: 'super-1',
        actorRole: 'SUPER_ADMIN',
        targetId: 'super-2',
        targetRole: 'SUPER_ADMIN',
      })
    ).toBe(false);
  });

  it('does not allow a regular admin to change roles', () => {
    expect(
      canChangeUserRole({
        actorId: 'admin-1',
        actorRole: 'ADMIN',
        targetId: 'user-1',
        targetRole: 'USER',
      })
    ).toBe(false);
  });
});
