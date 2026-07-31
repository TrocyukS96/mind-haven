export type VoiceEntityType = 'task' | 'goal' | 'journal' | 'habit' | 'reflection' | 'note';

export type VoiceErrorCode =
  | 'MICROPHONE_DENIED'
  | 'MICROPHONE_UNAVAILABLE'
  | 'NO_RECORDING'
  | 'RECORDING_TOO_SHORT'
  | 'NETWORK_ERROR'
  | 'AI_ERROR'
  | 'AI_QUOTA_EXHAUSTED'
  | 'PARSE_ERROR'
  | 'INVALID_RESPONSE'
  | 'CONFIG_ERROR'
  | 'UNAUTHORIZED';

export class VoiceError extends Error {
  readonly code: VoiceErrorCode;

  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
  }
}

export interface VoiceProcessResult<TParsed = unknown> {
  transcript: string;
  parsed: TParsed;
}

export interface VoiceGoalOption {
  id: string;
  title: string;
}

export interface VoiceTagOption {
  id: string;
  name: string;
}
