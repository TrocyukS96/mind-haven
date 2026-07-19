import { enUS, ru } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export function getDateLocale(locale: string): Locale {
  return locale === 'ru' ? ru : enUS;
}
