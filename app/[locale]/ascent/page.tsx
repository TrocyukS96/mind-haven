import { isAuthenticatedUser } from '@/entities/user';
import { AscentHomePage } from '@/screens/ascent/ui/AscentHomePage';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';

export default async function AscentPage() {
  const profile = await getSessionProfile();
  return <AscentHomePage authenticated={isAuthenticatedUser(profile)} />;
}
