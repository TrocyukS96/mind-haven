const VOICE_DEBUG =
  process.env.NODE_ENV === 'development' || process.env.VOICE_DEBUG === 'true';

export function logVoiceDebug(stage: string, data: unknown): void {
  if (!VOICE_DEBUG) {
    return;
  }

  console.log(`[voice:${stage}]`, data);
}
