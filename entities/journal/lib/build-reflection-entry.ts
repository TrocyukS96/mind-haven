import {
  REFLECTION_MIN_ANSWERS,
  ReflectionPeriod,
} from '@/entities/journal/model/types';

export function buildReflectionTitle(period: ReflectionPeriod, t: (key: string) => string): string {
  return t(`reflectionTitles.${period}`);
}

export function buildReflectionContent(
  questions: string[],
  answers: string[],
  header: string
): string {
  const sections = questions
    .map((question, index) => {
      const answer = answers[index]?.trim();
      if (!answer) return null;
      return `**${question}**\n${answer}`;
    })
    .filter(Boolean);

  return [header, ...sections].join('\n\n');
}

export function createEmptyAnswers(count: number): string[] {
  return Array.from({ length: count }, () => '');
}

export function countAnswered(answers: string[]): number {
  return answers.filter((answer) => answer.trim()).length;
}

export function hasMinimumAnswers(answers: string[]): boolean {
  return countAnswered(answers) >= REFLECTION_MIN_ANSWERS;
}

export function normalizeAnswers(existing: string[] | undefined, count: number): string[] {
  if (!existing?.length) {
    return createEmptyAnswers(count);
  }

  return [...existing, ...createEmptyAnswers(count)].slice(0, count);
}

export async function resolveReflectionTagIds(
  addJournalTag: (name: string) => string | Promise<string>,
  tagName: string,
  existingTagIds?: string[]
): Promise<string[]> {
  const reflectionTagId = await addJournalTag(tagName);
  return Array.from(new Set([...(existingTagIds ?? []), reflectionTagId]));
}
