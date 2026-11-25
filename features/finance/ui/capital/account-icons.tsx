import {
  Banknote,
  Bitcoin,
  Coins,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const ACCOUNT_ICONS = {
  wallet: Wallet,
  landmark: Landmark,
  piggy: PiggyBank,
  cash: Banknote,
  card: CreditCard,
  crypto: Bitcoin,
  invest: TrendingUp,
  coins: Coins,
} satisfies Record<string, LucideIcon>;

export type AccountIconKey = keyof typeof ACCOUNT_ICONS;

export function accountIcon(name: string | null | undefined): LucideIcon {
  if (name && name in ACCOUNT_ICONS) {
    return ACCOUNT_ICONS[name as AccountIconKey];
  }
  return Wallet;
}
