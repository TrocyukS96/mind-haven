'use client';

import { useMemo } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import type { ParsedFinanceVoiceResult } from '@/shared/lib/voice/parsers/finance-parser';
import { mapVoiceResultToFinanceDraft } from '@/features/finance/lib/map-voice-to-finance-draft';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';
import { VoiceButton } from '@/features/voice/ui/VoiceButton';
import { VoiceRecorder } from '@/features/voice/ui/VoiceRecorder';
import { useVoiceInput } from '@/features/voice/hooks/use-voice-input';
import { useVoiceErrorMessage } from '@/features/voice/hooks/use-voice-error-message';
import { toast } from 'react-toastify';

export function FinanceVoiceButton() {
  const { profile } = useAccess();
  const { openTransactionFormFromVoice, financeAccounts } = useStore();
  const resolveErrorMessage = useVoiceErrorMessage();
  const isAuthenticated = isAuthenticatedUser(profile);

  const voiceAccounts = useMemo(
    () =>
      financeAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
      })),
    [financeAccounts]
  );

  const voice = useVoiceInput<ParsedFinanceVoiceResult>({
    entityType: 'finance',
    accounts: voiceAccounts,
    onResult: (result) => {
      openTransactionFormFromVoice(mapVoiceResultToFinanceDraft(result.parsed));
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error));
    },
  });

  if (!isAuthenticated || financeAccounts.length === 0) {
    return null;
  }

  return (
    <>
      <VoiceButton onClick={voice.open} disabled={voice.isProcessing} />

      <VoiceRecorder
        open={voice.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            voice.close();
          }
        }}
        status={voice.status}
        durationMs={voice.durationMs}
        onStart={voice.startRecording}
        onStop={voice.stopRecording}
        onCancel={voice.cancelRecording}
      />
    </>
  );
}
