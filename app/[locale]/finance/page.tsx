import { getSessionProfile } from '@/shared/lib/auth/get-session-profile';
import { getFinanceData } from '@/shared/lib/finance/finance-service';
import { FinancePage } from '@/screens/finance/ui/FinancePage';

export default async function Page() {
  const profile = await getSessionProfile();
  let initialAccounts = null;
  let initialTransactions = null;

  if ('id' in profile && profile.id) {
    try {
      const data = await getFinanceData(profile.id);
      initialAccounts = data.accounts;
      initialTransactions = data.transactions;
    } catch {
      initialAccounts = [];
      initialTransactions = [];
    }
  }

  return (
    <FinancePage
      initialAccounts={initialAccounts}
      initialTransactions={initialTransactions}
    />
  );
}
