'use client';

import type { Habit } from '@/entities/habit/model/types';
import { fetchHabits } from '@/entities/habit/api/habit-client';
import { XP_UNITS } from '@/entities/ascent/model/types';
import {
  createDeskActivity,
  createDeskDebt,
  createDeskRestriction,
  createDeskReward,
  createDeskTrigger,
  deleteDeskDebt,
  deleteDeskRestriction,
  deleteDeskReward,
  deleteDeskTrigger,
  linkDeskHabit,
  loadAscentDesk,
  patchChallenge,
  patchDeskActivity,
  patchDeskDebt,
  patchDeskRestriction,
  patchDeskReward,
  patchDeskTrigger,
  unlinkDeskHabit,
  type AscentDesk,
  type DeskActivity,
  type DeskCustomDebt,
  type DeskRestriction,
  type DeskReward,
} from '@/features/ascent/api/ascent-desk';
import { canEditAbstinenceStart } from '@/shared/lib/ascent/abstinence';
import { isCompatibleDailyHabit } from '@/shared/lib/ascent/habit-link';
import { formatLocalDate, formatLocalTime } from '@/shared/lib/ascent/local-date';
import { REWARD_ICONS } from '@/features/ascent/ui/reward-icons';
import { ascentApiMessage, formatAscentWhen } from '@/features/ascent/ui/ascent-copy';
import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
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
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { ArrowLeft, Settings, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type PendingDelete = { title: string; run: () => Promise<unknown> } | null;

export function AscentSettings() {
  const t = useTranslations('ascent');
  const locale = useLocale();
  const openHabitForm = useStore((state) => state.openHabitForm);
  const habitFormOpen = useStore((state) => state.isHabitFormOpen);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [desk, setDesk] = useState<AscentDesk | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete>(null);
  const formWasOpen = useRef(false);

  async function reload() {
    const [next, habitList] = await Promise.all([loadAscentDesk(), fetchHabits().catch(() => [] as Habit[])]);
    setDesk(next);
    setHabits(habitList);
    setStatus('ready');
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [next, habitList] = await Promise.all([loadAscentDesk(), fetchHabits()]);
        if (cancelled) return;
        setDesk(next);
        setHabits(habitList);
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

  useEffect(() => {
    if (formWasOpen.current && !habitFormOpen) {
      void fetchHabits().then(setHabits).catch(() => setError(t('habitsError')));
    }
    formWasOpen.current = habitFormOpen;
  }, [habitFormOpen, t]);

  async function save(action: () => Promise<unknown>) {
    setError(null);
    setNotice(null);
    try {
      await action();
      await reload();
      setNotice(t('settings.saved'));
      return true;
    } catch (caught) {
      setError(ascentApiMessage(t, caught));
      return false;
    }
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <p className="sr-only">{t('settings.loading')}</p>
        <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (status === 'error' || !desk) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <SettingsHeader />
        {status === 'error' ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p role="alert">{error ?? t('settings.loadError')}</p>
              <Button type="button" onClick={() => { setStatus('loading'); void reload().catch((caught) => { setError(ascentApiMessage(t, caught)); setStatus('error'); }); }}>{t('retry')}</Button>
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={Settings} title={t('settings.emptyTitle')} description={t('settings.emptyBody')} />
        )}
      </div>
    );
  }

  const editable = canEditAbstinenceStart({
    status: desk.challenge.status,
    currentStreak: desk.currentStreak,
    bestStreak: desk.bestStreak,
    hasFailedDay: desk.days.some((day) => day.status === 'failed'),
    hasStreakReset: desk.transactions.some((item) => item.reason === 'streak_reset'),
    openViolation: desk.debt.some((item) => item.source === 'restriction' && item.state === 'missed'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsHeader />
      <div className="flex justify-end">
        <Button variant="outline" asChild><Link href="/ascent/shop">{t('settings.openShop')}</Link></Button>
      </div>
      {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm" role="status">{notice}</p> : null}
      <Basics key={desk.challenge.updatedAt} desk={desk} editable={editable} locale={locale} onSave={save} />
      <Rewards desk={desk} onSave={save} onDelete={setPending} />
      <Triggers desk={desk} onSave={save} onDelete={setPending} />
      <Habits desk={desk} habits={habits} onSave={save} onCreate={() => openHabitForm()} />
      <Debts desk={desk} onSave={save} onDelete={setPending} />
      <Restrictions desk={desk} onSave={save} onDelete={setPending} />
      <Activities desk={desk} onSave={save} />
      <AlertDialog open={pending != null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteBody', { name: pending?.title ?? '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const job = pending; setPending(null); if (job) void save(job.run); }}>{t('settings.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsHeader() {
  const t = useTranslations('ascent');
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('settings.title')}</h1>
      <Button variant="ghost" asChild>
        <Link href="/ascent"><ArrowLeft className="size-4" />{t('settings.back')}</Link>
      </Button>
    </div>
  );
}

function Basics({
  desk,
  editable,
  locale,
  onSave,
}: {
  desk: AscentDesk;
  editable: boolean;
  locale: string;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const t = useTranslations('ascent');
  const challenge = desk.challenge;
  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description);
  const [importance, setImportance] = useState(challenge.importance);
  const [date, setDate] = useState(() => formatLocalDate(new Date(challenge.abstinenceStartedAt), challenge.timezone));
  const [time, setTime] = useState(() => formatLocalTime(new Date(challenge.abstinenceStartedAt), challenge.timezone));
  const [saving, setSaving] = useState(false);
  const originalDate = formatLocalDate(new Date(challenge.abstinenceStartedAt), challenge.timezone);
  const originalTime = formatLocalTime(new Date(challenge.abstinenceStartedAt), challenge.timezone);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('settings.basicsTitle')}</h2>
        <Field label={t('settings.name')} htmlFor="settings-title">
          <Input id="settings-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label={t('settings.description')} htmlFor="settings-description" hint={t('settings.descriptionHint')}>
          <Textarea id="settings-description" value={description} rows={4} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('settings.importance')}</Label>
            <span className="tabular-nums font-semibold">{importance}</span>
          </div>
          <Slider value={[importance]} min={0} max={100} step={1} onValueChange={([value]) => setImportance(value ?? importance)} />
        </div>
        <Field label={t('settings.target')} hint={t('settings.targetLocked')}>
          <Input value={String(challenge.targetDays)} readOnly />
        </Field>
        <Field label={t('settings.challengeStart')}>
          <Input value={formatAscentWhen(challenge.startsAt, challenge.timezone, locale)} readOnly />
        </Field>
        <div className="space-y-2 rounded-xl border px-3 py-3">
          <p className="text-sm font-medium">{t('settings.abstinenceStart')}</p>
          <p className="text-sm text-muted-foreground">{editable ? t('settings.abstinenceNote') : t('settings.abstinenceLocked')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="date" value={date} max={desk.localDate} disabled={!editable} onChange={(event) => setDate(event.target.value)} aria-label={t('abstinenceDate')} />
            <Input type="time" value={time} disabled={!editable} onChange={(event) => setTime(event.target.value)} aria-label={t('abstinenceTime')} />
          </div>
        </div>
        <Button
          type="button"
          disabled={saving || !title.trim()}
          onClick={() => {
            setSaving(true);
            const body: Record<string, unknown> = { title: title.trim(), description: description.trim(), importance };
            if (editable && (date !== originalDate || time !== originalTime)) {
              body.abstinenceDate = date;
              body.abstinenceTime = time;
            }
            void onSave(() => patchChallenge(challenge.id, body)).finally(() => setSaving(false));
          }}
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function Rewards({
  desk,
  onSave,
  onDelete,
}: {
  desk: AscentDesk;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
  onDelete: (pending: PendingDelete) => void;
}) {
  const t = useTranslations('ascent');
  const [draft, setDraft] = useState({ title: '', description: '', xpCost: '', icon: null as string | null });
  return (
    <Section title={t('settings.rewardsTitle')} hint={t('settings.rewardsHint')}>
      <ul className="space-y-3">
        {desk.rewards.map((reward) => (
          <RewardEditor
            key={reward.id}
            challengeId={desk.challenge.id}
            reward={reward}
            onSave={onSave}
            onDelete={() => onDelete({ title: reward.title, run: () => deleteDeskReward(desk.challenge.id, reward.id) })}
          />
        ))}
      </ul>
      <div className="grid gap-3 rounded-xl border border-dashed p-3">
        <Input value={draft.title} placeholder={t('settings.rewardName')} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <Input value={draft.description} placeholder={t('settings.rewardDescription')} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        <Input inputMode="numeric" value={draft.xpCost} placeholder={t('settings.rewardCost')} onChange={(event) => setDraft({ ...draft, xpCost: event.target.value })} />
        <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
        <Button
          type="button"
          variant="outline"
          disabled={!draft.title.trim() || !/^\d+$/.test(draft.xpCost)}
          onClick={() => void onSave(async () => {
            await createDeskReward(desk.challenge.id, {
              title: draft.title.trim(),
              description: draft.description.trim(),
              icon: draft.icon,
              xpCost: Number(draft.xpCost),
              sortOrder: desk.rewards.length,
            });
            setDraft({ title: '', description: '', xpCost: '', icon: null });
          })}
        >
          {t('settings.addReward')}
        </Button>
      </div>
    </Section>
  );
}

function RewardEditor({
  challengeId,
  reward,
  onSave,
  onDelete,
}: {
  challengeId: string;
  reward: DeskReward;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
  onDelete: () => void;
}) {
  const t = useTranslations('ascent');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(reward.title);
  const [description, setDescription] = useState(reward.description);
  const [xpCost, setXpCost] = useState(String(reward.xpCost));
  const [icon, setIcon] = useState(reward.icon);
  if (!open) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
        <span className="min-w-0 truncate text-sm">{reward.title} · {reward.xpCost} XP</span>
        <span className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>{t('settings.edit')}</Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t('settings.delete')} onClick={onDelete}><Trash2 /></Button>
        </span>
      </li>
    );
  }
  return (
    <li className="space-y-2 rounded-xl border p-3">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      <Input inputMode="numeric" value={xpCost} onChange={(event) => setXpCost(event.target.value)} />
      <IconPicker value={icon} onChange={setIcon} />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!title.trim() || !/^\d+$/.test(xpCost)}
          onClick={() => void onSave(() => patchDeskReward(challengeId, reward.id, {
            title: title.trim(),
            description: description.trim(),
            icon,
            xpCost: Number(xpCost),
          })).then((saved) => { if (saved) setOpen(false); })}
        >
          {t('settings.save')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>{t('settings.cancel')}</Button>
      </div>
    </li>
  );
}

