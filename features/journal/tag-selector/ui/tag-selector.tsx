'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useStore } from '@/shared/store/store-config';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { useTranslations } from 'next-intl';

interface TagSelectorProps {
  entryId: string;
  tagIds: string[];
}

export function TagSelector({ entryId, tagIds }: TagSelectorProps) {
  const { journalTags, addJournalTag, addTagToEntry, removeTagFromEntry } = useStore();
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');

  const entryTags = journalTags.filter((tag) => tagIds.includes(tag.id));
  const availableTags = journalTags.filter((tag) => !tagIds.includes(tag.id));

  const handleAddExistingTag = (tagId: string) => {
    addTagToEntry(entryId, tagId);
  };

  const handleCreateTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    const tagId = addJournalTag(trimmed);
    addTagToEntry(entryId, tagId);
    setNewTagName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entryTags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
          {tag.name}
          <button
            type="button"
            onClick={() => removeTagFromEntry(entryId, tag.id)}
            className="rounded-full p-0.5 hover:bg-muted-foreground/20"
            aria-label={t('removeTag', { name: tag.name })}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            {t('addTag')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('existingTags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleAddExistingTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t('createTag')}</p>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('tagNamePlaceholder')}
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                {tCommon('add')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
