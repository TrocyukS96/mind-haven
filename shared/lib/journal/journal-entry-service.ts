import type {
  JournalEntry,
  JournalEntryType,
  JournalTag,
  ReflectionPeriod,
} from '@/entities/journal/model/types';
import { REFLECTION_PERIODS } from '@/entities/journal/model/types';
import { prisma } from '@/shared/lib/db';
import { Prisma } from '@prisma/client';

export interface JournalEntryInput {
  title: string;
  content: string;
  date: string;
  tagIds?: string[];
  entryType?: JournalEntryType;
  reflectionPeriod?: ReflectionPeriod;
  reflectionAnswers?: string[];
}

export interface JournalEntryDbRow {
  id: string;
  userId: string;
  title: string;
  content: string;
  date: Date;
  entryType: string;
  reflectionPeriod: string | null;
  reflectionAnswers: unknown;
  tagIds: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalTagDbRow {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

export interface JournalData {
  entries: JournalEntry[];
  tags: JournalTag[];
  titles: string[];
}

function isReflectionPeriod(value: string | null | undefined): value is ReflectionPeriod {
  return Boolean(value && REFLECTION_PERIODS.includes(value as ReflectionPeriod));
}

function parseTagIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function parseReflectionAnswers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const answers = value.filter((item): item is string => typeof item === 'string');
  return answers.length > 0 ? answers : undefined;
}

function toDateString(value: Date): string {
  return value.toISOString().split('T')[0];
}

function parseEntryDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function mapJournalTagFromDb(row: JournalTagDbRow): JournalTag {
  return { id: row.id, name: row.name };
}

export function mapJournalEntryFromDb(row: JournalEntryDbRow): JournalEntry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    date: toDateString(row.date),
    tagIds: parseTagIds(row.tagIds),
    entryType: (row.entryType as JournalEntryType) || 'free',
    reflectionPeriod: isReflectionPeriod(row.reflectionPeriod)
      ? row.reflectionPeriod
      : undefined,
    reflectionAnswers: parseReflectionAnswers(row.reflectionAnswers),
  };
}

function buildTitles(entries: JournalEntry[]): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.title.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    titles.push(trimmed);
  }

  return titles;
}

function normalizeEntryInput(input: JournalEntryInput) {
  const title = input.title.trim();
  const content = input.content.trim();

  if (!title || !content) {
    throw new Error('Title and content are required');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Invalid date format');
  }

  const entryType = input.entryType ?? 'free';

  if (entryType === 'reflection') {
    if (!input.reflectionPeriod || !isReflectionPeriod(input.reflectionPeriod)) {
      throw new Error('Reflection period is required');
    }
  }

  return {
    title,
    content,
    date: parseEntryDate(input.date),
    tagIds: input.tagIds ?? [],
    entryType,
    reflectionPeriod: entryType === 'reflection' ? input.reflectionPeriod ?? null : null,
    reflectionAnswers:
      entryType === 'reflection' ? (input.reflectionAnswers ?? []) : Prisma.DbNull,
  };
}

export async function getJournalData(userId: string): Promise<JournalData> {
  const [entries, tags] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.journalTag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
  ]);

  const mappedEntries = entries.map(mapJournalEntryFromDb);
  const mappedTags = tags.map(mapJournalTagFromDb);

  return {
    entries: mappedEntries,
    tags: mappedTags,
    titles: buildTitles(mappedEntries),
  };
}

export async function createJournalEntry(
  userId: string,
  input: JournalEntryInput
): Promise<JournalEntry> {
  const data = normalizeEntryInput(input);

  const row = await prisma.journalEntry.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      date: data.date,
      tagIds: data.tagIds,
      entryType: data.entryType,
      reflectionPeriod: data.reflectionPeriod,
      reflectionAnswers: data.reflectionAnswers,
    },
  });

  return mapJournalEntryFromDb(row);
}

export async function updateJournalEntry(
  userId: string,
  entryId: string,
  input: Partial<JournalEntryInput>
): Promise<JournalEntry> {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });

  if (!existing) {
    throw new Error('Entry not found');
  }

  const merged: JournalEntryInput = {
    title: input.title ?? existing.title,
    content: input.content ?? existing.content,
    date: input.date ?? toDateString(existing.date),
    tagIds: input.tagIds ?? parseTagIds(existing.tagIds),
    entryType: (input.entryType ?? existing.entryType) as JournalEntryType,
    reflectionPeriod:
      input.reflectionPeriod ??
      (isReflectionPeriod(existing.reflectionPeriod) ? existing.reflectionPeriod : undefined),
    reflectionAnswers:
      input.reflectionAnswers ?? parseReflectionAnswers(existing.reflectionAnswers),
  };

  const data = normalizeEntryInput(merged);

  const row = await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      title: data.title,
      content: data.content,
      date: data.date,
      tagIds: data.tagIds,
      entryType: data.entryType,
      reflectionPeriod: data.reflectionPeriod,
      reflectionAnswers: data.reflectionAnswers,
    },
  });

  return mapJournalEntryFromDb(row);
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error('Entry not found');
  }

  await prisma.journalEntry.delete({ where: { id: entryId } });
}

export async function getJournalTags(userId: string): Promise<JournalTag[]> {
  const tags = await prisma.journalTag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  return tags.map(mapJournalTagFromDb);
}

export async function createJournalTag(userId: string, name: string): Promise<JournalTag> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Tag name is required');
  }

  const existing = await prisma.journalTag.findFirst({
    where: {
      userId,
      name: { equals: trimmed, mode: 'insensitive' },
    },
  });

  if (existing) {
    return mapJournalTagFromDb(existing);
  }

  const row = await prisma.journalTag.create({
    data: { userId, name: trimmed },
  });

  return mapJournalTagFromDb(row);
}
