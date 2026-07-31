import type { VoiceTagOption } from '../types';

function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/["«»]/g, '')
    .replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  return normalizeForMatch(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}

function scoreTagMatch(tagName: string, searchName: string): number {
  const tagWords = tokenize(tagName);
  const searchWords = tokenize(searchName);

  if (!searchWords.length) {
    return 0;
  }

  const matchedWords = searchWords.filter((word) =>
    tagWords.some((tagWord) => tagWord.includes(word) || word.includes(tagWord))
  );

  return matchedWords.length / searchWords.length;
}

function pickBestTagMatch(tags: VoiceTagOption[], searchName: string): VoiceTagOption | null {
  const scored = tags
    .map((tag) => ({ tag, score: scoreTagMatch(tag.name, searchName) }))
    .filter(({ score }) => score >= 0.5)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return null;
  }

  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return null;
  }

  return scored[0].tag;
}

export function resolveJournalTagId(
  tagId: string | null | undefined,
  tagName: string | null | undefined,
  tags: VoiceTagOption[]
): string | null {
  if (!tags.length) {
    return null;
  }

  const trimmedTagId = typeof tagId === 'string' ? tagId.trim() : '';
  if (trimmedTagId && tags.some((tag) => tag.id === trimmedTagId)) {
    return trimmedTagId;
  }

  const searchName = typeof tagName === 'string' ? tagName.trim() : '';
  if (!searchName) {
    return null;
  }

  const normalizedSearch = normalizeForMatch(searchName);

  const exactMatch = tags.find((tag) => normalizeForMatch(tag.name) === normalizedSearch);
  if (exactMatch) {
    return exactMatch.id;
  }

  const includesMatches = tags.filter((tag) => {
    const normalizedTagName = normalizeForMatch(tag.name);
    return (
      normalizedTagName.includes(normalizedSearch) || normalizedSearch.includes(normalizedTagName)
    );
  });

  if (includesMatches.length === 1) {
    return includesMatches[0].id;
  }

  if (includesMatches.length > 1) {
    const bestMatch = pickBestTagMatch(includesMatches, searchName);
    return bestMatch?.id ?? null;
  }

  const fuzzyMatch = pickBestTagMatch(tags, searchName);
  return fuzzyMatch?.id ?? null;
}
