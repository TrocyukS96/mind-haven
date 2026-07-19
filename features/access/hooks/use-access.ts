'use client';

import { useAccessContext } from '../model/access-provider';

export function useAccess() {
  return useAccessContext();
}
