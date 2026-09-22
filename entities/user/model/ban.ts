import type { UserRole } from './types';
import { getRoleRank } from './roles';

export const BAN_DURATION_DAYS = [1, 3, 7, 30, 90] as const;

export type BanDurationDays = (typeof BAN_DURATION_DAYS)[number];

export function isBanDurationDays(value: number): value is BanDurationDays {
  return (BAN_DURATION_DAYS as readonly number[]).includes(value);
}

export function isUserBanned(
  bannedUntil: Date | string | null | undefined,
  now = new Date()
): boolean {
  if (!bannedUntil) {
    return false;
  }

  const expiresAt = bannedUntil instanceof Date ? bannedUntil : new Date(bannedUntil);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

export function canModerateUser(params: {
  actorId: string;
  actorRole: Exclude<UserRole, 'GUEST'>;
  targetId: string;
  targetRole: Exclude<UserRole, 'GUEST'>;
}): boolean {
  if (params.actorId === params.targetId) {
    return false;
  }

  if (params.targetRole === 'SUPER_ADMIN') {
    return false;
  }

  return getRoleRank(params.actorRole) > getRoleRank(params.targetRole);
}