function Triggers({ desk, onSave, onDelete }: { desk: AscentDesk; onSave: (action: () => Promise<unknown>) => Promise<boolean>; onDelete: (pending: PendingDelete) => void }) {
  const t = useTranslations('ascent');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Section title={t('settings.triggersTitle')}>
      <ul className="space-y-2">
        {desk.triggers.map((trigger) => (
          <NamedEditor
            key={trigger.id}
            title={trigger.title}
            description={trigger.description}
            onSave={(next) => onSave(() => patchDeskTrigger(desk.challenge.id, trigger.id, next))}
            onDelete={() => onDelete({ title: trigger.title, run: () => deleteDeskTrigger(desk.challenge.id, trigger.id) })}
          />
        ))}
      </ul>
      <div className="grid gap-2">
        <Input value={title} placeholder={t('triggerPlaceholder')} onChange={(event) => setTitle(event.target.value)} />
        <Input value={description} placeholder={t('descriptionOptional')} onChange={(event) => setDescription(event.target.value)} />
        <Button type="button" variant="outline" disabled={!title.trim()} onClick={() => void onSave(async () => {
          await createDeskTrigger(desk.challenge.id, { title: title.trim(), description: description.trim(), sortOrder: desk.triggers.length });
          setTitle('');
          setDescription('');
        })}>{t('settings.addTrigger')}</Button>
      </div>
    </Section>
  );
}

