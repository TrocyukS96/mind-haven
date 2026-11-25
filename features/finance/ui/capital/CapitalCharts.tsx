'use client';

import { useId, useState, type MouseEvent } from 'react';
import { format } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import type { CapitalSeriesPoint, CapitalMonthRow } from '@/shared/lib/finance/capital-analytics';
import type { FinanceCurrency } from '@/entities/finance/model/types';
import type { ValuedAmount } from '@/shared/lib/finance/historical-rates';
import { formatMoney } from './format';
import { cn } from '@/shared/lib/utils';

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 220;
const PLOT_LEFT = 28;
const PLOT_RIGHT = CHART_WIDTH - 28;
const PLOT_TOP = 28;
const PLOT_BOTTOM = CHART_HEIGHT - 16;

export function CapitalLineChart({
  points,
  currency,
}: {
  points: CapitalSeriesPoint[];
  currency: FinanceCurrency;
}) {
  const t = useTranslations('finance');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const gradientId = `capital-area-${useId().replace(/:/g, '')}`;
  const [active, setActive] = useState<number | null>(null);
  const values = points.map((point) => point.total.amount).filter((amount): amount is number => amount != null);

  if (values.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium">{t('capital.chartEmpty')}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('capital.chartEmptyHint')}</p>
      </div>
    );
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin;
  const flat = span === 0;
  const magnitude = Math.max(Math.abs(rawMax), Math.abs(rawMin), 1);
  const headroomAbove = flat ? magnitude * 0.18 : span * 0.18;
  const headroomBelow = flat ? magnitude * 0.42 : span * 0.18;
  const min = rawMin - headroomBelow;
  const max = rawMax + headroomAbove;
  const domain = max - min || 1;
  const plotWidth = PLOT_RIGHT - PLOT_LEFT;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;

  const coords = points.map((point, index) => {
    const x =
      points.length === 1 ? (PLOT_LEFT + PLOT_RIGHT) / 2 : PLOT_LEFT + (index / (points.length - 1)) * plotWidth;
    const amount = point.total.amount;
    const y = amount == null ? null : PLOT_TOP + (1 - (amount - min) / domain) * plotHeight;
    return { x, y };
  });
  const drawable = coords.filter((point): point is { x: number; y: number } => point.y != null);
  const single = drawable.length === 1;
  const line = single
    ? `M ${PLOT_LEFT} ${drawable[0].y} L ${PLOT_RIGHT} ${drawable[0].y}`
    : drawable.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const area = single
    ? `M ${PLOT_LEFT} ${drawable[0].y} L ${PLOT_RIGHT} ${drawable[0].y} L ${PLOT_RIGHT} ${PLOT_BOTTOM} L ${PLOT_LEFT} ${PLOT_BOTTOM} Z`
    : drawable.length > 0
      ? `${line} L ${drawable[drawable.length - 1].x} ${PLOT_BOTTOM} L ${drawable[0].x} ${PLOT_BOTTOM} Z`
      : '';
  const marker = single
    ? { x: PLOT_RIGHT, y: drawable[0].y }
    : drawable[drawable.length - 1];
  const hover = active != null && !single ? coords[active] : null;
  const current = active != null ? points[active] : null;
  const latest = [...points].reverse().find((point) => point.total.amount != null) ?? points[points.length - 1];
  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;
  const sameDay = firstDate === lastDate;
  const sameYear = firstDate?.slice(0, 4) === lastDate?.slice(0, 4);
  const note = single ? t('capital.chartLevel') : flat ? t('capital.chartSteady') : null;

  const move = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || points.length === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setActive(Math.round(ratio * (points.length - 1)));
  };

  return (
    <div>
      <div className="relative h-52" onMouseLeave={() => setActive(null)}>
        <p className="pointer-events-none absolute right-0 top-0 text-sm font-medium tabular-nums">
          {latest.total.amount == null
            ? '—'
            : `${latest.total.approximate ? '~' : ''}${formatMoney(latest.total.amount, currency)}`}
        </p>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-full w-full text-emerald-600 dark:text-emerald-400"
          role="img"
          aria-label={t('capital.chartTitle')}
          onMouseMove={move}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.35, 0.7].map((ratio) => (
            <line
              key={ratio}
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={PLOT_TOP + plotHeight * ratio}
              y2={PLOT_TOP + plotHeight * ratio}
              stroke="currentColor"
              strokeWidth="1"
              className="text-foreground/10"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {marker && <ChartDot x={marker.x} y={marker.y} />}
        {hover?.y != null && active !== points.length - 1 && <ChartDot x={hover.x} y={hover.y} emphasized />}
        {current && (
          <div className="pointer-events-none absolute bottom-0 left-0 rounded-lg border bg-card/95 px-3 py-2 text-sm shadow-sm">
            <p className="font-medium">{formatAxisDate(current.date, dateLocale, true)}</p>
            <p className="tabular-nums">
              {current.total.amount == null ? '—' : formatMoney(current.total.amount, currency)}
            </p>
            <p className="text-muted-foreground">
              {signed(current.delta, currency)} · +{amountOf(current.contributed, currency)} / −
              {amountOf(current.withdrawn, currency)}
            </p>
          </div>
        )}
      </div>
      <div
        className={cn(
          'mt-2 text-xs text-muted-foreground',
          sameDay ? 'text-center' : 'flex items-center justify-between gap-3'
        )}
      >
        {sameDay ? (
          <div>
            <p>{firstDate ? formatAxisDate(firstDate, dateLocale, true) : ''}</p>
            {note && <p className="mt-1">{note}</p>}
          </div>
        ) : (
          <>
            <span>{firstDate ? formatAxisDate(firstDate, dateLocale, !sameYear) : ''}</span>
            {note && <span className="text-center">{note}</span>}
            <span>{lastDate ? formatAxisDate(lastDate, dateLocale, !sameYear) : ''}</span>
          </>
        )}
      </div>
    </div>
  );
}

