import { PrismaAdapter } from '@auth/prisma-adapter';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import type { UserRole } from '@/entities/user';
import { prisma } from '@/shared/lib/db';
import './auth.types';

function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });

          token.role = (dbUser?.role ?? 'USER') as Exclude<UserRole, 'GUEST'>;
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
