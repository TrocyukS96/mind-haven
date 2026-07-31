import 'server-only';

import type { GlobalVoiceEntityType } from './types';
import { VoiceError } from './types';
import { requestYandexGptJson } from './yandex-gpt-complete';

const GLOBAL_VOICE_ENTITY_TYPES: GlobalVoiceEntityType[] = [
  'task',
  'goal',
  'journal',
  'habit',
  'finance',
];

export const VOICE_INTENT_SYSTEM_PROMPT = `You classify voice commands for a productivity app into one section.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "entityType": "task" | "goal" | "journal" | "habit" | "finance"
}

Rules:
- "task" — user wants to create a todo, reminder, or action item.
  Keywords: task, todo, задача, дело, напоминание, сделать, выполнить.
- "goal" — user wants to create a long-term goal with optional steps or deadline.
  Keywords: goal, objective, цель, достичь, план, шаги к цели.
- "journal" — user wants to write a free journal entry or note about their day/thoughts.
  Keywords: journal, diary, entry, дневник, запись, заметка, мысли, сегодня был.
- "habit" — user wants to track a recurring habit.
  Keywords: habit, привычка, каждый день, ежедневно, трекер привычек.
- "finance" — user wants to record a financial transaction: expense or income.
  Keywords: расход, доход, потратил, потратила, купил, купила, оплатил, оплатила, получил, получила, зарплата, трата, финансы, счёт, перевод, expense, income, spent, paid, earned, salary.
  Choose "finance" when the primary intent is logging money spent or received, even without saying "финансы" explicitly.
- Prefer explicit section mentions ("create a task", "новая цель", "запись в дневник", "добавь расход").
- If multiple sections are mentioned, choose the primary creation intent.
- Do not choose "journal" for structured reflection questionnaires — only free-form entries.
- Output must be exactly one of the five values above.`;

export function isGlobalVoiceEntityType(value: unknown): value is GlobalVoiceEntityType {
  return typeof value === 'string' && GLOBAL_VOICE_ENTITY_TYPES.includes(value as GlobalVoiceEntityType);
}

export function normalizeVoiceIntent(raw: unknown): GlobalVoiceEntityType {
  if (!raw || typeof raw !== 'object') {
    throw new VoiceError('PARSE_ERROR', 'Could not determine section from speech');
  }

  const entityType = (raw as Record<string, unknown>).entityType;

  if (!isGlobalVoiceEntityType(entityType)) {
    throw new VoiceError('PARSE_ERROR', 'Could not determine section from speech');
  }

  return entityType;
}

export async function classifyVoiceEntityType(
  transcript: string,
  locale = 'en'
): Promise<GlobalVoiceEntityType> {
  const userMessage = [`Locale: ${locale}`, `Transcript: ${transcript}`].join('\n');
  const raw = await requestYandexGptJson(VOICE_INTENT_SYSTEM_PROMPT, userMessage);
  return normalizeVoiceIntent(raw);
}
