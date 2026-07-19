'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

interface JournalTitleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export function JournalTitleCombobox({
  value,
  onChange,
  id,
  placeholder,
}: JournalTitleComboboxProps) {
  const { journalTitles, journalEntries } = useStore();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const t = useTranslations('journal');

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const options = useMemo(() => {
    const titles = new Set<string>();
    journalTitles.forEach((title) => titles.add(title));
    journalEntries.forEach((entry) => {
      const trimmed = entry.title.trim();
      if (trimmed) titles.add(trimmed);
    });
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [journalTitles, journalEntries]);

  const trimmedInput = inputValue.trim();
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );
  const canCreate =
    trimmedInput.length > 0 &&
    !options.some((option) => option.toLowerCase() === trimmedInput.toLowerCase());

  const handleSelect = (title: string) => {
    setInputValue(title);
    onChange(title);
    setOpen(false);
  };

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);
    onChange(nextValue);
    if (!open) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative mt-2">
          <Input
            id={id}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            required
            className="pr-10"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-9 text-muted-foreground"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={t('entryTitle')}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </Button>
        </div>
      </PopoverAnchor>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-56 overflow-y-auto">
          {canCreate && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleSelect(trimmedInput)}
            >
              <Plus className="h-4 w-4 shrink-0 text-primary" />
              <span>{t('createTitle', { title: trimmedInput })}</span>
            </button>
          )}

          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleSelect(option)}
            >
              <span className="truncate">{option}</span>
              {option.toLowerCase() === trimmedInput.toLowerCase() && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}

          {filteredOptions.length === 0 && !canCreate && (
            <p className="px-2 py-3 text-sm text-muted-foreground text-center">
              {t('noTitlesFound')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
