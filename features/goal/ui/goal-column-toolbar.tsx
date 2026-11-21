'use client';

import { createGoalColumnKey } from '@/features/goal/lib/goal-column-key';
import { useItemTypes } from '@/features/item-types';
import {
  ITEM_TYPE_LABEL_MAX_LENGTH,
  type ItemTypeCatalog,
} from '@/shared/config/item-types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Plus } from 'lucide-react';
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

async function readErrorCode(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'request_failed';
}

export function GoalColumnToolbar() {
  const t = useTranslations('goals');
  const tTypes = useTranslations('admin.itemTypes');
  const router = useRouter();
  const { catalog, setCatalog } = useItemTypes();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const createColumn = async (label: string, key: string) => {
    const response = await fetch('/api/admin/item-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'goals', key, label }),
    });

    if (!response.ok) {
      return { ok: false as const, code: await readErrorCode(response) };
    }

    const data = (await response.json()) as { types: ItemTypeCatalog };
    return { ok: true as const, types: data.types };
  };

  const submit = async () => {
    const label = title.trim();
    if (!label || label.length > ITEM_TYPE_LABEL_MAX_LENGTH || busy) {
      return;
    }

    setBusy(true);

    try {
      const existingKeys = catalog.goals.map((column) => column.key);
      let key = createGoalColumnKey(label, existingKeys);
      let result = await createColumn(label, key);

      if (!result.ok && result.code === 'exists') {
        key = createGoalColumnKey(label, [...existingKeys, key]);
        result = await createColumn(label, key);
      }

      if (!result.ok) {
        toast.error(
          ITEM_TYPE_ERROR_CODES.has(result.code)
            ? tTypes(result.code as 'invalid_label')
            : t('columns.createColumnError')
        );
        return;
      }

      setCatalog(result.types);
      router.refresh();
      setTitle('');
      setOpen(false);
    } catch {
      toast.error(t('columns.createColumnError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-start gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setOpen((value) => !value)}>
        <Plus className="h-4 w-4" />
        {t('columns.newColumn')}
      </Button>
      {open ? (
        <form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Input
            value={title}
            maxLength={ITEM_TYPE_LABEL_MAX_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('columns.columnTitlePlaceholder')}
            aria-label={t('columns.columnTitlePlaceholder')}
            className="h-8 w-full sm:w-48"
            autoFocus
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy || !title.trim()} loading={busy}>
            {t('columns.addColumn')}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
