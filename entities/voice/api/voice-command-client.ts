import type {
  GlobalVoiceEntityType,
  VoiceGoalOption,
  VoiceTagOption,
  VoiceAccountOption,
} from '@/shared/lib/voice/types';
import type {
  ParsedFinanceVoiceResult,
  ParsedGoalVoiceResult,
  ParsedHabitVoiceResult,
  ParsedJournalVoiceResult,
  ParsedTaskVoiceResult,
} from '@/shared/lib/voice/parsers';
import { VoiceError } from '@/shared/lib/voice/types';

export type { GlobalVoiceEntityType };

export interface GlobalVoiceCommandResult {
  entityType: GlobalVoiceEntityType;
  transcript: string;
  parsed:
    | ParsedTaskVoiceResult
    | ParsedGoalVoiceResult
    | ParsedJournalVoiceResult
    | ParsedHabitVoiceResult
    | ParsedFinanceVoiceResult;
}

export interface GlobalVoiceCommandRequest {
  audio: Blob;
  locale?: string;
  goals?: VoiceGoalOption[];
  tags?: VoiceTagOption[];
  accounts?: VoiceAccountOption[];
}

export async function processGlobalVoiceCommand({
  audio,
  locale,
  goals,
  tags,
  accounts,
}: GlobalVoiceCommandRequest): Promise<GlobalVoiceCommandResult> {
  const formData = new FormData();
  formData.append('audio', audio, 'recording.webm');
  if (locale) {
    formData.append('locale', locale);
  }
  if (goals?.length) {
    formData.append('goals', JSON.stringify(goals));
  }
  if (tags?.length) {
    formData.append('tags', JSON.stringify(tags));
  }
  if (accounts?.length) {
    formData.append('accounts', JSON.stringify(accounts));
  }

  let response: Response;

  try {
    response = await fetch('/api/voice/command', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new VoiceError('NETWORK_ERROR', 'Network error while processing voice input');
  }

  const payload = (await response.json()) as GlobalVoiceCommandResult & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    const code =
      response.status === 401
        ? 'UNAUTHORIZED'
        : ((payload.code as VoiceError['code']) ?? 'AI_ERROR');
    throw new VoiceError(code, payload.error ?? 'Failed to process voice command');
  }

  if (!payload.transcript || !payload.entityType || !payload.parsed) {
    throw new VoiceError('INVALID_RESPONSE', 'Server returned an incomplete response');
  }

  return {
    entityType: payload.entityType,
    transcript: payload.transcript,
    parsed: payload.parsed,
  };
}
