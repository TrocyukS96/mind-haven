'use client';

import type { Habit } from '@/entities/habit/model/types';
import { fetchHabits } from '@/entities/habit/api/habit-client';
import {
  AscentRequestError,
  fetchAscentChallenges,
  setupAscentChallenge,
} from '@/features/ascent/api/ascent-client';
import {
  behaviorName,
  createClientKey,
  createInitialDraft,
  emptyActivity,
  emptyNamed,
  emptyRestriction,
  emptyReward,
  firstInvalidStep,
  issueCode,
  issuesForStep,
  moveByKey,
  removeByKey,
  parseWizardProgress,
  serializeWizardProgress,
  toSetupPayload,
  updateByKey,
  validateWizard,
  WizardInputError,
  WIZARD_BEHAVIOR_PRESETS,
  type WizardActivity,
  type WizardDraft,
  type WizardIssue,
  type WizardNamedItem,
  type WizardRestriction,
  type WizardReward,
  type WizardStep,
} from '@/features/ascent/model/wizard';
import { REWARD_ICONS, RewardIcon } from '@/features/ascent/ui/reward-icons';
import { useRouter } from '@/i18n/routing';
import { isCompatibleDailyHabit } from '@/shared/lib/ascent/habit-link';
import { formatLocalDate } from '@/shared/lib/ascent/local-date';
import { decodeWeeklyQuota } from '@/shared/lib/habit/habit-weekdays';
import { cn } from '@/shared/lib/utils';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Spinner } from '@/shared/ui/spinner';
import { Textarea } from '@/shared/ui/textarea';
import { XP_UNITS, type XpUnit } from '@/entities/ascent/model/types';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Coffee,
  Leaf,
  Plus,
  Shield,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const SETUP_KEY = 'mindhaven-ascent-setup-key';
const DRAFT_KEY = 'mindhaven-ascent-wizard-draft';
const FIELD_ANCHOR = 'scroll-mt-24 scroll-mb-28';

type Phase = 'loading' | 'form';

