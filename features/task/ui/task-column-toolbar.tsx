'use client';

import { createCustomColumn, createWeekColumn } from '@/features/task/lib/create-task-column';
import { taskColumnErrorText } from '@/features/task/lib/task-column-error';
import { TaskColumnsManager } from '@/features/task/ui/task-columns-manager';
import { TaskWeekArchiveDialog } from '@/features/task/ui/task-week-archive-dialog';
import { computeNextWeekRange, dateInputToIso, toDateInputValue } from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Archive, CalendarPlus, ChevronDown, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';

interface TaskColumnToolbarProps {
  onlyCurrent: boolean;
  onOnlyCurrentChange: (value: boolean) => void;
}

export function TaskColumnToolbar({ onlyCurrent, onOnlyCurrentChange }: TaskColumnToolbarProps) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const taskColumns = useStore((state) => state.taskColumns);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [datesOpen, setDatesOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.createColumnError'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const openDates = () => {
    const range = computeNextWeekRange(taskColumns);
    setStart(toDateInputValue(range.dateFrom.toISOString()));
    setEnd(toDateInputValue(range.dateTo.toISOString()));
    setDatesOpen(true);
  };

  const createDatedWeek = async () => {
    const dateFrom = dateInputToIso(start, 'start');
    const dateTo = dateInputToIso(end, 'end');
    if (!dateFrom || !dateTo || new Date(dateFrom) > new Date(dateTo)) {
      toast.error(t('columns.invalidRange'));
      return;
    }
    await run(async () => {
      await createWeekColumn(useStore.getState, { dateFrom, dateTo });
      setDatesOpen(false);
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-r-none"
            disabled={busy}
            onClick={() => void run(() => createWeekColumn(useStore.getState).then(() => undefined))}
          >
            <CalendarPlus className="h-4 w-4" />
            {t('columns.newWeek')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-l-none border-l-0 px-2"
                aria-label={t('columns.chooseDates')}
                disabled={busy}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={openDates}>{t('columns.chooseDates')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowNewColumn((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          {t('columns.newColumn')}
        </Button>
        <TaskColumnsManager onOpenArchive={() => setArchiveOpen(true)} />
        <Button
          type="button"
          variant={onlyCurrent ? 'default' : 'outline'}
          size="sm"
          aria-pressed={onlyCurrent}
          onClick={() => onOnlyCurrentChange(!onlyCurrent)}
        >
          {t('columns.currentWeeksOnly')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
          <Archive className="h-4 w-4" />
          {t('columns.weekArchive')}
        </Button>
        {showNewColumn ? (
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const title = newColumnTitle.trim();
              if (!title) return;
              void run(async () => {
                await createCustomColumn(useStore.getState, title);
                setNewColumnTitle('');
                setShowNewColumn(false);
              });
            }}
          >
            <Input
              value={newColumnTitle}
              onChange={(event) => setNewColumnTitle(event.target.value)}
              placeholder={t('columns.columnTitlePlaceholder')}
              className="h-8 w-full sm:w-48"
            />
            <Button type="submit" size="sm" disabled={busy || !newColumnTitle.trim()}>
              {t('columns.addColumn')}
            </Button>
          </form>
        ) : null}
      </div>

      <Dialog open={datesOpen} onOpenChange={setDatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('columns.customDatesTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('columns.customDatesHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-week-start">{t('columns.weekStart')}</Label>
              <Input
                id="new-week-start"
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-week-end">{t('columns.weekEnd')}</Label>
              <Input id="new-week-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDatesOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void createDatedWeek()}>
              {t('columns.createWeek')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskWeekArchiveDialog open={archiveOpen} onOpenChange={setArchiveOpen} />
    </>
  );
}
