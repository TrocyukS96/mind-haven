'use client';

import type { TaskColumn } from '@/entities/task-column/model/types';
import { taskColumnErrorText } from '@/features/task/lib/task-column-error';
import {
  dateInputToIso,
  findOverlappingWeek,
  formatWeekTitle,
  toDateInputValue,
} from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useRouter } from '@/i18n/routing';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

export function TaskColumnMenu({ column }: { column: TaskColumn }) {
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const taskColumns = useStore((state) => state.taskColumns);
  const updateTaskColumn = useStore((state) => state.updateTaskColumn);
  const archiveTaskColumn = useStore((state) => state.archiveTaskColumn);
  const deleteTaskColumn = useStore((state) => state.deleteTaskColumn);
  const isBacklog = column.legacyKey === 'backlog';
  const [renameOpen, setRenameOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [start, setStart] = useState(toDateInputValue(column.dateFrom));
  const [end, setEnd] = useState(toDateInputValue(column.dateTo));
  const [transferTo, setTransferTo] = useState('');
  const [deleteTasks, setDeleteTasks] = useState(false);
  const [busy, setBusy] = useState(false);

  const targets = taskColumns
    .filter((item) => !item.archivedAt && item.id !== column.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const openRename = () => {
    setTitle(column.title);
    setRenameOpen(true);
  };

  const openPeriod = () => {
    setStart(toDateInputValue(column.dateFrom));
    setEnd(toDateInputValue(column.dateTo));
    setPeriodOpen(true);
  };

  const openDelete = () => {
    const backlog = targets.find((item) => item.legacyKey === 'backlog');
    setTransferTo(backlog?.id ?? targets[0]?.id ?? '');
    setDeleteTasks(false);
    setDeleteOpen(true);
  };

  const saveRename = async () => {
    const next = title.trim();
    if (!next || next === column.title) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    try {
      await updateTaskColumn(column.id, { title: next });
      setRenameOpen(false);
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.saveColumnError'));
    } finally {
      setBusy(false);
    }
  };

  const savePeriod = async () => {
    const dateFrom = dateInputToIso(start, 'start');
    const dateTo = dateInputToIso(end, 'end');
    if (!dateFrom || !dateTo || new Date(dateFrom) > new Date(dateTo)) {
      toast.error(t('columns.invalidRange'));
      return;
    }
    if (findOverlappingWeek(taskColumns, new Date(dateFrom), new Date(dateTo), column.id)) {
      toast.error(t('columns.overlapError'));
      return;
    }

    const updates: { dateFrom: string; dateTo: string; title?: string } = { dateFrom, dateTo };
    if (column.dateFrom && column.dateTo) {
      const generated = formatWeekTitle(new Date(column.dateFrom), new Date(column.dateTo));
      if (column.title === generated) {
        updates.title = formatWeekTitle(new Date(dateFrom), new Date(dateTo));
      }
    }

    setBusy(true);
    try {
      await updateTaskColumn(column.id, updates);
      setPeriodOpen(false);
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.saveColumnError'));
    } finally {
      setBusy(false);
    }
  };

  const hideColumn = async () => {
    try {
      await updateTaskColumn(column.id, { isHidden: !column.isHidden });
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.saveColumnError'));
    }
  };

  const archiveColumn = async () => {
    try {
      await archiveTaskColumn(column.id);
      toast.success(t('columns.weekArchived'));
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.archiveColumnError'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTasks && !transferTo) return;
    setBusy(true);
    try {
      await deleteTaskColumn(column.id, {
        transferToColumnId: deleteTasks ? undefined : transferTo,
        deleteTasks,
      });
      setDeleteOpen(false);
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.deleteColumnError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={t('columns.columnActions')}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {column.kind === 'week' ? (
            <DropdownMenuItem onSelect={() => router.push(`/tasks/weeks/${column.id}`)}>
              {t('weekBoard.open')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem disabled={isBacklog} onSelect={openRename}>
            {t('columns.rename')}
          </DropdownMenuItem>
          {column.kind === 'week' ? (
            <DropdownMenuItem onSelect={openPeriod}>{t('columns.editPeriod')}</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => void hideColumn()}>
            {column.isHidden ? t('columns.show') : t('columns.hide')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isBacklog} onSelect={() => void archiveColumn()}>
            {t('columns.archive')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isBacklog}
            className="text-destructive focus:text-destructive"
            onSelect={openDelete}
          >
            {t('columns.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('columns.renameTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('columns.columnTitlePlaceholder')}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" disabled={busy || !title.trim()} onClick={() => void saveRename()}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('columns.editPeriodTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`week-start-${column.id}`}>{t('columns.weekStart')}</Label>
              <Input
                id={`week-start-${column.id}`}
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`week-end-${column.id}`}>{t('columns.weekEnd')}</Label>
              <Input
                id={`week-end-${column.id}`}
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPeriodOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void savePeriod()}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('columns.deleteColumnTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('columns.deleteColumnDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTasks ? (
            <p className="text-sm text-destructive">{t('columns.deleteTasksWarning')}</p>
          ) : (
            <div className="space-y-1.5">
              <Label>{t('columns.transferTasksTo')}</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={deleteTasks}
              onCheckedChange={(checked) => setDeleteTasks(checked === true)}
              className="mt-0.5"
            />
            <span>{t('columns.deleteTasksToo')}</span>
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <Button
              type="button"
              variant={deleteTasks ? 'destructive' : 'default'}
              disabled={busy || (!deleteTasks && !transferTo)}
              onClick={() => void confirmDelete()}
            >
              {deleteTasks ? t('columns.confirmDeleteTasks') : t('columns.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
