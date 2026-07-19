import { ProfileView } from '@/features/profile';
import { isAuthenticatedUser } from '@/entities/user';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const profile = await getSessionProfile();

  if (!isAuthenticatedUser(profile)) {
    redirect('/');
  }

  return <ProfileView profile={profile} />;
}
