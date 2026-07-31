import { transcribeSpeech } from '@/shared/lib/voice/server';
import { VoiceError } from '@/shared/lib/voice/types';
import { auth } from '@/shared/lib/auth/auth';
import { NextResponse } from 'next/server';

const MIN_AUDIO_BYTES = 1000;

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
              : 500;

    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }

  const message = error instanceof Error ? error.message : 'Voice transcription failed';
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
    const locale = formData.get('locale');

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

    const language = typeof locale === 'string' && locale.startsWith('ru') ? 'ru' : undefined;

    const transcript = await transcribeSpeech({
      audio,
      filename: 'recording.webm',
      language,
      mimeType: audio.type || undefined,
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
