import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getJournalData } from '@/shared/lib/journal/journal-entry-service';
import { JournalPage } from '@/screens/journal/ui/JournalPage';

export default async function Page() {
  const profile = await getSessionProfile();
  let initialData = null;

  if ('id' in profile && profile.id) {
    try {
      initialData = await getJournalData(profile.id);
    } catch {
      initialData = { entries: [], tags: [], titles: [] };
    }
  }

  return <JournalPage initialData={initialData} />;
}
