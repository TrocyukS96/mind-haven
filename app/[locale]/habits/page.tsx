import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getHabits } from '@/shared/lib/habit/habit-service';
import { HabitsPage } from '@/screens/habits/ui/HabitsPage';

export default async function Page() {
  const profile = await getSessionProfile();
  let initialHabits = null;

  if ('id' in profile && profile.id) {
    try {
      initialHabits = await getHabits(profile.id);
    } catch {
      initialHabits = [];
    }
  }

  return <HabitsPage initialHabits={initialHabits} />;
}
