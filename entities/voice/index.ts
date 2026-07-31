export type {
  VoiceEntityType,
  VoiceGoalOption,
  VoiceProcessResult,
} from '@/shared/lib/voice/types';
export type { ParsedTaskVoiceResult } from '@/shared/lib/voice/parsers';
export { VoiceError } from '@/shared/lib/voice/types';
export {
  processVoiceInput,
  getVoiceErrorMessage,
} from './api/voice-client';
export type { VoiceProcessRequest } from './api/voice-client';
