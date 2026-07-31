export type { VoiceEntityType, VoiceGoalOption, VoiceProcessResult, VoiceErrorCode } from '@/shared/lib/voice/types';
export type { ParsedTaskVoiceResult } from '@/shared/lib/voice/parsers';
export { VoiceError } from '@/shared/lib/voice/types';
export {
  processVoiceInput,
} from './api/voice-client';
export type { VoiceProcessRequest } from './api/voice-client';
