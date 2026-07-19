import type { UserRole } from '@/entities/user';
import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Exclude<UserRole, 'GUEST'>;
    } & DefaultSession['user'];
  }

  interface User {
    role?: Exclude<UserRole, 'GUEST'>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: Exclude<UserRole, 'GUEST'>;
  }
}

export {};
