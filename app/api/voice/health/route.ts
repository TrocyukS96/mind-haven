import { assertYandexVoiceConfig } from '@/shared/lib/voice/yandex-client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    assertYandexVoiceConfig();
    return NextResponse.json({ configured: true, provider: 'yandex' });
  } catch {
    return NextResponse.json(
      {
        configured: false,
        provider: 'yandex',
        hint: 'Add YANDEX_API_KEY and YANDEX_FOLDER_ID to .env.local, then restart `npm run dev`',
      },
      { status: 503 }
    );
  }
}
