import { hasMinRole, type UserRole } from '@/entities/user';
import { auth } from '@/shared/lib/auth/auth';

export interface AdminActor {
  id: string;
  role: Exclude<UserRole, 'GUEST'>;
}

export async function requireAdmin(): Promise<AdminActor | null> {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
}
