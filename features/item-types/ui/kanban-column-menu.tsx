'use client';

import { useAccess } from '@/features/access';
import { useItemTypes } from '@/features/item-types';
import {
  getDefaultItemTypeKey,
  isSystemItemTypeKey,
  ITEM_TYPE_LABEL_MAX_LENGTH,
  type ItemTypeCatalog,
  type ItemTypeDefinition,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { useStore } from '@/shared/store/store-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
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
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

const ITEM_TYPE_ERROR_CODES = new Set([
  'invalid_key',
  'invalid_label',
  'exists',
  'not_found',
  'system',
  'last_enabled',
]);

interface KanbanColumnMenuProps {
  section: ItemTypeSection;
  column: ItemTypeDefinition;
  label: string;
}

async function readErrorCode(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'request_failed';
}

export function KanbanColumnMenu({ section, column, label }: KanbanColumnMenuProps) {
  const t = useTranslations('admin.itemTypes');
  const tSection = useTranslations(section);
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { canAccessFeature } = useAccess();
  const { catalog, getEnabledTypes, setCatalog } = useItemTypes();
  const reassignGoalsColumn = useStore((state) => state.reassignGoalsColumn);
  const reassignTasksColumn = useStore((state) => state.reassignTasksColumn);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(label);
  const [isSaving, setIsSaving] = useState(false);

  if (!canAccessFeature('admin_feature_settings')) {
    return null;
  }

  const enabledCount = getEnabledTypes(section).length;
  const canRemove = enabledCount > 1;
  const systemDefaultLabel = isSystemItemTypeKey(column.key)
    ? tSection(`types.${column.key}`)
    : '';
  const fallbackKey = getDefaultItemTypeKey(section, {
    ...catalog,
    [section]: catalog[section].filter((item) => item.key !== column.key),
  });
  const fallbackColumn = catalog[section].find((item) => item.key === fallbackKey);
  const fallbackLabel = fallbackColumn
    ? fallbackColumn.label ||
      (isSystemItemTypeKey(fallbackColumn.key)
        ? tSection(`types.${fallbackColumn.key}`)
        : fallbackColumn.key)
    : label;

  const showError = (code: string, fallback: string) => {
    toast.error(ITEM_TYPE_ERROR_CODES.has(code) ? t(code as 'invalid_label') : fallback);
  };

  const publishCatalog = (next: ItemTypeCatalog) => {
    setCatalog(next);
    router.refresh();
  };

  const saveLabel = async () => {
    const trimmed = draft.trim();

    if (!trimmed || trimmed.length > ITEM_TYPE_LABEL_MAX_LENGTH) {
      showError('invalid_label', t('saveError'));
      return;
    }

    const nextLabel = column.isSystem && trimmed === systemDefaultLabel ? '' : trimmed;

    if (nextLabel === column.label || (!nextLabel && !column.label && trimmed === label)) {
      setRenameOpen(false);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, key: column.key, label: nextLabel }),
      });

      if (!response.ok) {
        showError(await readErrorCode(response), t('saveError'));
        return;
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      publishCatalog(data.types);
      setRenameOpen(false);
    } catch {
      toast.error(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteColumn = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, key: column.key }),
      });

      if (!response.ok) {
        showError(await readErrorCode(response), t('deleteError'));
        return;
      }

      const data = (await response.json()) as { types: ItemTypeCatalog; fallbackKey: string };
      if (section === 'goals') {
        reassignGoalsColumn(column.key, data.fallbackKey);
      } else {
        reassignTasksColumn(column.key, data.fallbackKey);
      }
      publishCatalog(data.types);
      setDeleteOpen(false);
    } catch {
      toast.error(t('deleteError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ml-auto" onPointerDown={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            aria-label={t('columnActions')}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              setDraft(label);
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {tCommon('edit')}
          </DropdownMenuItem>
          {canRemove && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon('delete')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('renameTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            value={draft}
            maxLength={ITEM_TYPE_LABEL_MAX_LENGTH}
            aria-label={t('labelPlaceholder')}
            disabled={isSaving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void saveLabel();
              }
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setRenameOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" disabled={!draft.trim()} loading={isSaving} onClick={() => void saveLabel()}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm', { name: label, fallback: fallbackLabel })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              loading={isSaving}
              className="bg-destructive text-destructive-foreground"
              onClick={(event) => {
                event.preventDefault();
                void deleteColumn();
              }}
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
