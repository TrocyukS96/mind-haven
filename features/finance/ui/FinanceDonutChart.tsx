'use client';

import type { CategoryBreakdownItem } from '@/entities/finance/model/types';
import { getCategoryDefinition } from '@/entities/finance/model/categories';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface FinanceDonutChartProps {
  data: CategoryBreakdownItem[];
  total: number;
  currencySymbol: string;
  className?: string;
}

const SIZE = 220;
const STROKE = 28;
const HOVER_STROKE = 36;
const PAD = 18;
const RADIUS = (SIZE - STROKE) / 2;
const GAP = 1.6;

function prefersHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function pointFromTop(cx: number, cy: number, radius: number, clockwiseFromTop: number) {
  const radians = ((clockwiseFromTop - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function arcPath(cx: number, cy: number, radius: number, start: number, sweep: number): string {
  if (sweep >= 359.99) {
    const startPoint = pointFromTop(cx, cy, radius, start);
    const midPoint = pointFromTop(cx, cy, radius, start + 180);
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 1 1 ${midPoint.x} ${midPoint.y} A ${radius} ${radius} 0 1 1 ${startPoint.x} ${startPoint.y}`;
  }

  const startPoint = pointFromTop(cx, cy, radius, start);
  const endPoint = pointFromTop(cx, cy, radius, start + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;
}

export function FinanceDonutChart({
  data,
  total,
  currencySymbol,
  className,
}: FinanceDonutChartProps) {
  const t = useTranslations('finance');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? pinnedIndex;

  useEffect(() => {
    if (pinnedIndex == null) return;

    const clear = () => setPinnedIndex(null);
    document.addEventListener('pointerup', clear);
    return () => document.removeEventListener('pointerup', clear);
  }, [pinnedIndex]);

  let cursor = 0;
  const segments = data.map((item) => {
    const sweep = (item.percentage / 100) * 360;
    const segment = {
      ...item,
      color: getCategoryDefinition(item.category).color,
      start: cursor,
      sweep,
    };
    cursor += sweep;
    return segment;
  });

  const active = activeIndex != null ? segments[activeIndex] : undefined;
  const formattedTotal = total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedActiveAmount = active
    ? active.amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;

  const canvas = SIZE + PAD * 2;
  const ActiveIcon = active ? getCategoryDefinition(active.category).icon : null;

  return (
    <div className={cn('mx-auto flex w-full max-w-md flex-col items-center', className)}>
      <div className="flex h-16 w-full items-end justify-center pb-3" aria-live="polite">
        {active && formattedActiveAmount && ActiveIcon && (
          <div
            key={active.category}
            className="flex max-w-full items-center gap-3 rounded-2xl border bg-background/95 px-3.5 py-2 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ boxShadow: `0 10px 28px -16px ${active.color}` }}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${active.color}24` }}
            >
              <ActiveIcon size={16} style={{ color: active.color }} aria-hidden />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium leading-tight">
                {t(`categories.${active.category}`)}
              </span>
              <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
                {active.percentage}%
              </span>
            </span>
            <span className="pl-2 text-sm font-semibold tabular-nums">
              {formattedActiveAmount} {currencySymbol}
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          width={canvas}
          height={canvas}
          viewBox={`${-PAD} ${-PAD} ${canvas} ${canvas}`}
          className="overflow-visible"
          role="img"
          aria-label={t('category')}
          onPointerUp={() => setPinnedIndex(null)}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={STROKE}
            strokeDasharray="4 6"
            opacity={0.5}
          />
          {segments.map((segment, index) => {
            if (segment.sweep <= 0) return null;
            const gapped =
              segments.length > 1 && segment.sweep > GAP * 3
                ? { start: segment.start + GAP, sweep: segment.sweep - GAP * 2 }
                : segment;
            const path = arcPath(SIZE / 2, SIZE / 2, RADIUS, gapped.start, gapped.sweep);
            const isActive = index === activeIndex;
            const dimmed = activeIndex != null && !isActive;
            const label = t(`categories.${segment.category}`);

            return (
              <g key={segment.category}>
                <path
                  d={path}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isActive ? HOVER_STROKE : STROKE}
                  strokeLinecap="butt"
                  className="pointer-events-none transition-all duration-200"
                  style={{ opacity: dimmed ? 0.38 : 1 }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={HOVER_STROKE + 14}
                  className="cursor-pointer"
                  style={{ pointerEvents: 'stroke' }}
                  aria-label={label}
                  onMouseEnter={() => {
                    if (prefersHover()) setHoveredIndex(index);
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    if (prefersHover()) return;
                    setPinnedIndex((current) => (current === index ? null : index));
                  }}
                />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums">{formattedTotal}</span>
          <span className="text-sm text-muted-foreground">{currencySymbol}</span>
        </div>
      </div>
    </div>
  );
}
