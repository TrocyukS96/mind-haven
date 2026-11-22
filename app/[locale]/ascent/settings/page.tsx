import { isAuthenticatedUser } from '@/entities/user';
import { AscentSettingsPage } from '@/screens/ascent/ui/AscentSettingsPage';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';

export default async function AscentSettingsRoute() {
  const profile = await getSessionProfile();
  return <AscentSettingsPage authenticated={isAuthenticatedUser(profile)} />;
}
