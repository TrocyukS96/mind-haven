import { ConfirmRegistrationError, confirmRegistration } from '@/shared/lib/auth/confirm-registration';
import { SignInButton } from './sign-in-button';
import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';

type VerifyStatus = 'success' | 'invalid' | 'expired' | 'taken';

interface VerifyEmailPageProps {
  token?: string;
  status?: VerifyStatus;
}

export async function VerifyEmailPage({ token, status: forcedStatus }: VerifyEmailPageProps) {
  const t = await getTranslations('auth');

  let status: VerifyStatus = forcedStatus ?? 'invalid';

  if (!forcedStatus && token) {
    try {
      await confirmRegistration(token);
      status = 'success';
    } catch (error) {
      if (error instanceof ConfirmRegistrationError) {
        if (error.code === 'EXPIRED_TOKEN') {
          status = 'expired';
        } else if (error.code === 'EMAIL_TAKEN') {
          status = 'taken';
        } else {
          status = 'invalid';
        }
      } else {
        status = 'invalid';
      }
    }
  }

  const title =
    status === 'success'
      ? t('verifySuccessTitle')
      : status === 'expired'
        ? t('verifyExpiredTitle')
        : status === 'taken'
          ? t('verifyTakenTitle')
          : t('verifyInvalidTitle');

  const description =
    status === 'success'
      ? t('verifySuccessDescription')
      : status === 'expired'
        ? t('verifyExpiredDescription')
        : status === 'taken'
          ? t('verifyTakenDescription')
          : t('verifyInvalidDescription');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
      <div className="w-full rounded-xl border border-border bg-background p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 space-y-3">
          {(status === 'success' || status === 'taken') && <SignInButton />}
          <Link
            href="/"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-accent"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
