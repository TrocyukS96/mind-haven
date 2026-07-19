'use client';

import {
  ITEM_TYPE_SECTIONS,
  type ItemTypeCatalog,
  type ItemTypeDefinition,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface ItemTypeSettingsPanelProps {
  initialCatalog: ItemTypeCatalog;
}

export function ItemTypeSettingsPanel({ initialCatalog }: ItemTypeSettingsPanelProps) {
  const t = useTranslations('admin.itemTypes');
  const tTasks = useTranslations('tasks');
  const tGoals = useTranslations('goals');
  const [catalog, setCatalog] = useState(initialCatalog);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newType, setNewType] = useState<Record<ItemTypeSection, { key: string; label: string }>>({
    tasks: { key: '', label: '' },
    goals: { key: '', label: '' },
  });

  const getTypeLabel = (section: ItemTypeSection, type: ItemTypeDefinition) => {
    if (type.label) {
      return type.label;
    }

    const translator = section === 'tasks' ? tTasks : tGoals;
    if (
      type.key === 'short' ||
      type.key === 'medium' ||
      type.key === 'long' ||
      type.key === 'backlog'
    ) {
      return translator(`types.${type.key}` as 'types.short');
    }

    return type.key;
  };

  const handleToggle = async (
    section: ItemTypeSection,
    key: string,
    enabled: boolean
  ) => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, key, enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update type');
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      setCatalog(data.types);
      setMessage(t('saved'));
    } catch {
      setMessage(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddType = async (section: ItemTypeSection) => {
    const payload = newType[section];

    if (!payload.key.trim() || !payload.label.trim()) {
      setMessage(t('fillAllFields'));
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/item-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          key: payload.key,
          label: payload.label,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add type');
      }

      const data = (await response.json()) as { types: ItemTypeCatalog };
      setCatalog(data.types);
      setNewType((prev) => ({ ...prev, [section]: { key: '', label: '' } }));
      setMessage(t('added'));
    } catch {
      setMessage(t('addError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border">
        {ITEM_TYPE_SECTIONS.map((section) => (
          <div key={section} className="p-4 space-y-4">
            <h3 className="font-medium">{t(`sections.${section}`)}</h3>

            <div className="space-y-2">
              {catalog[section].map((type) => (
                <label
                  key={`${section}-${type.key}`}
                  className="flex items-center gap-3 cursor-pointer hover:bg-accent/40 rounded-lg p-2 -mx-2"
                >
                  <Checkbox
                    checked={type.enabled}
                    disabled={isSaving}
                    onCheckedChange={(checked) =>
                      handleToggle(section, type.key, checked === true)
                    }
                  />
                  <span className="text-sm">{getTypeLabel(section, type)}</span>
                  {!type.isSystem && (
                    <span className="text-xs text-muted-foreground">{type.key}</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/60">
              <Input
                placeholder={t('keyPlaceholder')}
                value={newType[section].key}
                disabled={isSaving}
                onChange={(e) =>
                  setNewType((prev) => ({
                    ...prev,
                    [section]: { ...prev[section], key: e.target.value },
                  }))
                }
              />
              <Input
                placeholder={t('labelPlaceholder')}
                value={newType[section].label}
                disabled={isSaving}
                onChange={(e) =>
                  setNewType((prev) => ({
                    ...prev,
                    [section]: { ...prev[section], label: e.target.value },
                  }))
                }
              />
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => handleAddType(section)}
              >
                {t('addType')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
