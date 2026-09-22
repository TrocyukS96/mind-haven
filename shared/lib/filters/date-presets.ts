import type { DatePreset, DateRangeValue } from '@/entities/activity/model/types';

export function toLocalDateString(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function resolveDatePresetRange(
  preset: DatePreset,
  custom: DateRangeValue = {},
  now: Date = new Date()
): DateRangeValue {
  if (preset === 'all') {
    return {};
  }

  if (preset === 'custom') {
    return {
      from: custom.from,
      to: custom.to,
    };
  }

  const today = toLocalDateString(now);

  if (preset === 'today') {
    return { from: today, to: today };
  }

  if (preset === 'yesterday') {
    const yesterday = toLocalDateString(shiftLocalDate(now, -1));
    return { from: yesterday, to: yesterday };
  }

  if (preset === 'last7') {
    return { from: toLocalDateString(shiftLocalDate(now, -6)), to: today };
  }

  return { from: toLocalDateString(shiftLocalDate(now, -29)), to: today };
}

export function isDateWithinRange(date: string, range: DateRangeValue): boolean {
  if (range.from && date < range.from) {
    return false;
  }

  if (range.to && date > range.to) {
    return false;
  }

  return true;
}

export function toDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return toLocalDateString(parsed);
}
