import { AdminPanel } from '@/features/admin';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';
import { getDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { getItemTypes } from '@/shared/lib/item-types/item-type-service';
import { getReflectionQuestions } from '@/shared/lib/reflection-questions/reflection-question-service';
import { listAdminUsers } from '@/shared/lib/admin/user-admin-service';
import { requireAdmin } from '@/shared/lib/admin/require-admin';

export default async function AdminPage() {
  const actor = await requireAdmin();
  const [flags, displayModeSettings, itemTypes, reflectionQuestions, users] = await Promise.all([
    getFeatureFlags(),
    getDisplayModeSettings(),
    getItemTypes(),
    getReflectionQuestions(),
    actor ? listAdminUsers(actor) : Promise.resolve([]),
  ]);

  return (
    <AdminPanel
      initialFlags={flags}
      initialDisplayModeSettings={displayModeSettings}
      initialItemTypes={itemTypes}
      initialReflectionQuestions={reflectionQuestions}
      initialUsers={users}
    />
  );
}
