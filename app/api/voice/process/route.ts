import {
  isVoiceEntitySupported,
  parseGoalsFromFormData,
  parseSpeechToStructuredData,
  parseTagsFromFormData,
  transcribeSpeech,
} from '@/shared/lib/voice/server';
import type { VoiceEntityType } from '@/shared/lib/voice/types';
import { VoiceError } from '@/shared/lib/voice/types';
import { logVoiceDebug } from '@/shared/lib/voice/log-voice-debug';
import { NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth/auth';

const MIN_AUDIO_BYTES = 1000;
const SUPPORTED_ENTITY_TYPES: VoiceEntityType[] = [
  'task',
  'goal',
  'journal',
  'habit',
  'reflection',
  'note',
];

function isVoiceEntityType(value: string): value is VoiceEntityType {
  return SUPPORTED_ENTITY_TYPES.includes(value as VoiceEntityType);
}

function voiceErrorResponse(error: unknown) {
  if (error instanceof VoiceError) {
    const status =
      error.code === 'UNAUTHORIZED'
        ? 401
        : error.code === 'CONFIG_ERROR'
        ? 503
        : error.code === 'AI_QUOTA_EXHAUSTED'
          ? 402
          : error.code === 'NO_RECORDING' || error.code === 'RECORDING_TOO_SHORT'
          ? 400
          : error.code === 'PARSE_ERROR' || error.code === 'INVALID_RESPONSE'
            ? 422
            : 500;

    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  const message = error instanceof Error ? error.message : 'Voice processing failed';
  return NextResponse.json({ error: message, code: 'AI_ERROR' }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      throw new VoiceError('UNAUTHORIZED', 'Voice input requires authentication');
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    const entityTypeRaw = formData.get('entityType');
    const locale = formData.get('locale');
    const goals = parseGoalsFromFormData(formData.get('goals'));
    const tags = parseTagsFromFormData(formData.get('tags'));

    if (!(audio instanceof Blob)) {
      return NextResponse.json(
        { error: 'Audio file is required', code: 'NO_RECORDING' },
        { status: 400 }
      );
    }

    if (audio.size < MIN_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Recording is too short', code: 'RECORDING_TOO_SHORT' },
        { status: 400 }
      );
    }

    if (typeof entityTypeRaw !== 'string' || !isVoiceEntityType(entityTypeRaw)) {
      return NextResponse.json(
        { error: 'Invalid entity type', code: 'PARSE_ERROR' },
        { status: 400 }
      );
    }

    if (!isVoiceEntitySupported(entityTypeRaw)) {
      return NextResponse.json(
        { error: `Voice input for "${entityTypeRaw}" is not available yet`, code: 'PARSE_ERROR' },
        { status: 501 }
      );
    }

    const language = typeof locale === 'string' && locale.startsWith('ru') ? 'ru' : undefined;

    const transcript = await transcribeSpeech({
      audio,
      filename: 'recording.webm',
      language,
      mimeType: audio.type || undefined,
    });

    const parsed = await parseSpeechToStructuredData({
      transcript,
      entityType: entityTypeRaw,
      locale: typeof locale === 'string' ? locale : 'en',
      goals,
      tags,
    });

    logVoiceDebug('result', { transcript, parsed });

    return NextResponse.json({ transcript, parsed });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
