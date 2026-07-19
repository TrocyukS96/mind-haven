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
