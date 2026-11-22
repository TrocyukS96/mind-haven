'use client';

import {
  earnActivity,
  loadAscentDesk,
  purchaseReward,
  reverseGrant,
  applyPurchase,
  type AscentDesk,
  type DeskActivity,
  type DeskReward,
} from '@/features/ascent/api/ascent-desk';
import { createClientKey } from '@/features/ascent/model/wizard';
import {
  canReverseGrant,
  ownedRewardState,
  previewActivityXp,
  rewardOffer,
  suggestedQuantities,
  transactionMatches,
  type LedgerFilter,
} from '@/features/ascent/model/shop';
import { RewardIcon, REWARD_ICONS } from '@/features/ascent/ui/reward-icons';
import { ascentApiMessage, formatAscentWhen } from '@/features/ascent/ui/ascent-copy';
import { Link } from '@/i18n/routing';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { ArrowLeft, Gift, History, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FILTERS: LedgerFilter[] = ['all', 'grants', 'purchases', 'resets'];

function balanceFrom(payload: Record<string, unknown>, fallback: number): number {
  const challenge = payload.challenge;
  if (!challenge || typeof challenge !== 'object' || !('xpBalance' in challenge)) return fallback;
  return typeof challenge.xpBalance === 'number' ? challenge.xpBalance : fallback;
}

type PurchaseState =
  | { phase: 'confirm'; reward: DeskReward; restrictionId: string; key: string }
  | { phase: 'done'; title: string; spent: number; balance: number; replayed: boolean };

export function AscentShop() {
  const t = useTranslations('ascent');
  const locale = useLocale();
  const lock = useRef(false);
  const earnKeys = useRef(new Map<string, string>());
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [desk, setDesk] = useState<AscentDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<PurchaseState | null>(null);
  const [earnNote, setEarnNote] = useState<{ title: string; xp: number; replayed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<LedgerFilter>('all');

  const reload = useCallback(async () => {
    const next = await loadAscentDesk();
    setDesk(next);
    setStatus('ready');
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadAscentDesk();
        if (cancelled) return;
        setDesk(next);
        setStatus('ready');
      } catch (caught) {
        if (cancelled) return;
        setError(ascentApiMessage(t, caught));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const reversed = useMemo(() => {
    const ids = new Set<string>();
    for (const item of desk?.transactions ?? []) {
      if (item.reason === 'activity_reversal' && item.activityLogId) ids.add(item.activityLogId);
    }
    return ids;
  }, [desk]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(ascentApiMessage(t, caught));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <p className="sr-only">{t('shop.loading')}</p>
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-36 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (status === 'error' || !desk) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ShopHeader />
        {status === 'error' ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p role="alert">{error ?? t('shop.loadError')}</p>
              <Button type="button" onClick={() => { setStatus('loading'); setError(null); void reload().catch((caught) => { setError(ascentApiMessage(t, caught)); setStatus('error'); }); }}>
                {t('retry')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={Gift} title={t('shop.emptyTitle')} description={t('shop.emptyBody')} showCard />
        )}
      </div>
    );
  }

  const history = desk.transactions.filter((item) => transactionMatches(item.reason, filter));
  const owned = [...desk.purchases].sort((left, right) => right.purchasedAt.localeCompare(left.purchasedAt));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ShopHeader />
      {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">{error}</p> : null}

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{t('shop.balanceLabel')}</p>
        <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{desk.xpBalance} XP</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <dt className="text-muted-foreground">{t('shop.earnedLabel')}</dt>
            <dd className="mt-1 font-medium tabular-nums">{desk.xpEarnedTotal} XP</dd>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-2">
            <dt className="text-muted-foreground">{t('shop.ownedLabel')}</dt>
            <dd className="mt-1 font-medium tabular-nums">{desk.purchases.length}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('shop.catalogTitle')}</h2>
        {desk.rewards.length === 0 ? (
          <EmptyState icon={Gift} title={t('shop.catalogEmptyTitle')} description={t('shop.catalogEmptyBody')} compact />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {desk.rewards.map((reward) => {
              const offer = rewardOffer({
                reward,
                restrictions: desk.restrictions,
                currentStreak: desk.currentStreak,
                balance: desk.xpBalance,
              });
              const linked = offer.permits[0]?.title ?? desk.restrictions.find((item) => item.rewardId === reward.id)?.title ?? null;
              return (
                <li key={reward.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                      {reward.icon && REWARD_ICONS.some((item) => item.name === reward.icon) ? (
                        <RewardIcon name={reward.icon} className="size-5" />
                      ) : (
                        <Gift className="size-5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-medium">{reward.title}</h3>
                      {reward.description ? <p className="mt-1 text-sm text-muted-foreground">{reward.description}</p> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold tabular-nums">{t('shop.cost', { xp: reward.xpCost })}</p>
                  {linked ? <p className="mt-1 text-xs text-muted-foreground">{t('shop.linked', { title: linked })}</p> : null}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {offer.status === 'short' ? t('shop.missing', { xp: offer.missing }) : null}
                    {offer.status === 'lifted' ? t('shop.lifted') : null}
                    {offer.status === 'core' ? t('shop.core') : null}
                    {offer.status === 'unavailable' ? t('shop.unavailable') : null}
                    {offer.status === 'ready' ? t('shop.buy') : null}
                  </p>
                  <Button
                    type="button"
                    className="mt-3 w-full sm:w-auto"
                    disabled={offer.status !== 'ready' || busy}
                    onClick={() => setPurchase({
                      phase: 'confirm',
                      reward,
                      restrictionId: offer.permits.length === 1 ? offer.permits[0].id : '',
                      key: createClientKey(),
                    })}
                  >
                    {t('shop.buy')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('shop.ownedTitle')}</h2>
        {owned.length === 0 ? (
          <EmptyState icon={Gift} title={t('shop.ownedEmptyTitle')} description={t('shop.ownedEmptyBody')} compact />
        ) : (
          <ul className="space-y-2">
            {owned.map((item) => {
              const state = ownedRewardState(item);
              return (
                <li key={item.id} className="flex flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.rewardTitle || item.rewardId}</p>
                    <p className="text-sm text-muted-foreground">
                      {state === 'available' ? t('shop.stateAvailable') : null}
                      {state === 'used' ? t('shop.stateUsed') : null}
                      {state === 'owned' ? t('shop.stateOwned') : null}
                      {' · '}
                      {t('shop.cost', { xp: item.xpSpent })}
                    </p>
                    {item.usedOnLocalDate ? <p className="text-xs text-muted-foreground">{t('shop.usedOn', { date: item.usedOnLocalDate })}</p> : null}
                  </div>
                  {state === 'available' ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void run(async () => {
                        await applyPurchase(desk.challenge.id, item.id);
                        await reload();
                      })}
                    >
                      {busy ? t('shop.using') : t('shop.use')}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">{t('shop.earnTitle')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('shop.earnHint')}</p>
        {earnNote ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm" role="status">
            {earnNote.replayed ? t('shop.earnedReplay') : t('shop.earnedBody', { title: earnNote.title, xp: earnNote.xp })}
          </p>
        ) : null}
        {desk.activities.length === 0 ? (
          <EmptyState icon={Sparkles} title={t('shop.earnEmptyTitle')} description={t('shop.earnEmptyBody')} compact showCard={false} />
        ) : (
          <ul className="space-y-3">
            {desk.activities.map((activity) => (
              <EarnRow
                key={activity.id}
                activity={activity}
                disabled={busy || !activity.active}
                onConfirm={(quantity) => void run(async () => {
                  const idempotencyKey = earnKeys.current.get(activity.id) ?? createClientKey();
                  earnKeys.current.set(activity.id, idempotencyKey);
                  const result = await earnActivity({
                    activityId: activity.id,
                    challengeId: desk.challenge.id,
                    quantity,
                    idempotencyKey,
                  });
                  setEarnNote({ title: activity.title, xp: result.xp, replayed: result.replayed });
                  await reload();
                  earnKeys.current.delete(activity.id);
                })}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="size-5" aria-hidden />
          <h2 className="text-lg font-semibold">{t('shop.historyTitle')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button key={item} type="button" size="sm" variant={filter === item ? 'default' : 'outline'} aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {t(`shop.filter${item === 'all' ? 'All' : item === 'grants' ? 'Grants' : item === 'purchases' ? 'Purchases' : 'Resets'}`)}
            </Button>
          ))}
        </div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">{t('shop.historyEmpty')}</p> : (
          <ul className="divide-y rounded-xl border">
            {history.map((item) => {
              const undo = canReverseGrant({
                reason: item.reason,
                localDate: item.localDate,
                activityLogId: item.activityLogId,
                today: desk.localDate,
                reversedLogIds: reversed,
              });
              const sign = item.amount > 0 ? '+' : '';
              return (
                <li key={item.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <span className={item.amount < 0 ? 'text-destructive' : 'text-primary'}>{sign}{item.amount} XP</span>
                      {item.note ? ` — ${item.note}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatAscentWhen(item.createdAt, desk.challenge.timezone, locale)}
                      {' · '}
                      {t(`shop.reason.${item.reason}`)}
                      {' · '}
                      {t('shop.balanceAfter', { xp: item.balanceAfter })}
                    </p>
                  </div>
                  {undo && item.activityLogId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void run(async () => {
                        await reverseGrant(desk.challenge.id, item.activityLogId!);
                        await reload();
                      })}
                    >
                      {t('shop.undo')}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PurchaseDialog
        state={purchase}
        balance={desk.xpBalance}
        permits={purchase?.phase === 'confirm'
          ? rewardOffer({
              reward: purchase.reward,
              restrictions: desk.restrictions,
              currentStreak: desk.currentStreak,
              balance: desk.xpBalance,
            }).permits
          : []}
        busy={busy}
        onClose={() => setPurchase(null)}
        onRestriction={(restrictionId) => setPurchase((current) => current?.phase === 'confirm' ? { ...current, restrictionId } : current)}
        onConfirm={() => {
          if (purchase?.phase !== 'confirm') return;
          const current = purchase;
          void run(async () => {
            const payload = await purchaseReward(desk.challenge.id, current.reward.id, {
              idempotencyKey: current.key,
              ...(current.restrictionId ? { restrictionId: current.restrictionId } : {}),
            });
            const spent = typeof payload.xpSpent === 'number' ? payload.xpSpent : current.reward.xpCost;
            const confirmedBalance = balanceFrom(payload, desk.xpBalance);
            let nextBalance = confirmedBalance;
            try {
              const next = await reload();
              nextBalance = next?.xpBalance ?? confirmedBalance;
            } catch (caught) {
              setError(ascentApiMessage(t, caught));
            }
            setPurchase({
              phase: 'done',
              title: current.reward.title,
              spent,
              balance: nextBalance,
              replayed: payload.replayed === true,
            });
          });
        }}
      />
    </div>
  );
}

function ShopHeader() {
  const t = useTranslations('ascent');
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('shop.title')}</h1>
      <Button variant="ghost" asChild>
        <Link href="/ascent"><ArrowLeft className="size-4" />{t('shop.back')}</Link>
      </Button>
    </div>
  );
}

function EarnRow({
  activity,
  disabled,
  onConfirm,
}: {
  activity: DeskActivity;
  disabled: boolean;
  onConfirm: (quantity: number) => void;
}) {
  const t = useTranslations('ascent');
  const [quantity, setQuantity] = useState(String(activity.quantityPerGrant));
  const parsed = Number(quantity.replace(',', '.'));
  const preview = previewActivityXp(
    {
      unit: activity.unit,
      xpPerGrant: activity.xpPerGrant,
      quantityPerGrant: activity.quantityPerGrant,
      minQuantity: activity.minQuantity,
      active: activity.active,
    },
    parsed
  );
  const choices = suggestedQuantities(activity);

  return (
    <li className="rounded-xl border px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{activity.title}</h3>
        <p className="text-sm tabular-nums text-muted-foreground">
          {activity.quantityPerGrant} {t(`units.${activity.unit}`)} · {activity.xpPerGrant} XP
        </p>
      </div>
      {activity.unit === 'completion' ? (
        <Button type="button" className="mt-3" disabled={disabled || preview == null || preview <= 0} onClick={() => onConfirm(activity.quantityPerGrant)}>
          {t('shop.confirmEarn')}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          {choices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {choices.map((choice) => (
                <Button key={choice} type="button" size="sm" variant={Number(quantity) === choice ? 'default' : 'outline'} onClick={() => setQuantity(String(choice))}>
                  {choice} {t(`units.${activity.unit}`)}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`qty-${activity.id}`}>{t('shop.quantityLabel')}</Label>
              <Input
                id={`qty-${activity.id}`}
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <Button type="button" disabled={disabled || preview == null || preview <= 0 || !Number.isFinite(parsed)} onClick={() => onConfirm(parsed)}>
              {t('shop.confirmEarn')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {preview != null && preview > 0 ? t('shop.preview', { xp: preview }) : t('shop.previewNone')}
          </p>
        </div>
      )}
    </li>
  );
}

function PurchaseDialog({
  state,
  balance,
  permits,
  busy,
  onClose,
  onRestriction,
  onConfirm,
}: {
  state: PurchaseState | null;
  balance: number;
  permits: { id: string; title: string }[];
  busy: boolean;
  onClose: () => void;
  onRestriction: (id: string) => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('ascent');
  const reward = state?.phase === 'confirm' ? state.reward : null;
  const needsChoice = permits.length > 1;
  const restrictionId = state?.phase === 'confirm' ? state.restrictionId : '';
  const permitTitle = permits.find((item) => item.id === restrictionId)?.title ?? permits[0]?.title ?? '';
  const after = reward ? balance - reward.xpCost : balance;

  return (
    <Dialog open={state != null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent>
        {state?.phase === 'done' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('shop.successTitle')}</DialogTitle>
              <DialogDescription>
                {state.replayed ? t('shop.replayed') : t('shop.successBody', { title: state.title, xp: state.spent, balance: state.balance })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" onClick={onClose}>{t('shop.close')}</Button>
            </DialogFooter>
          </>
        ) : reward ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('shop.confirmTitle')}</DialogTitle>
              <DialogDescription>{reward.title}</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt>{t('shop.confirmCost')}</dt><dd className="tabular-nums">{reward.xpCost} XP</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('shop.confirmBalance')}</dt><dd className="tabular-nums">{balance} XP</dd></div>
              <div className="flex justify-between gap-3"><dt>{t('shop.confirmAfter')}</dt><dd className="tabular-nums">{after} XP</dd></div>
            </dl>
            <p className="text-sm text-muted-foreground">
              {permitTitle ? t('shop.permitTerms', { title: permitTitle }) : t('shop.rewardTerms')}
            </p>
            {needsChoice ? (
              <div className="space-y-1">
                <Label>{t('shop.choosePermit')}</Label>
                <Select value={restrictionId || undefined} onValueChange={onRestriction}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('shop.choosePermit')} />
                  </SelectTrigger>
                  <SelectContent>
                    {permits.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t('settings.cancel')}</Button>
              <Button type="button" disabled={busy || (needsChoice && !restrictionId)} onClick={onConfirm}>
                {busy ? t('shop.buying') : t('shop.buyFor', { xp: reward.xpCost })}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
