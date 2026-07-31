import type { VoiceTagOption } from '../types';
import { resolveJournalTagId } from './resolve-journal-tag';

export interface ParsedJournalVoiceResult {
  title: string;
  content: string;
  date?: string | null;
  tagId?: string | null;
  tagName?: string | null;
}

export const JOURNAL_PARSER_SYSTEM_PROMPT = `You extract structured journal entry data from transcribed speech.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "title": string,
  "content": string,
  "date": string | null,
  "tagId": string | null,
  "tagName": string | null
}

Rules:
- "title" is required — a short summary of the journal entry (3-8 words).
- "content" is required — the main journal text in first person, preserving the speaker's thoughts and tone.
- If the speech is already a complete diary entry, use a concise title and put the full text in "content".
- Infer dates from natural language ("today", "yesterday", "on Monday"). Use ISO datetime when possible.
- If no date mentioned, date is null.
- If user mentions a tag (e.g. "тег работа", "пометить как отдых"), match against Available tags from the user message.
- When a tag is mentioned, set "tagName" to the tag from speech and "tagId" to the matching id from Available tags when confident.
- "tagId" must be one of the provided tag ids or null.
- If user mentions a new tag not in Available tags, set "tagName" and leave "tagId" null.
- Do not invent information not implied by the speech.`;

export function normalizeParsedJournal(
  raw: unknown,
  tags: VoiceTagOption[] = []
): ParsedJournalVoiceResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid journal parse response');
  }

  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';

  if (!title) {
    throw new Error('Journal title is missing from AI response');
  }

  if (!content) {
    throw new Error('Journal content is missing from AI response');
  }

  let date: string | null = null;
  if (typeof data.date === 'string' && data.date.trim()) {
    const parsed = new Date(data.date);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toISOString();
    }
  }

  const rawTagName = typeof data.tagName === 'string' ? data.tagName.trim() : '';
  const tagId = resolveJournalTagId(
    typeof data.tagId === 'string' ? data.tagId : null,
    rawTagName || null,
    tags
  );

  return {
    title,
    content,
    date,
    tagId,
    tagName: tagId ? null : rawTagName || null,
  };
}
