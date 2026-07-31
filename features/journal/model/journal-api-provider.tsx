'use client';

import { useLayoutEffect } from 'react';
import { isAuthenticatedUser } from '@/entities/user';
import { setJournalApiEnabled } from '@/entities/journal/lib/resolve-journal-api';
import { useAccess } from '@/features/access';
import { useStore } from '@/shared/store/store-config';

interface JournalApiProviderProps {
  children: React.ReactNode;
}

export function JournalApiProvider({ children }: JournalApiProviderProps) {
  const { profile } = useAccess();
  const enabled = isAuthenticatedUser(profile);
  const setJournalApiEnabledInStore = useStore((state) => state.setJournalApiEnabled);

  setJournalApiEnabled(enabled);

  useLayoutEffect(() => {
    setJournalApiEnabled(enabled);
    setJournalApiEnabledInStore(enabled);
  }, [enabled, setJournalApiEnabledInStore]);

  return children;
}
