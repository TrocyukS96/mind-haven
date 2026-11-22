import { AscentRequestError } from '@/features/ascent/api/ascent-client';

export function ascentApiMessage(
  t: { has: (key: string) => boolean; (key: string): string },
  error: unknown
): string {
  const code = error instanceof AscentRequestError && error.code ? error.code : 'generic';
  const key = `apiErrors.${code}`;
  return t.has(key) ? t(key) : t('apiErrors.generic');
}

export function formatAscentWhen(iso: string, timeZone: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  } catch {
    return iso;
  }
}
