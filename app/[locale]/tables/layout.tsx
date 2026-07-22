import { UI_HIDDEN_FEATURES } from '@/shared/config/features';
import { notFound } from 'next/navigation';

export default function TablesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (UI_HIDDEN_FEATURES.has('tables')) {
    notFound();
  }

  return children;
}