function Habits({
  desk,
  habits,
  onSave,
  onCreate,
}: {
  desk: AscentDesk;
  habits: Habit[];
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
  onCreate: () => void;
}) {
  const t = useTranslations('ascent');
  const linked = new Set(desk.habits.map((item) => item.habitId));
  const available = habits.filter((habit) => !linked.has(habit.id));
  return (
    <Section title={t('settings.habitsTitle')} hint={t('settings.habitsHint')}>
      <div>
        <h3 className="text-sm font-medium">{t('settings.linkedHabits')}</h3>
        {desk.habits.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('habitsEmptyTitle')}</p> : (
          <ul className="mt-2 space-y-2">
            {desk.habits.map((habit) => (
              <li key={habit.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
                <span className="min-w-0 truncate text-sm">{habit.name}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => void onSave(() => unlinkDeskHabit(desk.challenge.id, habit.id))}>{t('unlink')}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">{t('settings.availableHabits')}</h3>
        {available.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('settings.noHabits')}</p> : (
          <ul className="mt-2 space-y-2">
            {available.map((habit) => {
              const daily = isCompatibleDailyHabit(habit.frequency);
              return (
                <li key={habit.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{habit.name}</span>
                    {daily ? null : <span className="text-xs text-muted-foreground">{t('settings.habitBlocked')}</span>}
                  </span>
                  <Button type="button" size="sm" variant="outline" disabled={!daily} onClick={() => void onSave(() => linkDeskHabit(desk.challenge.id, habit.id))}>{t('settings.addHabit')}</Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Button type="button" variant="outline" onClick={onCreate}>{t('settings.createHabit')}</Button>
    </Section>
  );
}

function Debts({
  desk,
  onSave,
  onDelete,
}: {
  desk: AscentDesk;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
  onDelete: (pending: PendingDelete) => void;
}) {
  const t = useTranslations('ascent');
  const [title, setTitle] = useState('');
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{t('settings.debtsHint')}</p>
      <ul className="space-y-2">
        {desk.customDebts.map((debt) => (
          <DebtEditor key={debt.id} debt={debt} onSave={(next) => onSave(() => patchDeskDebt(desk.challenge.id, debt.id, next))} onDelete={() => onDelete({ title: debt.title, run: () => deleteDeskDebt(desk.challenge.id, debt.id) })} />
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={title} placeholder={t('debtPlaceholder')} onChange={(event) => setTitle(event.target.value)} />
        <Button type="button" variant="outline" disabled={!title.trim()} onClick={() => void onSave(async () => {
          await createDeskDebt(desk.challenge.id, { title: title.trim(), required: true, sortOrder: desk.customDebts.length });
          setTitle('');
        })}>{t('settings.addDebt')}</Button>
      </div>
    </>
  );
  return <Section title={t('settings.debtsTitle')}>{body}</Section>;
}

function Restrictions({
  desk,
  onSave,
  onDelete,
}: {
  desk: AscentDesk;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
  onDelete: (pending: PendingDelete) => void;
}) {
  const t = useTranslations('ascent');
  const [title, setTitle] = useState('');
  const [unlock, setUnlock] = useState('0');
  const [bypass, setBypass] = useState(false);
  const [rewardId, setRewardId] = useState('');
  return (
    <Section title={t('settings.restrictionsTitle')} hint={t('settings.restrictionsHint')}>
      <ul className="space-y-3">
        {desk.restrictions.map((item) => (
          <RestrictionEditor
            key={item.id}
            item={item}
            rewards={desk.rewards}
            onSave={(body) => onSave(() => patchDeskRestriction(desk.challenge.id, item.id, body))}
            onDelete={item.kind === 'core_behavior' ? undefined : () => onDelete({ title: item.title, run: () => deleteDeskRestriction(desk.challenge.id, item.id) })}
          />
        ))}
      </ul>
      <div className="grid gap-3 rounded-xl border border-dashed p-3">
        <Input value={title} placeholder={t('restrictionPlaceholder')} onChange={(event) => setTitle(event.target.value)} />
        <Field label={t('settings.unlockDays')} hint={t('settings.unlockZero')}>
          <Input inputMode="numeric" value={unlock} onChange={(event) => setUnlock(event.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={bypass} onCheckedChange={(checked) => setBypass(checked === true)} />
          {t('settings.bypass')}
        </label>
        {bypass ? (
          <Select value={rewardId || undefined} onValueChange={setRewardId}>
            <SelectTrigger className="w-full"><SelectValue placeholder={t('settings.linkedReward')} /></SelectTrigger>
            <SelectContent>
              {desk.rewards.map((reward) => <SelectItem key={reward.id} value={reward.id}>{reward.title}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={!title.trim() || !/^\d+$/.test(unlock) || (bypass && !rewardId)}
          onClick={() => void onSave(async () => {
            await createDeskRestriction(desk.challenge.id, {
              title: title.trim(),
              kind: 'custom',
              unlockAfterSuccessfulDays: Number(unlock),
              bypassable: bypass,
              rewardId: bypass ? rewardId : null,
              required: true,
              active: true,
              sortOrder: desk.restrictions.length,
            });
            setTitle('');
            setUnlock('0');
            setBypass(false);
            setRewardId('');
          })}
        >
          {t('settings.addRestriction')}
        </Button>
      </div>
    </Section>
  );
}

function Activities({
  desk,
  onSave,
}: {
  desk: AscentDesk;
  onSave: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const t = useTranslations('ascent');
  const [draft, setDraft] = useState<{
    title: string;
    actionType: string;
    unit: (typeof XP_UNITS)[number];
    xp: string;
    quantity: string;
    minimum: string;
  }>({ title: '', actionType: '', unit: 'repetitions', xp: '', quantity: '', minimum: '0' });
  return (
    <Section title={t('settings.activitiesTitle')} hint={t('settings.activitiesHint')}>
      <ul className="space-y-3">
        {desk.activities.map((activity) => (
          <ActivityEditor key={activity.id} activity={activity} onSave={(body) => onSave(() => patchDeskActivity(activity.id, body))} />
        ))}
      </ul>
      <div className="grid gap-2 rounded-xl border border-dashed p-3 sm:grid-cols-2">
        <Input className="sm:col-span-2" value={draft.title} placeholder={t('activityPlaceholder')} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <Input value={draft.actionType} placeholder={t('settings.actionType')} onChange={(event) => setDraft({ ...draft, actionType: event.target.value })} />
        <UnitSelect value={draft.unit} onChange={(unit) => setDraft({ ...draft, unit })} />
        <Input inputMode="numeric" value={draft.xp} placeholder={t('settings.xpAmount')} onChange={(event) => setDraft({ ...draft, xp: event.target.value })} />
        <Input inputMode="decimal" value={draft.quantity} placeholder={t('settings.quantity')} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} />
        <Input inputMode="decimal" value={draft.minimum} placeholder={t('settings.minQuantity')} onChange={(event) => setDraft({ ...draft, minimum: event.target.value })} />
        <Button type="button" variant="outline" disabled={!activityDraftReady(draft)} onClick={() => void onSave(async () => {
          await createDeskActivity(desk.challenge.id, activityBody(draft, desk.activities.length));
          setDraft({ title: '', actionType: '', unit: 'repetitions', xp: '', quantity: '', minimum: '0' });
        })}>{t('settings.addActivity')}</Button>
      </div>
    </Section>
  );
}

function NamedEditor({
  title,
  description,
  onSave,
  onDelete,
}: {
  title: string;
  description: string;
  onSave: (body: { title: string; description: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const t = useTranslations('ascent');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title);
  const [text, setText] = useState(description);
  if (!open) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
        <span className="min-w-0 truncate text-sm">{title}</span>
        <span className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>{t('settings.edit')}</Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t('settings.delete')} onClick={onDelete}><Trash2 /></Button>
        </span>
      </li>
    );
  }
  return (
    <li className="space-y-2 rounded-xl border p-3">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <Input value={text} onChange={(event) => setText(event.target.value)} />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={!name.trim()} onClick={() => void onSave({ title: name.trim(), description: text.trim() }).then((saved) => { if (saved) setOpen(false); })}>{t('settings.save')}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>{t('settings.cancel')}</Button>
      </div>
    </li>
  );
}

function DebtEditor({ debt, onSave, onDelete }: { debt: DeskCustomDebt; onSave: (body: Record<string, unknown>) => Promise<boolean>; onDelete: () => void }) {
  const t = useTranslations('ascent');
  const [title, setTitle] = useState(debt.title);
  const [required, setRequired] = useState(debt.required);
  return (
    <li className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={required} onCheckedChange={(checked) => setRequired(checked === true)} />
        {t('settings.required')}
      </label>
      <span className="flex gap-1">
        <Button type="button" size="sm" disabled={!title.trim()} onClick={() => void onSave({ title: title.trim(), required })}>{t('settings.save')}</Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t('settings.delete')} onClick={onDelete}><Trash2 /></Button>
      </span>
    </li>
  );
}

function RestrictionEditor({
  item,
  rewards,
  onSave,
  onDelete,
}: {
  item: DeskRestriction;
  rewards: DeskReward[];
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
  onDelete?: () => void;
}) {
  const t = useTranslations('ascent');
  const core = item.kind === 'core_behavior';
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [unlock, setUnlock] = useState(String(item.unlockAfterSuccessfulDays));
  const [bypass, setBypass] = useState(item.bypassable);
  const [rewardId, setRewardId] = useState(item.rewardId ?? '');
  return (
    <li className="space-y-2 rounded-xl border p-3">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input value={description} onChange={(event) => setDescription(event.target.value)} />
      {core ? <p className="text-sm text-muted-foreground">{t('settings.coreLocked')}</p> : (
        <>
          <Input inputMode="numeric" value={unlock} aria-label={t('settings.unlockDays')} onChange={(event) => setUnlock(event.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={bypass} onCheckedChange={(checked) => setBypass(checked === true)} />
            {t('settings.bypass')}
          </label>
          {bypass ? (
            <Select value={rewardId || undefined} onValueChange={setRewardId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t('settings.linkedReward')} /></SelectTrigger>
              <SelectContent>
                {rewards.map((reward) => <SelectItem key={reward.id} value={reward.id}>{reward.title}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}
        </>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!title.trim() || (!core && (!/^\d+$/.test(unlock) || (bypass && !rewardId)))}
          onClick={() => void onSave(core
            ? { title: title.trim(), description: description.trim() }
            : {
                title: title.trim(),
                description: description.trim(),
                unlockAfterSuccessfulDays: Number(unlock),
                bypassable: bypass,
                rewardId: bypass ? rewardId : null,
                required: true,
                active: true,
              })}
        >
          {t('settings.save')}
        </Button>
        {onDelete ? <Button type="button" size="sm" variant="ghost" onClick={onDelete}>{t('settings.delete')}</Button> : null}
      </div>
    </li>
  );
}

function ActivityEditor({
  activity,
  onSave,
}: {
  activity: DeskActivity;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useTranslations('ascent');
  const [active, setActive] = useState(activity.active);
  const [draft, setDraft] = useState({
    title: activity.title,
    actionType: activity.actionType,
    unit: activity.unit,
    xp: String(activity.xpPerGrant),
    quantity: String(activity.quantityPerGrant),
    minimum: String(activity.minQuantity),
  });
  return (
    <li className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
      <Input className="sm:col-span-2" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      <Input value={draft.actionType} onChange={(event) => setDraft({ ...draft, actionType: event.target.value })} />
      <UnitSelect value={draft.unit} onChange={(unit) => setDraft({ ...draft, unit })} />
      <Input inputMode="numeric" value={draft.xp} aria-label={t('settings.xpAmount')} onChange={(event) => setDraft({ ...draft, xp: event.target.value })} />
      <Input inputMode="decimal" value={draft.quantity} aria-label={t('settings.quantity')} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} />
      <Input inputMode="decimal" value={draft.minimum} aria-label={t('settings.minQuantity')} onChange={(event) => setDraft({ ...draft, minimum: event.target.value })} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)} />
        {t('settings.active')}
      </label>
      <div className="sm:col-span-2">
        <Button
          type="button"
          size="sm"
          disabled={!activityDraftReady(draft)}
          onClick={() => void onSave({ ...activityBody(draft, activity.sortOrder), active })}
        >
          {t('settings.save')}
        </Button>
      </div>
    </li>
  );
}

function UnitSelect({ value, onChange }: { value: string; onChange: (value: (typeof XP_UNITS)[number]) => void }) {
  const t = useTranslations('ascent');
  return (
    <Select value={value} onValueChange={(next) => {
      const unit = XP_UNITS.find((item) => item === next);
      if (unit) onChange(unit);
    }}>
      <SelectTrigger className="w-full" aria-label={t('settings.unit')}><SelectValue /></SelectTrigger>
      <SelectContent>
        {XP_UNITS.map((unit) => <SelectItem key={unit} value={unit}>{t(`units.${unit}`)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function IconPicker({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const t = useTranslations('ascent');
  return (
    <div className="flex flex-wrap gap-1" aria-label={t('settings.rewardIcon')}>
      {REWARD_ICONS.map((item) => {
        const selected = value === item.name;
        const Icon = item.icon;
        return (
          <button
            key={item.name}
            type="button"
            aria-pressed={selected}
            aria-label={item.name}
            onClick={() => onChange(selected ? null : item.name)}
            className={cn('flex size-8 items-center justify-center rounded-md border', selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function decimal(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function activityDraftReady(draft: { title: string; actionType: string; xp: string; quantity: string; minimum: string }): boolean {
  return Boolean(draft.title.trim() && draft.actionType.trim() && /^\d+$/.test(draft.xp) && decimal(draft.quantity) != null && decimal(draft.minimum) != null);
}

function activityBody(draft: { title: string; actionType: string; unit: (typeof XP_UNITS)[number]; xp: string; quantity: string; minimum: string }, sortOrder: number) {
  return {
    title: draft.title.trim(),
    actionType: draft.actionType.trim(),
    unit: draft.unit,
    xpPerGrant: Number(draft.xp),
    quantityPerGrant: decimal(draft.quantity),
    minQuantity: decimal(draft.minimum),
    active: true,
    sortOrder,
  };
}
