'use client';

import { clockMilliseconds, durationParts, formatClockUnit } from '@/features/ascent/model/dashboard';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';
import { Card, CardContent } from '@/shared/ui/card';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const UNIT_KEYS = ['unitDays', 'unitHours', 'unitMinutes', 'unitSeconds'] as const;

export function AscentClockCard({ clock }: { clock: AscentClock }) {
  const t = useTranslations('ascent');
  const ticking = clock.mode === 'running' || clock.mode === 'countdown';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking, clock.mode, clock.startedAt, clock.boundaryAt]);

  const parts = durationParts(clockMilliseconds(clock, now));
  const values = [parts.days, parts.hours, parts.minutes, parts.seconds];
  const title =
    clock.mode === 'countdown'
      ? t('home.countdownLabel')
      : clock.mode === 'frozen'
        ? t('home.timerFrozen')
        : t('home.timerLabel');
  const hint =
    clock.mode === 'broken' ? t('home.timerBroken') : clock.mode === 'running' ? t('home.timerHint') : null;
  const spoken = `${title}: ${parts.days} ${t('home.unitDays')}, ${parts.hours} ${t('home.unitHours')}, ${parts.minutes} ${t('home.unitMinutes')}, ${parts.seconds} ${t('home.unitSeconds')}`;

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex items-end justify-center gap-2 sm:gap-4" role="group" aria-label={spoken}>
          {UNIT_KEYS.map((unit, index) => (
            <div key={unit} className="flex items-end gap-2 sm:gap-4">
              {index > 0 ? (
                <span aria-hidden className="pb-7 font-mono text-2xl text-muted-foreground sm:text-4xl">
                  :
                </span>
              ) : null}
              <div className="min-w-[3.25rem] text-center sm:min-w-[4.5rem]">
                <div className="font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-5xl">
                  {formatClockUnit(values[index] ?? 0)}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {t(`home.${unit}`)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
