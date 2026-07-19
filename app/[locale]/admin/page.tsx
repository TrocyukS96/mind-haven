import { AdminPanel } from '@/features/admin';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';

export default async function AdminPage() {
  const flags = await getFeatureFlags();

  return <AdminPanel initialFlags={flags} />;
}
