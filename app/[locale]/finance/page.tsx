import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getFinanceData } from '@/shared/lib/finance/finance-service';
import { FinancePage } from '@/screens/finance/ui/FinancePage';

export default async function Page() {
  const profile = await getSessionProfile();
  let initialBooks = null;

  if ('id' in profile && profile.id) {
    try {
      initialBooks = await getFinanceData(profile.id);
    } catch {
      initialBooks = null;
    }
  }

  return <FinancePage initialBooks={initialBooks} />;
}
