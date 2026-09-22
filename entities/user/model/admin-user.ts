import type { UserRole } from './types';

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Exclude<UserRole, 'GUEST'>;
  createdAt: string;
  bannedUntil: string | null;
  banReason: string | null;
  isBanned: boolean;
  isCurrentUser: boolean;
  canModerate: boolean;
  canChangeRole: boolean;
}
