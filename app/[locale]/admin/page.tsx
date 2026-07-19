import { AdminPanel } from '@/features/admin';
import { getFeatureFlags } from '@/shared/lib/features/feature-service';
import { getDisplayModeSettings } from '@/shared/lib/display-modes/display-mode-service';
import { getItemTypes } from '@/shared/lib/item-types/item-type-service';
import { getReflectionQuestions } from '@/shared/lib/reflection-questions/reflection-question-service';

export default async function AdminPage() {
  const [flags, displayModeSettings, itemTypes, reflectionQuestions] = await Promise.all([
    getFeatureFlags(),
    getDisplayModeSettings(),
    getItemTypes(),
    getReflectionQuestions(),
  ]);

  return (
    <AdminPanel
      initialFlags={flags}
      initialDisplayModeSettings={displayModeSettings}
      initialItemTypes={itemTypes}
      initialReflectionQuestions={reflectionQuestions}
    />
  );
}
