export interface WeekRangeColumn {
  id?: string;
  kind?: string;
  archivedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface WeekRange {
  dateFrom: Date;
  dateTo: Date;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatWeekTitle(from: Date, to: Date): string {
  const start = `${pad(from.getDate())}.${pad(from.getMonth() + 1)}`;
  const end = `${pad(to.getDate())}.${pad(to.getMonth() + 1)}.${to.getFullYear()}`;
  if (from.getFullYear() === to.getFullYear()) {
    return `${start}–${end}`;
  }
  return `${start}.${from.getFullYear()}–${end}`;
}

export function formatColumnDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function rangesOverlap(aFrom: Date, aTo: Date, bFrom: Date, bTo: Date): boolean {
  return aFrom.getTime() <= bTo.getTime() && bFrom.getTime() <= aTo.getTime();
}

function mondayOfNextCalendarWeek(now: Date): Date {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  return startOfLocalDay(addLocalDays(thisMonday, 7));
}

function mondayOnOrAfter(date: Date): Date {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const add = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  return startOfLocalDay(addLocalDays(start, add));
}

function activeWeeks(columns: WeekRangeColumn[]): WeekRangeColumn[] {
  return columns.filter(
    (column) => column.kind === 'week' && !column.archivedAt && column.dateFrom && column.dateTo
  );
}

export function findOverlappingWeek<T extends WeekRangeColumn>(
  columns: T[],
  from: Date,
  to: Date,
  ignoreId?: string
): T | undefined {
  return columns.find((column) => {
    if (ignoreId && column.id === ignoreId) return false;
    if (column.kind !== 'week' || column.archivedAt || !column.dateFrom || !column.dateTo) return false;
    return rangesOverlap(from, to, new Date(column.dateFrom), new Date(column.dateTo));
  });
}

export function computeNextWeekRange(columns: WeekRangeColumn[], now = new Date()): WeekRange {
  const weeks = activeWeeks(columns);
  let candidate = mondayOfNextCalendarWeek(now);

  if (weeks.length > 0) {
    const latestEnd = weeks.reduce((latest, column) => {
      const end = new Date(column.dateTo as string).getTime();
      return end > latest ? end : latest;
    }, 0);
    const afterLatest = mondayOnOrAfter(addLocalDays(startOfLocalDay(new Date(latestEnd)), 1));
    if (afterLatest.getTime() > candidate.getTime()) {
      candidate = afterLatest;
    }
  }

  let guard = 0;
  while (
    guard < 520 &&
    findOverlappingWeek(weeks, candidate, endOfLocalDay(addLocalDays(candidate, 6)))
  ) {
    candidate = startOfLocalDay(addLocalDays(candidate, 7));
    guard += 1;
  }

  return {
    dateFrom: startOfLocalDay(candidate),
    dateTo: endOfLocalDay(addLocalDays(candidate, 6)),
  };
}

export function isPastWeekColumn(column: WeekRangeColumn, now = new Date()): boolean {
  if (column.kind !== 'week' || !column.dateTo) return false;
  return new Date(column.dateTo).getTime() < startOfLocalDay(now).getTime();
}

export function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateInputToIso(value: string, boundary: 'start' | 'end'): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date =
    boundary === 'end'
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

export function resolveTaskColumnId(
  task: { columnId?: string | null; type?: string | null },
  columns: Array<{ id: string; legacyKey?: string | null }>
): string {
  if (task.columnId && columns.some((column) => column.id === task.columnId)) {
    return task.columnId;
  }
  const legacy = columns.find((column) => column.legacyKey && column.legacyKey === task.type);
  return legacy?.id ?? task.type ?? 'backlog';
}

export function mergeReorderedVisibleColumns(
  sortedIds: string[],
  visibleIds: string[],
  reorderedVisible: string[]
): string[] {
  const visible = new Set(visibleIds);
  const queue = [...reorderedVisible];
  const result: string[] = [];

  for (const id of sortedIds) {
    if (!visible.has(id)) {
      result.push(id);
      continue;
    }
    const next = queue.shift();
    if (next) result.push(next);
  }

  for (const id of queue) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}
