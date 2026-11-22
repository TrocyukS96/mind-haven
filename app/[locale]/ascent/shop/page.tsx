import { isAuthenticatedUser } from '@/entities/user';
import { AscentShopPage } from '@/screens/ascent/ui/AscentShopPage';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';

export default async function AscentShopRoute() {
  const profile = await getSessionProfile();
  return <AscentShopPage authenticated={isAuthenticatedUser(profile)} />;
}
