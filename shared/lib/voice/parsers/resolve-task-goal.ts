import type { VoiceGoalOption } from '../types';

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

function scoreGoalMatch(goalTitle: string, searchTitle: string): number {
  const goalWords = tokenize(goalTitle);
  const searchWords = tokenize(searchTitle);

  if (!searchWords.length) {
    return 0;
  }

  const matchedWords = searchWords.filter((word) =>
    goalWords.some((goalWord) => goalWord.includes(word) || word.includes(goalWord))
  );

  return matchedWords.length / searchWords.length;
}

function pickBestGoalMatch(goals: VoiceGoalOption[], searchTitle: string): VoiceGoalOption | null {
  const scored = goals
    .map((goal) => ({ goal, score: scoreGoalMatch(goal.title, searchTitle) }))
    .filter(({ score }) => score >= 0.5)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) {
    return null;
  }

  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return null;
  }

  return scored[0].goal;
}

export function resolveTaskGoalId(
  goalId: string | null | undefined,
  goalTitle: string | null | undefined,
  goals: VoiceGoalOption[]
): string | null {
  if (!goals.length) {
    return null;
  }

  const trimmedGoalId = typeof goalId === 'string' ? goalId.trim() : '';
  if (trimmedGoalId && goals.some((goal) => goal.id === trimmedGoalId)) {
    return trimmedGoalId;
  }

  const searchTitle = typeof goalTitle === 'string' ? goalTitle.trim() : '';
  if (!searchTitle) {
    return null;
  }

  const normalizedSearch = normalizeForMatch(searchTitle);

  const exactMatch = goals.find((goal) => normalizeForMatch(goal.title) === normalizedSearch);
  if (exactMatch) {
    return exactMatch.id;
  }

  const includesMatches = goals.filter((goal) => {
    const normalizedGoalTitle = normalizeForMatch(goal.title);
    return (
      normalizedGoalTitle.includes(normalizedSearch) || normalizedSearch.includes(normalizedGoalTitle)
    );
  });

  if (includesMatches.length === 1) {
    return includesMatches[0].id;
  }

  if (includesMatches.length > 1) {
    const bestMatch = pickBestGoalMatch(includesMatches, searchTitle);
    return bestMatch?.id ?? null;
  }

  const fuzzyMatch = pickBestGoalMatch(goals, searchTitle);
  return fuzzyMatch?.id ?? null;
}
