'use client';

import { useItemTypes } from '@/features/item-types';
import {
  getDefaultItemTypeKey,
  isSystemItemTypeKey,
  isValidItemTypeKey,
  ITEM_TYPE_LABEL_MAX_LENGTH,
  ITEM_TYPE_SECTIONS,
  normalizeItemTypeKey,
  type ItemTypeCatalog,
  type ItemTypeDefinition,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { cn } from '@/shared/lib/utils';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ITEM_TYPE_ERROR_CODES = new Set([
  'invalid_key',
  'invalid_label',
  'exists',
  'not_found',
  'system',
  'last_enabled',
]);

interface ItemTypeSettingsPanelProps {
  initialCatalog: ItemTypeCatalog;
  section?: ItemTypeSection;
  hideHeader?: boolean;
  embedded?: boolean;
}

function isItemTypeErrorCode(value: string): boolean {
  return ITEM_TYPE_ERROR_CODES.has(value);
}

async function throwResponseError(response: Response): Promise<never> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(data?.error || 'request_failed');
}

export function ItemTypeSettingsPanel({
  initialCatalog,
  section,
  hideHeader = false,
  embedded = false,
}: ItemTypeSettingsPanelProps) {
  const t = useTranslations('admin.itemTypes');
  const tTasks = useTranslations('tasks');
  const tGoals = useTranslations('goals');
  const router = useRouter();
  const { setCatalog: setSharedCatalog } = useItemTypes();
  const reassignGoalsColumn = useStore((state) => state.reassignGoalsColumn);
  const reassignTasksColumn = useStore((state) => state.reassignTasksColumn);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [sourceCatalog, setSourceCatalog] = useState(initialCatalog);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'muted' | 'error'>('muted');
  const [newType, setNewType] = useState<Record<ItemTypeSection, { key: string; label: string }>>({
    tasks: { key: '', label: '' },
    goals: { key: '', label: '' },
  });
  const sections = section ? [section] : ITEM_TYPE_SECTIONS;

  if (sourceCatalog !== initialCatalog) {
    setSourceCatalog(initialCatalog);
    setCatalog(initialCatalog);
  }

  const publishCatalog = (next: ItemTypeCatalog) => {
    setCatalog(next);
    setSharedCatalog(next);
    router.refresh();
  };

  const showError = (code: string | null, fallback: string) => {
    setMessageTone('error');
    setMessage(code && isItemTypeErrorCode(code) ? t(code as 'invalid_key') : fallback);
  };

  const getTypeLabel = (currentSection: ItemTypeSection, type: ItemTypeDefinition) => {
    if (type.label) {
      return type.label;
    }

    if (isSystemItemTypeKey(type.key)) {
      const translator = currentSection === 'tasks' ? tTasks : tGoals;
      return translator(`types.${type.key}` as 'types.short');
    }

    return type.key;
  };

  const getSystemDefaultLabel = (currentSection: ItemTypeSection, type: ItemTypeDefinition) => {
    if (!isSystemItemTypeKey(type.key)) {
      return '';
    }

    const translator = currentSection === 'tasks' ? tTasks : tGoals;
    return translator(`types.${type.key}` as 'types.short');
  };

  const handleToggle = async (currentSection: ItemTypeSection, key: string, enabled: boolean) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: currentSection, key, enabled }),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      publishCatalog(data.types);
      setMessageTone('muted');
      setMessage(t('saved'));
    } catch (error) {
      showError(error instanceof Error ? error.message : null, t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLabel = async (currentSection: ItemTypeSection, key: string, label: string) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: currentSection, key, label }),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      publishCatalog(data.types);
      setMessageTone('muted');
      setMessage(t('saved'));
    } catch (error) {
      showError(error instanceof Error ? error.message : null, t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (currentSection: ItemTypeSection, key: string) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: currentSection, key }),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const data = (await response.json()) as { types: ItemTypeCatalog; fallbackKey: string };
      if (currentSection === 'goals') {
        reassignGoalsColumn(key, data.fallbackKey);
      } else {
        reassignTasksColumn(key, data.fallbackKey);
      }
      publishCatalog(data.types);
      setMessageTone('muted');
      setMessage(t('deleted'));
    } catch (error) {
      showError(error instanceof Error ? error.message : null, t('deleteError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddType = async (currentSection: ItemTypeSection) => {
    const payload = newType[currentSection];
    const key = normalizeItemTypeKey(payload.key);
    const label = payload.label.trim();

    if (!key || !label) {
      showError(null, t('fillAllFields'));
      return;
    }

    if (!isValidItemTypeKey(key) || label.length > ITEM_TYPE_LABEL_MAX_LENGTH) {
      showError(isValidItemTypeKey(key) ? 'invalid_label' : 'invalid_key', t('addError'));
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: currentSection,
          key,
          label,
        }),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      publishCatalog(data.types);
      setNewType((prev) => ({ ...prev, [currentSection]: { key: '', label: '' } }));
      setMessageTone('muted');
      setMessage(t('added'));
    } catch (error) {
      showError(error instanceof Error ? error.message : null, t('addError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      {!embedded &&
        (hideHeader ? (
          <h3 className="text-sm font-medium">{t('compactTitle')}</h3>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
          </div>
        ))}

      <div className="rounded-xl border border-border divide-y divide-border">
        {sections.map((currentSection) => {
          const enabledCount = catalog[currentSection].filter((type) => type.enabled).length;

          return (
            <div key={currentSection} className="p-3 space-y-3">
              {!section && <h3 className="font-medium">{t(`sections.${currentSection}`)}</h3>}

              <div className="space-y-1">
                {catalog[currentSection].map((type) => {
                  const fallbackKey = getDefaultItemTypeKey(currentSection, {
                    ...catalog,
                    [currentSection]: catalog[currentSection].filter((item) => item.key !== type.key),
                  });
                  const fallbackType =
                    catalog[currentSection].find((item) => item.key === fallbackKey) ?? type;

                  return (
                  <ItemTypeRow
                    key={`${currentSection}-${type.key}-${getTypeLabel(currentSection, type)}`}
                    type={type}
                    displayLabel={getTypeLabel(currentSection, type)}
                    systemDefaultLabel={getSystemDefaultLabel(currentSection, type)}
                    fallbackLabel={getTypeLabel(currentSection, fallbackType)}
                    isLastEnabled={type.enabled && enabledCount <= 1}
                    isSaving={isSaving}
                    onToggle={(enabled) => handleToggle(currentSection, type.key, enabled)}
                    onSaveLabel={(label) => handleSaveLabel(currentSection, type.key, label)}
                    onDelete={() => handleDelete(currentSection, type.key)}
                  />
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
                <Input
                  placeholder={t('keyPlaceholder')}
                  value={newType[currentSection].key}
                  disabled={isSaving}
                  onChange={(event) =>
                    setNewType((prev) => ({
                      ...prev,
                      [currentSection]: { ...prev[currentSection], key: event.target.value },
                    }))
                  }
                />
                <Input
                  placeholder={t('labelPlaceholder')}
                  value={newType[currentSection].label}
                  maxLength={ITEM_TYPE_LABEL_MAX_LENGTH}
                  disabled={isSaving}
                  onChange={(event) =>
                    setNewType((prev) => ({
                      ...prev,
                      [currentSection]: { ...prev[currentSection], label: event.target.value },
                    }))
                  }
                />
                <Button
                  type="button"
                  loading={isSaving}
                  onClick={() => handleAddType(currentSection)}
                >
                  {t('addType')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={cn('text-sm', messageTone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t('nameHint')}</p>
    </section>
  );
}

function ItemTypeRow({
  type,
  displayLabel,
  systemDefaultLabel,
  fallbackLabel,
  isLastEnabled,
  isSaving,
  onToggle,
  onSaveLabel,
  onDelete,
}: {
  type: ItemTypeDefinition;
  displayLabel: string;
  systemDefaultLabel: string;
  fallbackLabel: string;
  isLastEnabled: boolean;
  isSaving: boolean;
  onToggle: (enabled: boolean) => void;
  onSaveLabel: (label: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('admin.itemTypes');
  const tCommon = useTranslations('common');
  const [draft, setDraft] = useState(displayLabel);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trimmed = draft.trim();
  const isDirty = trimmed !== displayLabel;

  const saveLabel = () => {
    if (!trimmed || trimmed.length > ITEM_TYPE_LABEL_MAX_LENGTH) {
      return;
    }

    const nextLabel = type.isSystem && trimmed === systemDefaultLabel ? '' : trimmed;
    onSaveLabel(nextLabel);
  };

  return (
    <div className="rounded-lg p-1.5 -mx-1.5 hover:bg-accent/40">
      <div className="flex flex-wrap items-center gap-2">
        {!type.isSystem && (
          <span title={isLastEnabled ? t('last_enabled') : undefined}>
            <Checkbox
              checked={type.enabled}
              disabled={isSaving || isLastEnabled}
              onCheckedChange={(checked) => onToggle(checked === true)}
              aria-label={displayLabel}
            />
          </span>
        )}
        <Input
          value={draft}
          maxLength={ITEM_TYPE_LABEL_MAX_LENGTH}
          disabled={isSaving}
          aria-label={t('labelPlaceholder')}
          className="h-8 min-w-40 flex-1"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && isDirty) {
              event.preventDefault();
              saveLabel();
            }
          }}
        />
        {!type.isSystem && (
          <span className="text-xs text-muted-foreground shrink-0">{type.key}</span>
        )}
        {isDirty && (
          <Button type="button" size="sm" variant="outline" disabled={!trimmed} loading={isSaving} onClick={saveLabel}>
            {tCommon('save')}
          </Button>
        )}
        {type.isSystem && type.label && !isDirty && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            loading={isSaving}
            aria-label={t('resetName')}
            title={t('resetName')}
            onClick={() => onSaveLabel('')}
          >
            <RotateCcw />
          </Button>
        )}
        {!isLastEnabled && !confirmDelete && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isSaving}
            className="text-muted-foreground hover:text-destructive"
            aria-label={tCommon('delete')}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {confirmDelete && (
        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
          <p className="text-xs text-muted-foreground">
            {t('deleteConfirm', { name: displayLabel, fallback: fallbackLabel })}
          </p>
          <Button type="button" size="sm" variant="destructive" loading={isSaving} onClick={onDelete}>
            {tCommon('delete')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isSaving}
            onClick={() => setConfirmDelete(false)}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
