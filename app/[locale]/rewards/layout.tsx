import { UI_HIDDEN_FEATURES } from '@/shared/config/features';
import { notFound } from 'next/navigation';

export default function RewardsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (UI_HIDDEN_FEATURES.has('gamification')) {
    notFound();
  }

  return children;
}
