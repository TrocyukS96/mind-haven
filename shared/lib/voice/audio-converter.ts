import 'server-only';

import { VoiceError } from './types';

export type PreparedSpeechAudio = {
  data: Buffer;
  format: 'oggopus' | 'lpcm';
  sampleRateHertz?: number;
};

function getMimeType(audio: Blob | Buffer, explicitMimeType?: string): string {
  if (explicitMimeType) {
    return explicitMimeType;
  }

  if (audio instanceof Blob) {
    return audio.type || 'application/octet-stream';
  }

  return 'application/octet-stream';
}

async function toBuffer(audio: Blob | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(audio)) {
    return audio;
  }

  return Buffer.from(await audio.arrayBuffer());
}

function extractLpcmFromWav(buffer: Buffer): PreparedSpeechAudio {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new VoiceError('AI_ERROR', 'Invalid WAV audio received from client');
  }

  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  if (bitsPerSample !== 16) {
    throw new VoiceError('AI_ERROR', 'Unsupported WAV bit depth');
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === 'data') {
      const pcm = buffer.subarray(offset + 8, offset + 8 + chunkSize);

      if (channels !== 1) {
        throw new VoiceError('AI_ERROR', 'Expected mono WAV audio');
      }

      return {
        data: Buffer.from(pcm),
        format: 'lpcm',
        sampleRateHertz: sampleRate,
      };
    }

    offset += 8 + chunkSize;
  }

  throw new VoiceError('AI_ERROR', 'WAV data chunk not found');
}

export async function prepareSpeechAudio(
  audio: Blob | Buffer,
  mimeType?: string
): Promise<PreparedSpeechAudio> {
  const resolvedMimeType = getMimeType(audio, mimeType);
  const buffer = await toBuffer(audio);

  if (resolvedMimeType.includes('ogg')) {
    return {
      data: buffer,
      format: 'oggopus',
    };
  }

  if (resolvedMimeType.includes('wav')) {
    return extractLpcmFromWav(buffer);
  }

  throw new VoiceError(
    'AI_ERROR',
    'Unsupported audio format. The client must send WAV or OGG audio.'
  );
}
