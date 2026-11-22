import { isAuthenticatedUser } from '@/entities/user';
import { AscentWizardPage } from '@/screens/ascent/ui/AscentWizardPage';
import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';

export default async function AscentNewPage() {
  const profile = await getSessionProfile();
  return <AscentWizardPage authenticated={isAuthenticatedUser(profile)} />;
}
