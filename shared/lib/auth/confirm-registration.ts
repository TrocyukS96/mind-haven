import type { UserRole as PrismaUserRole } from '@prisma/client';
import { prisma } from '@/shared/lib/db';
import { getSuperAdminEmails } from './super-admin';
import { hashVerificationToken } from './verification-token';

export type ConfirmRegistrationCode = 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'EMAIL_TAKEN';

export class ConfirmRegistrationError extends Error {
  constructor(public code: ConfirmRegistrationCode) {
    super(code);
    this.name = 'ConfirmRegistrationError';
  }
}

export async function confirmRegistration(token: string) {
  const tokenHash = hashVerificationToken(token);

  return prisma.$transaction(async (tx) => {
    const pending = await tx.pendingRegistration.findUnique({
      where: { tokenHash },
    });

    if (!pending) {
      throw new ConfirmRegistrationError('INVALID_TOKEN');
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      throw new ConfirmRegistrationError('EXPIRED_TOKEN');
    }

    const existing = await tx.user.findUnique({
      where: { email: pending.email },
      select: { id: true },
    });

    if (existing) {
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      throw new ConfirmRegistrationError('EMAIL_TAKEN');
    }

    const role: PrismaUserRole = getSuperAdminEmails().includes(pending.email)
      ? 'SUPER_ADMIN'
      : 'USER';

    const user = await tx.user.create({
      data: {
        email: pending.email,
        name: pending.name,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    await tx.pendingRegistration.delete({ where: { id: pending.id } });

    return user;
  });
}
