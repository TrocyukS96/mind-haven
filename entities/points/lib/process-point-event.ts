import type { PointEvent } from '@/entities/points/model/types';
import { notifyPointsEarned } from '@/features/points/lib/show-points-toast';
import type { AppStore } from '@/shared/store/store-config';

type StoreGet = () => AppStore;

export function tryEarnPoints(get: StoreGet, event: PointEvent | null | undefined) {
  if (!event) return;

  const amount = get().earnPoints(event);
  if (amount !== 0) {
    notifyPointsEarned(amount, event.reason);
  }
}

export function tryEarnPointsMany(get: StoreGet, events: (PointEvent | null | undefined)[]) {
  events.forEach((event) => tryEarnPoints(get, event));
}
