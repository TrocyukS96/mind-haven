import { ConfirmRegistrationError, confirmRegistration } from '@/shared/lib/auth/confirm-registration';
import { VerifyEmailPage } from '@/features/auth/ui/verify-email-page';
import { redirect } from '@/i18n/routing';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  if (!token) {
    return <VerifyEmailPage status="invalid" />;
  }

  try {
    await confirmRegistration(token);
  } catch (error) {
    if (error instanceof ConfirmRegistrationError) {
      const status =
        error.code === 'EXPIRED_TOKEN'
          ? 'expired'
          : error.code === 'EMAIL_TAKEN'
            ? 'taken'
            : 'invalid';

      return <VerifyEmailPage status={status} />;
    }

    throw error;
  }

  redirect({ href: '/auth/verified', locale });
}
