import type { CategoryBreakdownItem } from '@/entities/finance/model/types';
import { getCategoryDefinition } from '@/entities/finance/model/categories';
import { cn } from '@/shared/lib/utils';

interface FinanceDonutChartProps {
  data: CategoryBreakdownItem[];
  total: number;
  currencySymbol: string;
  className?: string;
}

const SIZE = 220;
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FinanceDonutChart({
  data,
  total,
  currencySymbol,
  className,
}: FinanceDonutChartProps) {
  let offset = 0;

  const segments =
    data.length === 0
      ? [{ color: 'hsl(var(--muted))', dash: CIRCUMFERENCE, offset: 0 }]
      : data.map((item) => {
          const def = getCategoryDefinition(item.category);
          const dash = (item.percentage / 100) * CIRCUMFERENCE;
          const segment = { color: def.color, dash, offset };
          offset += dash;
          return segment;
        });

  const formattedTotal = total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={cn('relative mx-auto flex items-center justify-center', className)}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
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
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE}
            strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold tabular-nums">{formattedTotal}</span>
        <span className="text-sm text-muted-foreground">{currencySymbol}</span>
      </div>
    </div>
  );
}
