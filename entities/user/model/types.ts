export const USER_ROLES = ['GUEST', 'USER', 'ADMIN', 'SUPER_ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'TRIAL';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Exclude<UserRole, 'GUEST'>;
  hasActiveSubscription: boolean;
  grantedFeatures: string[];
}

export interface GuestProfile {
  role: 'GUEST';
}

export type AuthProfile = UserProfile | GuestProfile;

export function isAuthenticatedUser(
  profile: AuthProfile
): profile is UserProfile {
  return profile.role !== 'GUEST';
}
