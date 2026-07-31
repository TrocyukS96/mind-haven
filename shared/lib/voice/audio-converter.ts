import 'server-only';

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import { VoiceError } from './types';

const execFileAsync = promisify(execFile);

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
    return audio.type || 'audio/webm';
  }

  return 'audio/webm';
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'm4a';
  }

  return 'webm';
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

async function convertToLpcm(input: Buffer, inputExtension: string): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new VoiceError(
      'AI_ERROR',
      'Audio conversion is unavailable. ffmpeg-static is not installed.'
    );
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'mind-haven-voice-'));
  const inputPath = join(tempDir, `input.${inputExtension}`);
  const outputPath = join(tempDir, 'output.pcm');

  try {
    await writeFile(inputPath, input);

    await execFileAsync(ffmpegPath, [
      '-y',
      '-i',
      inputPath,
      '-f',
      's16le',
      '-acodec',
      'pcm_s16le',
      '-ac',
      '1',
      '-ar',
      '16000',
      outputPath,
    ]);

    return await readFile(outputPath);
  } catch {
    throw new VoiceError(
      'AI_ERROR',
      'Failed to convert audio for speech recognition. Try recording again.'
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
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

  const extension = extensionForMimeType(resolvedMimeType);
  const pcm = await convertToLpcm(buffer, extension);

  return {
    data: pcm,
    format: 'lpcm',
    sampleRateHertz: 16000,
  };
}
