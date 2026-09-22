import type { UserRole } from '@/entities/user';
import {
  canChangeUserRole,
  canModerateUser,
  isAssignableUserRole,
  isBanDurationDays,
  isSuperAdminRole,
  isUserBanned,
  type AdminUserListItem,
} from '@/entities/user';
import { prisma } from '@/shared/lib/db';
import type { AdminActor } from './require-admin';

const MAX_BAN_REASON_LENGTH = 200;

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  image: true,
  role: true,
  createdAt: true,
  bannedUntil: true,
  banReason: true,
} as const;

type ListedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Exclude<UserRole, 'GUEST'>;
  createdAt: Date;
  bannedUntil: Date | null;
  banReason: string | null;
};

export class AdminUserActionError extends Error {
  constructor(
    public readonly code:
      | 'not_found'
      | 'forbidden'
      | 'invalid_duration'
      | 'invalid_reason'
      | 'invalid_role'
  ) {
    super(code);
    this.name = 'AdminUserActionError';
  }
}

function toListItem(user: ListedUser, actor: AdminActor): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    bannedUntil: user.bannedUntil?.toISOString() ?? null,
    banReason: user.banReason,
    isBanned: isUserBanned(user.bannedUntil),
    isCurrentUser: user.id === actor.id,
    canModerate: canModerateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: user.id,
      targetRole: user.role,
    }),
    canChangeRole: canChangeUserRole({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: user.id,
      targetRole: user.role,
    }),
  };
}

function normalizeBanReason(reason: string | undefined): string | null {
  if (reason === undefined) {
    return null;
  }

  const trimmed = reason.trim();

  if (trimmed.length > MAX_BAN_REASON_LENGTH) {
    throw new AdminUserActionError('invalid_reason');
  }

  return trimmed.length > 0 ? trimmed : null;
}

async function getModeratableUser(actor: AdminActor, targetId: string): Promise<ListedUser> {
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: USER_LIST_SELECT,
  });

  if (!user) {
    throw new AdminUserActionError('not_found');
  }

  const listedUser = user as ListedUser;

  if (
    !canModerateUser({
      actorId: actor.id,
      actorRole: actor.role,
      targetId: listedUser.id,
      targetRole: listedUser.role,
    })
  ) {
    throw new AdminUserActionError('forbidden');
  }

  return listedUser;
}

export async function listAdminUsers(actor: AdminActor): Promise<AdminUserListItem[]> {
  try {
    const users = await prisma.user.findMany({
      select: USER_LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });

    return users.map((user) => toListItem(user as ListedUser, actor));
  } catch {
    return [];
  }
}

export async function banAdminUser(
  actor: AdminActor,
  targetId: string,
  durationDays: number,
  reason?: string
): Promise<AdminUserListItem> {
  if (!isBanDurationDays(durationDays)) {
    throw new AdminUserActionError('invalid_duration');
  }

  const user = await getModeratableUser(actor, targetId);
  const bannedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      bannedUntil,
      banReason: normalizeBanReason(reason),
    },
    select: USER_LIST_SELECT,
  });

  return toListItem(updated as ListedUser, actor);
}

export async function unbanAdminUser(
  actor: AdminActor,
  targetId: string
): Promise<AdminUserListItem> {
  const user = await getModeratableUser(actor, targetId);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      bannedUntil: null,
      banReason: null,
    },
    select: USER_LIST_SELECT,
  });

  return toListItem(updated as ListedUser, actor);
}

export async function deleteAdminUser(actor: AdminActor, targetId: string): Promise<void> {
  const user = await getModeratableUser(actor, targetId);

  await prisma.user.delete({
    where: { id: user.id },
  });
}

export async function changeAdminUserRole(
  actor: AdminActor,
  targetId: string,
  role: string
): Promise<AdminUserListItem> {
  if (!isAssignableUserRole(role)) {
    throw new AdminUserActionError('invalid_role');
  }

  if (!isSuperAdminRole(actor.role)) {
    throw new AdminUserActionError('forbidden');
  }

  const user = await getModeratableUser(actor, targetId);

  if (user.role === role) {
    return toListItem(user, actor);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
    select: USER_LIST_SELECT,
  });

  return toListItem(updated as ListedUser, actor);
}
