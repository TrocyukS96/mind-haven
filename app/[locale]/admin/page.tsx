import { AdminPanel } from '@/features/admin';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';
import { getDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { getItemTypes } from '@/shared/lib/item-types/item-type-service';

export default async function AdminPage() {
  const [flags, displayModeSettings, itemTypes] = await Promise.all([
    getFeatureFlags(),
    getDisplayModeSettings(),
    getItemTypes(),
  ]);

  return (
    <AdminPanel
      initialFlags={flags}
      initialDisplayModeSettings={displayModeSettings}
      initialItemTypes={itemTypes}
    />
  );
}
