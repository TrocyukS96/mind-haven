export type TaskColumnKind = 'default' | 'custom' | 'week';

export type TaskColumnPatch = Partial<Omit<TaskColumn, 'archivedAt' | 'dateFrom' | 'dateTo'>> & {
  archivedAt?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export interface TaskColumn {
  id: string;
  title: string;
  kind: TaskColumnKind;
  legacyKey?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder: number;
  isHidden?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}