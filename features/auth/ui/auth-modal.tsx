'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type AuthMode = 'signin' | 'signup';
type OAuthProvider = 'google' | 'yandex';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46c-.28 1.5-1.12 2.77-2.39 3.62v3.01h3.87c2.26-2.08 3.55-5.14 3.55-8.66Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.87-3.01c-1.08.72-2.45 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.27v3.1C3.25 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.63H1.27C.46 8.24 0 10.06 0 12s.46 3.76 1.27 5.37l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.63l3.98 3.1C6.2 6.88 8.86 4.75 12 4.75Z"
      />
    </svg>
  );
}

function YandexIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FC3F1D"
        d="M12.9 2.1h-2.3c-3.4 0-5.7 1.8-5.7 4.6 0 2.1 1 3.4 3.1 4.7L4.5 21h3.1l3.3-8.5h1.1V21h2.9V2.1Zm-2.2 8.1h-.4c-1.6 0-2.6-.9-2.6-2.3 0-1.5 1.1-2.4 2.7-2.4h.3v4.7Z"
      />
    </svg>
  );
}

function mapAuthError(code: string | undefined, t: (key: string) => string): string {
  switch (code) {
    case 'EMAIL_TAKEN':
      return t('emailTaken');
    case 'WEAK_PASSWORD':
      return t('weakPassword');
    case 'INVALID_EMAIL':
      return t('invalidEmail');
    case 'OAUTH_ONLY':
      return t('oauthOnly');
    case 'EMAIL_NOT_CONFIGURED':
      return t('emailNotConfigured');
    case 'EMAIL_SEND_FAILED':
      return t('emailSendFailed');
    case 'email_not_verified':
      return t('emailNotVerified');
    case 'account_banned':
      return t('accountBanned');
    default:
      return t('genericError');
  }
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode('signin');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setLoading(false);
      setCheckEmail(false);
    }
  }, [open]);

  const handleOAuth = (provider: OAuthProvider) => {
    void signIn(provider, { callbackUrl: window.location.href });
  };

  const signInWithCredentials = async () => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError(
        result?.code === 'email_not_verified'
          ? t('emailNotVerified')
          : result?.code === 'account_banned'
            ? t('accountBanned')
            : t('invalidCredentials')
      );
      return false;
    }

    onOpenChange(false);
    router.refresh();
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, locale }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(mapAuthError(payload?.error, t));
          return;
        }

        setCheckEmail(true);
        return;
      }

      await signInWithCredentials();
    } catch {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">
            {checkEmail
              ? t('checkEmailTitle')
              : mode === 'signin'
                ? t('titleSignIn')
                : t('titleSignUp')}
          </DialogTitle>
          <DialogDescription>
            {checkEmail
              ? t('checkEmailDescription', { email })
              : mode === 'signin'
                ? t('descriptionSignIn')
                : t('descriptionSignUp')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {checkEmail ? (
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="button"
                className="h-10 w-full"
                disabled={loading}
                onClick={() => void handleSubmit({ preventDefault() {} } as React.FormEvent)}
              >
                {loading ? t('submitting') : t('resendEmail')}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t('hasAccount')}{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setCheckEmail(false);
                    setError(null);
                    setMode('signin');
                  }}
                >
                  {t('switchToSignIn')}
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-center"
                  onClick={() => handleOAuth('google')}
                >
                  <GoogleIcon className="size-4" />
                  {t('continueWithGoogle')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-center"
                  onClick={() => handleOAuth('yandex')}
                >
                  <YandexIcon className="size-4" />
                  {t('continueWithYandex')}
                </Button>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t('or')}
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-name">{t('name')}</Label>
                    <Input
                      id="auth-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder={t('namePlaceholder')}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="auth-email">{t('email')}</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder={t('emailPlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-password">{t('password')}</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                  />
                </div>

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="auth-confirm-password">{t('confirmPassword')}</Label>
                    <Input
                      id="auth-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {loading
                    ? t('submitting')
                    : mode === 'signin'
                      ? t('submitSignIn')
                      : t('submitSignUp')}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'signin' ? t('noAccount') : t('hasAccount')}{' '}
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setError(null);
                    setCheckEmail(false);
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                  }}
                >
                  {mode === 'signin' ? t('switchToSignUp') : t('switchToSignIn')}
                </button>
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
