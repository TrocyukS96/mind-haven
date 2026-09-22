import type { UserRole } from './types';

const ROLE_RANK: Record<UserRole, number> = {
  GUEST: 0,
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function getRoleRank(role: UserRole): number {
  return ROLE_RANK[role];
}

export function hasMinRole(current: UserRole, required: UserRole): boolean {
  return getRoleRank(current) >= getRoleRank(required);
}

export function isAdminRole(role: UserRole): boolean {
  return hasMinRole(role, 'ADMIN');
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canManageAdmins(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export const ASSIGNABLE_USER_ROLES = ['USER', 'ADMIN'] as const;

export type AssignableUserRole = (typeof ASSIGNABLE_USER_ROLES)[number];

export function isAssignableUserRole(value: string): value is AssignableUserRole {
  return (ASSIGNABLE_USER_ROLES as readonly string[]).includes(value);
}

export function canChangeUserRole(params: {
  actorId: string;
  actorRole: Exclude<UserRole, 'GUEST'>;
  targetId: string;
  targetRole: Exclude<UserRole, 'GUEST'>;
}): boolean {
  if (params.actorRole !== 'SUPER_ADMIN' || params.actorId === params.targetId) {
    return false;
  }

  return params.targetRole !== 'SUPER_ADMIN';
}
