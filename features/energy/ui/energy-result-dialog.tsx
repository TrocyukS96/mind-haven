'use client';

import { getEnergyLevel } from '@/entities/energy';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { useTranslations } from 'next-intl';

export function EnergyResultDialog() {
  const t = useTranslations('energy');
  const checkIn = useStore((state) => state.viewedEnergyCheckIn);
  const closeEnergyResult = useStore((state) => state.closeEnergyResult);

  return (
    <Dialog open={Boolean(checkIn)} onOpenChange={(open) => !open && closeEnergyResult()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('resultLabel')}</DialogDescription>
        </DialogHeader>
        {checkIn && (
          <div className="rounded-xl border bg-primary/5 px-4 py-5 text-center">
            <p className="text-4xl font-semibold tabular-nums">
              {checkIn.score.toFixed(1)}
              <span className="text-lg font-medium text-muted-foreground"> / 10</span>
            </p>
            <p className="mt-2 text-sm font-medium">
              {t(`levels.${getEnergyLevel(checkIn.score)}`)}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={closeEnergyResult}>{t('done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
