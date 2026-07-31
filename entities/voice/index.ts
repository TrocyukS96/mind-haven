export type { VoiceEntityType, VoiceGoalOption, VoiceTagOption, VoiceProcessResult, VoiceErrorCode } from '@/shared/lib/voice/types';
export type { ParsedTaskVoiceResult, ParsedGoalVoiceResult, ParsedJournalVoiceResult } from '@/shared/lib/voice/parsers';
export { VoiceError } from '@/shared/lib/voice/types';
export {
  processVoiceInput,
} from './api/voice-client';
export { transcribeVoiceRecording } from './api/voice-transcribe-client';
export type { VoiceProcessRequest } from './api/voice-client';
export type { VoiceTranscribeRequest, VoiceTranscribeResult } from './api/voice-transcribe-client';
