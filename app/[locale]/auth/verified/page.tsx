import { VerifyEmailPage } from '@/features/auth/ui/verify-email-page';
import { setRequestLocale } from 'next-intl/server';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <VerifyEmailPage status="success" />;
}
