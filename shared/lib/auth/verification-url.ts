import { getPathname } from '@/i18n/routing';

export function getRequestOrigin(request: Request): string {
  const configured = process.env.AUTH_URL || process.env.APP_URL;

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost) {
    return `${forwardedProto ?? 'http'}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function buildEmailVerificationUrl(origin: string, locale: string, token: string): string {
  const path = getPathname({
    locale: locale === 'en' ? 'en' : 'ru',
    href: '/auth/verify',
  });

  const url = new URL(path, origin);
  url.searchParams.set('token', token);
  return url.toString();
}