export function AscentWizard() {
  const t = useTranslations('ascent');
  const router = useRouter();
  const tCommon = useTranslations('common');
  const openHabitForm = useStore((state) => state.openHabitForm);
  const habitFormOpen = useStore((state) => state.isHabitFormOpen);
  const labels = useMemo(
    () => ({
      porn: t('behaviors.porn'),
      smoking: t('behaviors.smoking'),
      overeating: t('behaviors.overeating'),
      alcohol: t('behaviors.alcohol'),
      social_media: t('behaviors.social_media'),
    }),
    [t]
  );

  const [phase, setPhase] = useState<Phase>('loading');
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [step, setStep] = useState<WizardStep>(0);
  const [issues, setIssues] = useState<WizardIssue[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  const [habitsError, setHabitsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ title: string; apply: () => void } | null>(null);
  const submitLock = useRef(false);
  const persistDraft = useRef(true);
  const habitFormWasOpen = useRef(false);
  const habitsReady = useRef(false);
  const knownHabitIds = useRef<Set<string>>(new Set());
  const scrollField = useRef<string | null>(null);
  const [scrollToken, setScrollToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const challenges = await fetchAscentChallenges();
        const active = challenges.find((item) => item.status === 'active');
        if (cancelled) return;
        if (!active) {
          const stored = readWizardDraft();
          setDraft(stored?.draft ?? createInitialDraft());
          if (stored) setStep(stored.step);
          setPhase('form');
          return;
        }
        clearWizardDraft();
        router.replace('/ascent');
      } catch (error) {
        if (cancelled) return;
        const stored = readWizardDraft();
        setDraft(stored?.draft ?? createInitialDraft());
        if (stored) setStep(stored.step);
        setPhase('form');
        if (error instanceof AscentRequestError && error.status !== 401) setLoadWarning(true);
        if (error instanceof AscentRequestError && error.status === 401) setApiError('unauthorized');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const reloadHabits = async (selectNew: boolean) => {
    setHabitsLoading(true);
    setHabitsError(false);
    try {
      const next = await fetchHabits();
      setHabits(next);
      if (selectNew && habitsReady.current) {
        const createdIds = next
          .filter((habit) => !knownHabitIds.current.has(habit.id) && isCompatibleDailyHabit(habit.frequency))
          .map((habit) => habit.id);
        if (createdIds.length > 0) {
          setDraft((current) =>
            current
              ? { ...current, habitIds: [...current.habitIds, ...createdIds.filter((id) => !current.habitIds.includes(id))] }
              : current
          );
        }
      }
      knownHabitIds.current = new Set(next.map((habit) => habit.id));
      habitsReady.current = true;
    } catch {
      setHabitsError(true);
    } finally {
      setHabitsLoading(false);
    }
  };

  useEffect(() => {
    void reloadHabits(false);
  }, []);

  useEffect(() => {
    if (!persistDraft.current || phase !== 'form' || !draft) return;
    writeWizardDraft(step, draft);
  }, [phase, draft, step]);

  useEffect(() => {
    if (scrollToken === 0) return;
    const field = scrollField.current;
    const frame = requestAnimationFrame(() => scrollWizard(field));
    return () => cancelAnimationFrame(frame);
  }, [scrollToken]);

  useEffect(() => {
    if (habitFormWasOpen.current && !habitFormOpen) void reloadHabits(true);
    habitFormWasOpen.current = habitFormOpen;
  }, [habitFormOpen]);

  const today = draft ? safeToday(draft.timezone) : '';
  const name = draft ? behaviorName(draft, labels) : '';
  const habitRefs = habits.map((habit) => ({ id: habit.id, frequency: habit.frequency }));

  function confirmRemove(title: string, apply: () => void) {
    if (!title.trim()) {
      apply();
      return;
    }
    setPendingDelete({ title: title.trim(), apply });
  }

  function reveal(field: string | null) {
    scrollField.current = field;
    setScrollToken((token) => token + 1);
  }

  function goTo(next: WizardStep) {
    if (next > step || next === step) return;
    reveal(null);
    setStep(next);
  }

  function goNext() {
    if (!draft) return;
    const nextIssues = issuesForStep(
      validateWizard(draft, today, { behaviorName: name, habits: habitRefs, now: new Date() }),
      step
    );
    if (nextIssues.length > 0) {
      reveal(nextIssues[0]?.field ?? null);
      setIssues(nextIssues);
      return;
    }
    reveal(null);
    setIssues([]);
    setStep((current) => (current < 4 ? ((current + 1) as WizardStep) : current));
  }

  async function submit() {
    if (!draft || submitLock.current) return;
    const nextIssues = validateWizard(draft, today, {
      acceptance: true,
      behaviorName: name,
      habits: habitRefs,
      now: new Date(),
    });
    setIssues(nextIssues);
    const invalid = firstInvalidStep(nextIssues);
    if (invalid != null) {
      reveal(nextIssues.find((item) => item.step === invalid)?.field ?? null);
      setStep(invalid);
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setApiError(null);
    let finished = false;
    try {
      await setupAscentChallenge(
        toSetupPayload(draft, { idempotencyKey: readSetupKey(), today, labels, habits: habitRefs })
      );
      persistDraft.current = false;
      clearWizardDraft();
      clearSetupKey();
      router.replace('/ascent');
      finished = true;
    } catch (error) {
      if (error instanceof WizardInputError) {
        setIssues([...error.issues]);
        const invalid = firstInvalidStep(error.issues);
        if (invalid != null) {
          reveal(error.issues.find((item) => item.step === invalid)?.field ?? null);
          setStep(invalid);
        }
        return;
      }
      if (error instanceof AscentRequestError && error.status === 409 && error.code === 'active_challenge_exists') {
        persistDraft.current = false;
        clearWizardDraft();
        clearSetupKey();
        router.replace('/ascent');
        finished = true;
        return;
      }
      if (error instanceof AscentRequestError && error.code) setApiError(error.code);
      else setApiError('generic');
    } finally {
      if (!finished) {
        submitLock.current = false;
        setSaving(false);
      }
    }
  }

  if (phase === 'loading' || (phase === 'form' && !draft)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!draft) return null;

  const stepIssues = issues.filter((issue) => issue.step === step);
  const stepTitles = [t('steps.goal'), t('steps.rewards'), t('steps.triggers'), t('steps.habits'), t('steps.rules')];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1>{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('progress', { step: step + 1, total: 5 })}</p>
      </div>

      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {stepTitles.map((label, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => goTo(index as WizardStep)}
                disabled={index > step}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'flex h-full w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] leading-tight sm:text-xs',
                  current && 'bg-primary text-primary-foreground',
                  done && 'bg-primary/10 text-foreground hover:bg-primary/15',
                  !current && !done && 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    current ? 'bg-primary-foreground/15' : 'bg-background'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="line-clamp-2">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {loadWarning ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {t('apiErrors.load')}
        </p>
      ) : null}
      {apiError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {apiMessage(t, apiError)}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <StepIcon step={step} />
            <h2 className="text-lg font-semibold">{stepTitles[step]}</h2>
          </div>
          {step === 0 ? <GoalStep draft={draft} issues={stepIssues} onChange={setDraft} today={today} /> : null}
          {step === 1 ? (
            <RewardsStep draft={draft} issues={stepIssues} onChange={setDraft} onRemove={confirmRemove} />
          ) : null}
          {step === 2 ? (
            <NamedStep
              items={draft.triggers}
              issues={stepIssues}
              prefix="trigger"
              emptyIcon={Zap}
              emptyTitle={t('triggersEmptyTitle')}
              emptyBody={t('triggersEmptyBody')}
              addLabel={t('addTrigger')}
              titlePlaceholder={t('triggerPlaceholder')}
              onChange={(triggers) => setDraft({ ...draft, triggers })}
              onRemove={confirmRemove}
            />
          ) : null}
          {step === 3 ? (
            <HabitsStep
              draft={draft}
              habits={habits}
              issues={stepIssues}
              loading={habitsLoading}
              failed={habitsError}
              onChange={setDraft}
              onCreate={() => openHabitForm()}
              onReload={() => void reloadHabits(false)}
            />
          ) : null}
          {step === 4 ? (
            <RulesStep
              draft={draft}
              issues={stepIssues}
              behavior={name}
              onChange={setDraft}
              onRemove={confirmRemove}
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-between sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => goTo((step > 0 ? step - 1 : 0) as WizardStep)}>
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <Button type="button" onClick={goNext}>
            {t('next')}
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} loading={saving}>
            {t('start')}
          </Button>
        )}
      </div>

      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteBody', { name: pendingDelete?.title ?? '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingDelete?.apply();
                setPendingDelete(null);
              }}
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GoalStep({
  draft,
  issues,
  onChange,
  today,
}: {
  draft: WizardDraft;
  issues: readonly WizardIssue[];
  onChange: (draft: WizardDraft) => void;
  today: string;
}) {
  const t = useTranslations('ascent');
  const patch = (partial: Partial<WizardDraft>) => onChange({ ...draft, ...partial });

  return (
    <div className="space-y-5">
      <Field field="title" label={t('challengeTitle')} htmlFor="ascent-title" code={issueCode(issues, 'title')}>
        <Input
          id="ascent-title"
          value={draft.title}
          placeholder={t('challengeTitlePlaceholder')}
          maxLength={120}
          aria-invalid={Boolean(issueCode(issues, 'title'))}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>

      <Field field="behavior" label={t('behavior')} code={issueCode(issues, 'behavior')}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {WIZARD_BEHAVIOR_PRESETS.map((preset) => {
            const selected = draft.behaviorPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={() => patch({ behaviorPreset: preset })}
                className={choiceClass(selected)}
              >
                {t(`behaviors.${preset}`)}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={draft.behaviorPreset === 'other'}
            onClick={() => patch({ behaviorPreset: 'other' })}
            className={choiceClass(draft.behaviorPreset === 'other')}
          >
            {t('behaviors.other')}
          </button>
        </div>
        {draft.behaviorPreset === 'other' ? (
          <Input
            value={draft.customBehavior}
            placeholder={t('behaviorOtherPlaceholder')}
            maxLength={120}
            aria-invalid={Boolean(issueCode(issues, 'behavior'))}
            onChange={(event) => patch({ customBehavior: event.target.value })}
          />
        ) : null}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field field="yearsStruggling" label={t('years')} htmlFor="ascent-years" hint={t('optional')} code={issueCode(issues, 'yearsStruggling')}>
          <Input
            id="ascent-years"
            inputMode="numeric"
            value={draft.yearsStruggling}
            placeholder="0"
            aria-invalid={Boolean(issueCode(issues, 'yearsStruggling'))}
            onChange={(event) => patch({ yearsStruggling: event.target.value })}
          />
        </Field>
        <Field field="targetDays" label={t('targetDays')} htmlFor="ascent-days" code={issueCode(issues, 'targetDays')}>
          <Input
            id="ascent-days"
            inputMode="numeric"
            value={draft.targetDays}
            aria-invalid={Boolean(issueCode(issues, 'targetDays'))}
            onChange={(event) => patch({ targetDays: event.target.value })}
          />
        </Field>
      </div>

      <Field field="description" label={t('why')} htmlFor="ascent-why" hint={t('optional')} code={issueCode(issues, 'description')}>
        <Textarea
          id="ascent-why"
          value={draft.description}
          rows={4}
          aria-invalid={Boolean(issueCode(issues, 'description'))}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>

      <Field field="importance" label={t('importance')} code={issueCode(issues, 'importance')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('importanceHint')}</p>
          <span className="min-w-12 text-right text-lg font-semibold tabular-nums">{draft.importance}</span>
        </div>
        <Slider
          value={[draft.importance]}
          min={0}
          max={100}
          step={1}
          aria-label={t('importance')}
          onValueChange={([value]) => patch({ importance: value ?? draft.importance })}
        />
      </Field>

      <Field field="startDate" label={t('startDate')} htmlFor="ascent-start" code={issueCode(issues, 'startDate')}>
        <Input
          id="ascent-start"
          type="date"
          min={today}
          value={draft.startDate}
          aria-invalid={Boolean(issueCode(issues, 'startDate'))}
          onChange={(event) => patch({ startDate: event.target.value })}
        />
      </Field>

      <div className="rounded-xl border px-4 py-3">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={draft.specifyAbstinence}
            onCheckedChange={(checked) => patch({ specifyAbstinence: checked === true })}
          />
          <span>
            <span className="block text-sm font-medium">{t('abstinenceToggle')}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{t('abstinenceHint')}</span>
          </span>
        </label>
        {draft.specifyAbstinence ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field field="abstinenceDate" label={t('abstinenceDate')} htmlFor="ascent-abstinence-date" code={issueCode(issues, 'abstinenceDate')}>
              <Input
                id="ascent-abstinence-date"
                type="date"
                max={today}
                value={draft.abstinenceDate}
                aria-invalid={Boolean(issueCode(issues, 'abstinenceDate'))}
                onChange={(event) => patch({ abstinenceDate: event.target.value })}
              />
            </Field>
            <Field field="abstinenceTime" label={t('abstinenceTime')} htmlFor="ascent-abstinence-time" code={issueCode(issues, 'abstinenceTime')}>
              <Input
                id="ascent-abstinence-time"
                type="time"
                value={draft.abstinenceTime}
                aria-invalid={Boolean(issueCode(issues, 'abstinenceTime'))}
                onChange={(event) => patch({ abstinenceTime: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <div className={cn('rounded-xl border bg-muted/40 px-4 py-3', FIELD_ANCHOR)} data-ascent-field="timezone">
        <p className="text-sm font-medium">{t('timezone')}</p>
        <p className="mt-1 font-mono text-sm">{draft.timezone}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('timezoneHint')}</p>
      </div>
    </div>
  );
}

function RewardsStep({
  draft,
  issues,
  onChange,
  onRemove,
}: {
  draft: WizardDraft;
  issues: readonly WizardIssue[];
  onChange: (draft: WizardDraft) => void;
  onRemove: (title: string, apply: () => void) => void;
}) {
  const t = useTranslations('ascent');
  const setRewards = (rewards: WizardReward[]) => {
    const keys = new Set(rewards.map((reward) => reward.key));
    onChange({
      ...draft,
      rewards,
      restrictions: draft.restrictions.map((item) =>
        item.rewardKey && !keys.has(item.rewardKey) ? { ...item, rewardKey: '' } : item
      ),
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('rewardsHint')}</p>
      {draft.rewards.length === 0 ? (
        <DashedEmpty icon={Coffee} title={t('rewardsEmptyTitle')} body={t('rewardsEmptyBody')} />
      ) : (
        draft.rewards.map((reward, index) => (
          <article key={reward.key} className="space-y-3 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RewardIcon name={reward.icon} className="size-4" />
                {reward.icon ? null : <Coffee className="size-4" aria-hidden />}
              </div>
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_7rem]">
                <Input
                  className={FIELD_ANCHOR}
                  data-ascent-field={`reward:${reward.key}:title`}
                  value={reward.title}
                  placeholder={t('rewardTitlePlaceholder')}
                  aria-label={t('rewardTitle')}
                  aria-invalid={Boolean(issueCode(issues, `reward:${reward.key}:title`))}
                  onChange={(event) => setRewards(updateByKey(draft.rewards, reward.key, { title: event.target.value }))}
                />
                <Input
                  className={FIELD_ANCHOR}
                  data-ascent-field={`reward:${reward.key}:xpCost`}
                  inputMode="numeric"
                  value={reward.xpCost}
                  placeholder="70"
                  aria-label={t('xpCost')}
                  aria-invalid={Boolean(issueCode(issues, `reward:${reward.key}:xpCost`))}
                  onChange={(event) => setRewards(updateByKey(draft.rewards, reward.key, { xpCost: event.target.value }))}
                />
              </div>
              <ItemActions
                index={index}
                total={draft.rewards.length}
                onUp={() => setRewards(moveByKey(draft.rewards, reward.key, -1))}
                onDown={() => setRewards(moveByKey(draft.rewards, reward.key, 1))}
                onDelete={() =>
                  onRemove(reward.title, () => setRewards(removeByKey(draft.rewards, reward.key)))
                }
              />
            </div>
            <FieldError code={issueCode(issues, `reward:${reward.key}:title`) ?? issueCode(issues, `reward:${reward.key}:xpCost`)} />
            <Input
              value={reward.description}
              placeholder={t('descriptionOptional')}
              aria-label={t('descriptionOptional')}
              onChange={(event) => setRewards(updateByKey(draft.rewards, reward.key, { description: event.target.value }))}
            />
            <div className={cn('flex flex-wrap gap-1', FIELD_ANCHOR)} data-ascent-field={`reward:${reward.key}:icon`}>
              {REWARD_ICONS.map((item) => {
                const selected = reward.icon === item.name;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={selected}
                    aria-label={item.name}
                    onClick={() => setRewards(updateByKey(draft.rewards, reward.key, { icon: selected ? null : item.name }))}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
            </div>
          </article>
        ))
      )}
      <Button type="button" variant="outline" onClick={() => setRewards([...draft.rewards, emptyReward()])}>
        <Plus />
        {t('addReward')}
      </Button>
    </div>
  );
}

function NamedStep({
  items,
  issues,
  prefix,
  emptyIcon,
  emptyTitle,
  emptyBody,
  addLabel,
  titlePlaceholder,
  onChange,
  onRemove,
}: {
  items: WizardNamedItem[];
  issues: readonly WizardIssue[];
  prefix: 'trigger' | 'debt';
  emptyIcon: typeof Zap;
  emptyTitle: string;
  emptyBody: string;
  addLabel: string;
  titlePlaceholder: string;
  onChange: (items: WizardNamedItem[]) => void;
  onRemove: (title: string, apply: () => void) => void;
}) {
  const t = useTranslations('ascent');
  return (
    <div className="space-y-3">
      {items.length === 0 ? <DashedEmpty icon={emptyIcon} title={emptyTitle} body={emptyBody} /> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.key} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start gap-2">
              <Input
                className={FIELD_ANCHOR}
                data-ascent-field={`${prefix}:${item.key}:title`}
                value={item.title}
                placeholder={titlePlaceholder}
                aria-label={t('itemTitle')}
                aria-invalid={Boolean(issueCode(issues, `${prefix}:${item.key}:title`))}
                onChange={(event) => onChange(updateByKey(items, item.key, { title: event.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('remove')}
                onClick={() => onRemove(item.title, () => onChange(removeByKey(items, item.key)))}
              >
                <Trash2 />
              </Button>
            </div>
            <FieldError code={issueCode(issues, `${prefix}:${item.key}:title`)} />
            <Input
              className={FIELD_ANCHOR}
              data-ascent-field={`${prefix}:${item.key}:description`}
              value={item.description}
              placeholder={t('descriptionOptional')}
              aria-label={t('descriptionOptional')}
              aria-invalid={Boolean(issueCode(issues, `${prefix}:${item.key}:description`))}
              onChange={(event) => onChange(updateByKey(items, item.key, { description: event.target.value }))}
            />
          </article>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={() => onChange([...items, emptyNamed()])}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}

function HabitsStep({
  draft,
  habits,
  issues,
  loading,
  failed,
  onChange,
  onCreate,
  onReload,
}: {
  draft: WizardDraft;
  habits: Habit[];
  issues: readonly WizardIssue[];
  loading: boolean;
  failed: boolean;
  onChange: (draft: WizardDraft) => void;
  onCreate: () => void;
  onReload: () => void;
}) {
  const t = useTranslations('ascent');
  const selected = draft.habitIds
    .map((id) => habits.find((habit) => habit.id === id))
    .filter((habit): habit is Habit => Boolean(habit));

  function toggle(id: string) {
    const habitIds = draft.habitIds.includes(id)
      ? draft.habitIds.filter((item) => item !== id)
      : [...draft.habitIds, id];
    onChange({ ...draft, habitIds });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('habitsHint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCreate}>
          <Plus />
          {t('createHabit')}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t('habitsLoading')}
        </div>
      ) : null}
      {failed ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive" role="alert">{t('habitsError')}</p>
          <Button type="button" variant="outline" size="sm" onClick={onReload}>{t('retry')}</Button>
        </div>
      ) : null}
      {!loading && !failed && selected.length === 0 && habits.length === 0 ? (
        <DashedEmpty icon={Leaf} title={t('habitsEmptyTitle')} body={t('habitsEmptyBody')} />
      ) : null}
      {selected.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('selectedHabits')}</p>
          {selected.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between gap-3 rounded-xl border bg-primary/5 px-3 py-2">
              <span className="min-w-0 truncate text-sm font-medium">{habit.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => toggle(habit.id)}>
                {t('unlink')}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {habits.length > 0 ? (
        <div className="space-y-2">
          {habits.map((habit) => {
            const compatible = isCompatibleDailyHabit(habit.frequency);
            const checked = draft.habitIds.includes(habit.id);
            return (
              <label
                key={habit.id}
                data-ascent-field={`habit:${habit.id}`}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3 py-2',
                  FIELD_ANCHOR,
                  compatible ? 'cursor-pointer hover:bg-accent/50' : 'opacity-70'
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={!compatible}
                  onCheckedChange={() => compatible && toggle(habit.id)}
                  aria-label={habit.name}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{habit.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {compatible
                      ? t('habitDaily')
                      : decodeWeeklyQuota(habit.frequency)
                        ? t('habitQuota')
                        : t('habitWeekdays')}
                  </span>
                  <FieldError code={issueCode(issues, `habit:${habit.id}`)} />
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RulesStep({
  draft,
  issues,
  behavior,
  onChange,
  onRemove,
}: {
  draft: WizardDraft;
  issues: readonly WizardIssue[];
  behavior: string;
  onChange: (draft: WizardDraft) => void;
  onRemove: (title: string, apply: () => void) => void;
}) {
  const t = useTranslations('ascent');
  const setRestrictions = (restrictions: WizardRestriction[]) => onChange({ ...draft, restrictions });
  const pricedRewards = draft.rewards.filter((reward) => reward.title.trim());

  return (
    <div className="space-y-6">
      <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">{t('coreRule', { behavior: behavior || t('behavior') })}</p>
      <section className="space-y-3">
        <h3 className="font-medium">{t('restrictionsTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('unlockHint')}</p>
        {draft.restrictions.length === 0 ? (
          <DashedEmpty icon={Shield} title={t('restrictionsEmptyTitle')} body={t('restrictionsEmptyBody')} />
        ) : (
          draft.restrictions.map((restriction, index) => {
            const linked = pricedRewards.find((reward) => reward.key === restriction.rewardKey);
            return (
              <article key={restriction.key} className="space-y-3 rounded-xl border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    className={FIELD_ANCHOR}
                    data-ascent-field={`restriction:${restriction.key}:title`}
                    value={restriction.title}
                    placeholder={t('restrictionPlaceholder')}
                    aria-label={t('itemTitle')}
                    aria-invalid={Boolean(issueCode(issues, `restriction:${restriction.key}:title`))}
                    onChange={(event) =>
                      setRestrictions(updateByKey(draft.restrictions, restriction.key, { title: event.target.value }))
                    }
                  />
                  <ItemActions
                    index={index}
                    total={draft.restrictions.length}
                    onUp={() => setRestrictions(moveByKey(draft.restrictions, restriction.key, -1))}
                    onDown={() => setRestrictions(moveByKey(draft.restrictions, restriction.key, 1))}
                    onDelete={() =>
                      onRemove(restriction.title, () => setRestrictions(removeByKey(draft.restrictions, restriction.key)))
                    }
                  />
                </div>
                <FieldError code={issueCode(issues, `restriction:${restriction.key}:title`)} />
                <Field field={`restriction:${restriction.key}:unlock`} label={t('unlockDays')} htmlFor={`unlock-${restriction.key}`} code={issueCode(issues, `restriction:${restriction.key}:unlock`)}>
                  <Input
                    id={`unlock-${restriction.key}`}
                    inputMode="numeric"
                    value={restriction.unlockAfterSuccessfulDays}
                    onChange={(event) =>
                      setRestrictions(
                        updateByKey(draft.restrictions, restriction.key, { unlockAfterSuccessfulDays: event.target.value })
                      )
                    }
                  />
                </Field>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={restriction.bypassable}
                    onCheckedChange={(checked) =>
                      setRestrictions(
                        updateByKey(draft.restrictions, restriction.key, {
                          bypassable: checked === true,
                          rewardKey: checked === true ? restriction.rewardKey : '',
                        })
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{t('bypass')}</span>
                    <span className="mt-1 block text-muted-foreground">{t('bypassHint')}</span>
                  </span>
                </label>
                {restriction.bypassable ? (
                  <Field field={`restriction:${restriction.key}:reward`} label={t('linkedReward')} code={issueCode(issues, `restriction:${restriction.key}:reward`)}>
                    <Select
                      value={restriction.rewardKey || undefined}
                      onValueChange={(value) =>
                        setRestrictions(updateByKey(draft.restrictions, restriction.key, { rewardKey: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('linkedRewardPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {pricedRewards.map((reward) => (
                          <SelectItem key={reward.key} value={reward.key}>
                            {reward.title} · {reward.xpCost || '0'} XP
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {linked ? <p className="text-xs text-muted-foreground">{t('bypassPrice', { xp: linked.xpCost || '0' })}</p> : null}
                  </Field>
                ) : null}
              </article>
            );
          })
        )}
        <Button type="button" variant="outline" onClick={() => setRestrictions([...draft.restrictions, emptyRestriction()])}>
          <Plus />
          {t('addRestriction')}
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t('debtsTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('debtsHint')}</p>
        <NamedStep
          items={draft.customDebts}
          issues={issues}
          prefix="debt"
          emptyIcon={Target}
          emptyTitle={t('debtsEmptyTitle')}
          emptyBody={t('debtsEmptyBody')}
          addLabel={t('addDebt')}
          titlePlaceholder={t('debtPlaceholder')}
          onChange={(customDebts) => onChange({ ...draft, customDebts })}
          onRemove={onRemove}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t('earnTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('earnHint')}</p>
        {draft.activities.length === 0 ? (
          <DashedEmpty icon={Zap} title={t('earnEmptyTitle')} body={t('earnEmptyBody')} />
        ) : (
          draft.activities.map((activity) => (
            <ActivityCard
              key={activity.key}
              activity={activity}
              issues={issues}
              onChange={(next) => onChange({ ...draft, activities: updateByKey(draft.activities, activity.key, next) })}
              onDelete={() =>
                onRemove(activity.title, () => onChange({ ...draft, activities: removeByKey(draft.activities, activity.key) }))
              }
            />
          ))
        )}
        <Button type="button" variant="outline" onClick={() => onChange({ ...draft, activities: [...draft.activities, emptyActivity()] })}>
          <Plus />
          {t('addActivity')}
        </Button>
      </section>

      <section className="space-y-4 rounded-xl border p-4">
        <h3 className="font-medium">{t('previewTitle')}</h3>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <PreviewItem label={t('challengeTitle')} value={draft.title.trim() || '—'} />
          <PreviewItem label={t('targetDays')} value={draft.targetDays || '—'} />
          <PreviewItem label={t('behavior')} value={behavior || '—'} />
          <PreviewItem label={t('summaryRewards')} value={String(draft.rewards.length)} />
          <PreviewItem label={t('summaryTriggers')} value={String(draft.triggers.length)} />
          <PreviewItem label={t('summaryHabits')} value={String(draft.habitIds.length)} />
          <PreviewItem label={t('summaryRestrictions')} value={String(draft.restrictions.length)} />
          <PreviewItem label={t('summaryActivities')} value={String(draft.activities.length)} />
          <PreviewItem label={t('summaryDebts')} value={String(draft.customDebts.length)} />
        </dl>
        <p className="text-sm leading-6">{t('rulesText')}</p>
        <label className={cn('flex items-start gap-3 text-sm', FIELD_ANCHOR)} data-ascent-field="acceptedRules">
          <Checkbox
            checked={draft.acceptedRules}
            onCheckedChange={(checked) => onChange({ ...draft, acceptedRules: checked === true })}
            aria-invalid={Boolean(issueCode(issues, 'acceptedRules'))}
          />
          <span>{t('accept')}</span>
        </label>
        <FieldError code={issueCode(issues, 'acceptedRules')} />
      </section>
    </div>
  );
}

function ActivityCard({
  activity,
  issues,
  onChange,
  onDelete,
}: {
  activity: WizardActivity;
  issues: readonly WizardIssue[];
  onChange: (patch: Partial<WizardActivity>) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('ascent');
  const ruleInvalid = Boolean(issueCode(issues, `activity:${activity.key}:rule`));
  return (
    <article className="space-y-3 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <Input
          className={FIELD_ANCHOR}
          data-ascent-field={`activity:${activity.key}:title`}
          value={activity.title}
          placeholder={t('activityPlaceholder')}
          aria-label={t('itemTitle')}
          aria-invalid={Boolean(issueCode(issues, `activity:${activity.key}:title`))}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
      <div className={cn('grid gap-2 sm:grid-cols-2', FIELD_ANCHOR)} data-ascent-field={`activity:${activity.key}:rule`}>
        <Field field={`activity:${activity.key}:actionType`} label={t('actionType')} htmlFor={`type-${activity.key}`} code={issueCode(issues, `activity:${activity.key}:actionType`)}>
          <Input
            id={`type-${activity.key}`}
            value={activity.actionType}
            placeholder={t('actionTypePlaceholder')}
            aria-invalid={Boolean(issueCode(issues, `activity:${activity.key}:actionType`))}
            onChange={(event) => onChange({ actionType: event.target.value })}
          />
        </Field>
        <Field label={t('unit')}>
          <Select value={activity.unit} onValueChange={(value) => onChange({ unit: value as XpUnit })}>
            <SelectTrigger id={`unit-${activity.key}`} className="w-full" aria-invalid={ruleInvalid}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {XP_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>{t(`units.${unit}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('xpAmount')} htmlFor={`xp-${activity.key}`}>
          <Input id={`xp-${activity.key}`} inputMode="numeric" value={activity.xpPerGrant} placeholder="40" aria-invalid={ruleInvalid} onChange={(event) => onChange({ xpPerGrant: event.target.value })} />
        </Field>
        <Field label={t('quantity')} htmlFor={`qty-${activity.key}`}>
          <Input id={`qty-${activity.key}`} inputMode="decimal" value={activity.quantityPerGrant} placeholder="100" aria-invalid={ruleInvalid} onChange={(event) => onChange({ quantityPerGrant: event.target.value })} />
        </Field>
        <Field label={t('minQuantity')} htmlFor={`min-${activity.key}`}>
          <Input id={`min-${activity.key}`} inputMode="decimal" value={activity.minQuantity} placeholder="1" aria-invalid={ruleInvalid} onChange={(event) => onChange({ minQuantity: event.target.value })} />
        </Field>
      </div>
      <FieldError code={issueCode(issues, `activity:${activity.key}:title`) ?? issueCode(issues, `activity:${activity.key}:rule`)} />
    </article>
  );
}

function ItemActions({
  index,
  total,
  onUp,
  onDown,
  onDelete,
}: {
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('ascent');
  return (
    <div className="flex shrink-0">
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t('moveUp')} disabled={index === 0} onClick={onUp}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t('moveDown')} disabled={index === total - 1} onClick={onDown}>
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={t('remove')} onClick={onDelete}>
        <Trash2 />
      </Button>
    </div>
  );
}

function Field({
  field,
  label,
  htmlFor,
  hint,
  code,
  children,
}: {
  field?: string;
  label: string;
  htmlFor?: string;
  hint?: string;
  code?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', field ? FIELD_ANCHOR : null)} data-ascent-field={field}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      <FieldError code={code} />
    </div>
  );
}

function FieldError({ code }: { code?: string | null }) {
  const t = useTranslations('ascent');
  if (!code) return null;
  return <p className="text-sm text-destructive" role="alert">{t(`errors.${code}`)}</p>;
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function DashedEmpty({ icon, title, body }: { icon: typeof Coffee; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed">
      <EmptyState icon={icon} title={title} description={body} compact showCard={false} />
    </div>
  );
}

function StepIcon({ step }: { step: WizardStep }) {
  const Icon = [Target, Coffee, Zap, Leaf, Shield][step] ?? Target;
  return (
    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" />
    </span>
  );
}

function choiceClass(selected: boolean) {
  return cn(
    'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
    selected ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-accent'
  );
}

function safeToday(timeZone: string): string {
  try {
    return formatLocalDate(new Date(), timeZone);
  } catch {
    return '';
  }
}

function readWizardDraft(): { step: WizardStep; draft: WizardDraft } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? parseWizardProgress(raw) : null;
  } catch {
    return null;
  }
}

function writeWizardDraft(step: WizardStep, draft: WizardDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, serializeWizardProgress(step, draft));
  } catch {
    // A private window or a full disk should not block the form.
  }
}

function clearWizardDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // The in-memory draft is still cleared by leaving the wizard.
  }
}

function findAscentField(field: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>('[data-ascent-field]');
  for (const node of nodes) {
    if (node.getAttribute('data-ascent-field') === field) return node;
  }
  return null;
}

function scrollWizard(field: string | null) {
  const target = field ? findAscentField(field) : null;
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const control = target.matches('[aria-invalid="true"]')
      ? target
      : target.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        (target.matches('input, textarea, select, button')
          ? target
          : target.querySelector<HTMLElement>('input, textarea, select, button'));
    control?.focus({ preventScroll: true });
    return;
  }
  document.getElementById('app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function readSetupKey(): string {
  try {
    const current = sessionStorage.getItem(SETUP_KEY);
    if (current && /^[A-Za-z0-9_-]{8,80}$/.test(current)) return current;
    const next = createClientKey();
    sessionStorage.setItem(SETUP_KEY, next);
    return next;
  } catch {
    return createClientKey();
  }
}

function clearSetupKey() {
  try {
    sessionStorage.removeItem(SETUP_KEY);
  } catch {
    // The active-challenge constraint still blocks a second create.
  }
}

function apiMessage(translate: { (key: string): string; has: (key: string) => boolean }, code: string) {
  const key = `apiErrors.${code}`;
  return translate.has(key) ? translate(key) : translate('apiErrors.generic');
}