function ChartDot({ x, y, emphasized = false }: { x: number; y: number; emphasized?: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 dark:bg-emerald-400 dark:ring-emerald-400/25',
        emphasized ? 'size-3' : 'size-2.5'
      )}
      style={{ left: `${(x / CHART_WIDTH) * 100}%`, top: `${(y / CHART_HEIGHT) * 100}%` }}
    />
  );
}

function formatAxisDate(iso: string, locale: typeof ru, withYear: boolean): string {
  return format(new Date(`${iso}T12:00:00`), withYear ? 'd MMM yyyy' : 'd MMM', { locale });
}

function amountOf(value: ValuedAmount, currency: FinanceCurrency): string {
  return value.amount == null ? '—' : formatMoney(value.amount, currency);
}

function signed(value: ValuedAmount, currency: FinanceCurrency): string {
  if (value.amount == null) return '—';
  const prefix = value.amount > 0 ? '+' : '';
  return `${prefix}${formatMoney(value.amount, currency)}`;
}

function movementAmount(amount: number | null | undefined): number {
  if (amount == null || Math.abs(amount) < 0.005) return 0;
  return amount;
}

export function CapitalFlowChart({
  rows,
  currency,
}: {
  rows: CapitalMonthRow[];
  currency: FinanceCurrency;
}) {
  const t = useTranslations('finance');
  const locale = useLocale();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const series = rows.map((row) => ({
    month: row.month,
    contributed: movementAmount(row.contributed.amount),
    withdrawn: movementAmount(row.withdrawn.amount),
    net: movementAmount(row.netSavings.amount),
  }));
  const hasMovement = series.some((row) => row.contributed !== 0 || row.withdrawn !== 0 || row.net !== 0);

  if (!hasMovement) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-medium">{t('capital.flowEmpty')}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('capital.flowEmptyHint')}</p>
      </div>
    );
  }

  const max = Math.max(1, ...series.flatMap((row) => [Math.abs(row.contributed), Math.abs(row.withdrawn), Math.abs(row.net)]));
  const spansYears = series.length > 0 && series[0].month.slice(0, 4) !== series[series.length - 1].month.slice(0, 4);
  const compact = series.length > 6;
  const barClass = compact ? 'w-3' : 'w-8';
  const visible = {
    contributed: series.some((row) => row.contributed !== 0),
    withdrawn: series.some((row) => row.withdrawn !== 0),
    net: series.some((row) => row.net !== 0),
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {visible.contributed && <Legend swatch="bg-emerald-500" label={t('capital.flowLegend.deposited')} />}
        {visible.withdrawn && <Legend swatch="bg-destructive" label={t('capital.flowLegend.withdrawn')} />}
        {visible.net && <Legend swatch="bg-sky-500" label={t('capital.flowLegend.net')} />}
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          className={cn(
            'relative flex items-end',
            series.length <= 8 ? 'min-w-full justify-center gap-5' : 'w-max gap-2'
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-6 border-b border-border/80" />
          {series.map((row) => (
            <div key={row.month} className={cn('relative flex shrink-0 flex-col items-center', compact ? 'w-16' : 'w-max px-3')}>
              <div className="flex h-28 items-end justify-center gap-1.5">
                {visible.contributed && (
                  <FlowBar value={row.contributed} max={max} widthClass={barClass} className="bg-emerald-500" label={t('capital.flowLegend.deposited')} currency={currency} />
                )}
                {visible.withdrawn && (
                  <FlowBar value={row.withdrawn} max={max} widthClass={barClass} className="bg-destructive" label={t('capital.flowLegend.withdrawn')} currency={currency} />
                )}
                {visible.net && (
                  <FlowBar
                    value={row.net}
                    max={max}
                    widthClass={barClass}
                    className={row.net < 0 ? 'bg-destructive' : 'bg-sky-500'}
                    label={t('capital.flowLegend.net')}
                    currency={currency}
                    signed
                  />
                )}
              </div>
              <span className="mt-2 h-4 text-xs text-muted-foreground">
                {format(new Date(`${row.month}-01T12:00:00`), spansYears ? 'LLL yy' : 'LLL', { locale: dateLocale })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-sm', swatch)} />
      {label}
    </span>
  );
}

const BAR_TRACK = 112;

function FlowBar({
  value,
  max,
  widthClass,
  className,
  label,
  currency,
  signed = false,
}: {
  value: number;
  max: number;
  widthClass: string;
  className: string;
  label: string;
  currency: FinanceCurrency;
  signed?: boolean;
}) {
  if (value === 0) return <div className={widthClass} />;
  const height = Math.max(10, (Math.abs(value) / max) * BAR_TRACK);
  const prefix = signed && value > 0 ? '+' : '';
  return (
    <div
      className={cn('rounded-t-md', widthClass, className)}
      style={{ height }}
      title={`${label}: ${prefix}${formatMoney(value, currency)}`}
    />
  );
}
