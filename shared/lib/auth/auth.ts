import { PrismaAdapter } from '@auth/prisma-adapter';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import { CredentialsSignin } from '@auth/core/errors';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Yandex from 'next-auth/providers/yandex';
import { isUserBanned, type UserRole } from '@/entities/user';
import { prisma } from '@/shared/lib/db';
import {
  isValidEmail,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  verifyPassword,
} from './password';
import { getSuperAdminEmails } from './super-admin';
import './auth.types';

class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified';
}

class AccountBannedError extends CredentialsSignin {
  code = 'account_banned';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Yandex({
      clientId: process.env.YANDEX_CLIENT_ID,
      clientSecret: process.env.YANDEX_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string' ? normalizeEmail(credentials.email) : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (
          !isValidEmail(email) ||
          password.length < MIN_PASSWORD_LENGTH ||
          password.length > MAX_PASSWORD_LENGTH
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            passwordHash: true,
            emailVerified: true,
            bannedUntil: true,
          },
        });

        if (user?.passwordHash) {
          const isValid = await verifyPassword(password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          if (isUserBanned(user.bannedUntil)) {
            throw new AccountBannedError();
          }

          if (!user.emailVerified) {
            throw new EmailNotVerifiedError();
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role as Exclude<UserRole, 'GUEST'>,
          };
        }

        const pending = await prisma.pendingRegistration.findUnique({
          where: { email },
          select: { passwordHash: true, expiresAt: true },
        });

        if (
          pending &&
          pending.expiresAt.getTime() > Date.now() &&
          (await verifyPassword(password, pending.passwordHash))
        ) {
          throw new EmailNotVerifiedError();
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) {
        return true;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { bannedUntil: true },
        });

        if (dbUser && isUserBanned(dbUser.bannedUntil)) {
          return false;
        }
      } catch {
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, bannedUntil: true },
          });

          if (!dbUser || isUserBanned(dbUser.bannedUntil)) {
            return {};
          }

          token.role = dbUser.role as Exclude<UserRole, 'GUEST'>;
        } catch {
          token.role = (token.role ?? 'USER') as Exclude<UserRole, 'GUEST'>;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? 'USER') as Exclude<UserRole, 'GUEST'>;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.toLowerCase();

      if (!email) {
        return;
      }

      if (getSuperAdminEmails().includes(email)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'SUPER_ADMIN' satisfies PrismaUserRole },
        });
      }
    },
  },
  trustHost: true,
});
