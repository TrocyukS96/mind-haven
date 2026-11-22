'use client';

import type { Habit } from '@/entities/habit/model/types';
import { setHabitDayCountRequest, toggleHabitDayRequest } from '@/entities/habit/api/habit-client';
import { SignInButton } from '@/features/auth';
import {
  confirmAscentDebt,
  loadAscentHistory,
  loadAscentHome,
  type AscentChallengeView,
  type AscentDebtView,
  type AscentHistoryView,
  type AscentScreenData,
} from '@/features/ascent/api/ascent-home';
import { AscentRequestError } from '@/features/ascent/api/ascent-client';
import { AscentCalendar } from '@/features/ascent/ui/ascent-calendar';
import { AscentClockCard } from '@/features/ascent/ui/ascent-clock';
import { AscentDebt } from '@/features/ascent/ui/ascent-debt';
import { AscentRestrictions, AscentXpCard } from '@/features/ascent/ui/ascent-restrictions';
import { Link } from '@/i18n/routing';
import type { AscentClock } from '@/shared/lib/ascent/abstinence';
import { formatLocalDate } from '@/shared/lib/ascent/local-date';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Settings } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

export function AscentHome() {
  const t = useTranslations('ascent');
  const hydrateHabits = useStore((state) => state.hydrateHabits);
  const requestId = useRef(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [screen, setScreen] = useState<AscentScreenData | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [refreshError, setRefreshError] = useState(false);

  const hasScreen = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const id = ++requestId.current;
      try {
        const next = await loadAscentHome();
        if (requestId.current !== id) return;
        if (next.kind === 'active' && next.habits.length > 0) hydrateHabits(next.habits);
        hasScreen.current = true;
        setScreen(next);
        setFailure(null);
        setRefreshError(false);
        setStatus('ready');
      } catch (error) {
        if (requestId.current !== id) return;
        if (mode === 'initial' || !hasScreen.current) {
          setFailure(error);
          setStatus('error');
          return;
        }
        setRefreshError(true);
      }
    },
    [hydrateHabits]
  );

  useEffect(() => {
    const id = ++requestId.current;
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadAscentHome();
        if (cancelled || requestId.current !== id) return;
        if (next.kind === 'active' && next.habits.length > 0) hydrateHabits(next.habits);
        hasScreen.current = true;
        setScreen(next);
        setFailure(null);
        setRefreshError(false);
        setStatus('ready');
      } catch (error) {
        if (cancelled || requestId.current !== id) return;
        setFailure(error);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateHabits]);

  const reload = useCallback(() => load('refresh'), [load]);
  const clock = clockOf(screen);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  useEffect(() => {
    if (!clock?.boundaryAt || clock.mode === 'frozen') return;
    const at = new Date(clock.boundaryAt).getTime();
    const delay = at - Date.now();
    if (!Number.isFinite(delay) || delay <= 0 || delay > 48 * 60 * 60 * 1000) return;
    const id = window.setTimeout(() => void reload(), delay + 500);
    return () => window.clearTimeout(id);
  }, [clock?.boundaryAt, clock?.mode, reload]);

  if (status === 'loading') return <LoadingState label={t('home.loading')} />;
  if (failure instanceof AscentRequestError && failure.status === 401) return <SignInCard />;
  if (status === 'error' || !screen) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader showSettings={false} />
        <Card>
          <CardContent className="space-y-4 p-6">
            <p role="alert">{t('home.loadError')}</p>
            <Button
              type="button"
              onClick={() => {
                setStatus('loading');
                void load('initial');
              }}
            >
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        challengeTitle={screen.kind === 'welcome' ? undefined : challengeTitle(screen)}
        showSettings={screen.kind !== 'welcome'}
      />
      {refreshError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm" role="alert">
          {t('home.loadError')}{' '}
          <button type="button" className="underline" onClick={() => void reload()}>{t('retry')}</button>
        </p>
      ) : null}
      {screen.kind === 'welcome' ? <Welcome past={screen.past} /> : null}
      {screen.kind === 'scheduled' ? <Scheduled screen={screen} /> : null}
      {screen.kind === 'active' ? <ActiveDashboard data={screen} reload={reload} /> : null}
      {screen.kind === 'completed' ? <Completed screen={screen} /> : null}
    </div>
  );
}

function ActiveDashboard({
  data,
  reload,
}: {
  data: Extract<AscentScreenData, { kind: 'active' }>;
  reload: () => Promise<void>;
}) {
  const toggleHabitDay = useStore((state) => state.toggleHabitDay);
  const setHabitDayCount = useStore((state) => state.setHabitDayCount);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const startsOn = challengeStartsOn(data.today.challenge);

  async function run(item: AscentDebtView, action: () => Promise<void>) {
    setPendingId(item.id);
    setErrorId(null);
    try {
      await action();
      await reload();
    } catch {
      setErrorId(item.id);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <AscentClockCard clock={data.today.clock} />
      <StreakCards
        current={data.today.currentStreak}
        best={data.today.bestStreak}
        target={data.today.challenge.targetDays}
        pendingReset={data.today.clock.mode === 'broken'}
      />
      <AscentDebt
        items={data.today.debt}
        pendingId={pendingId}
        errorId={errorId}
        onHabit={(item) => void run(item, () => markHabit(item, data.today.localDate, data.habits, data.board.habits, toggleHabitDay, setHabitDayCount))}
        onManual={(item, confirmed) => void run(item, () => confirmAscentDebt(item.id, confirmed))}
        onRestriction={(item, confirmed) => void run(item, () => confirmAscentDebt(item.id, confirmed))}
      />
      <AscentRestrictions restrictions={data.board.restrictions} currentStreak={data.today.currentStreak} />
      <AscentXpCard balance={data.today.xpBalance} earned={data.today.xpEarnedTotal} rewards={data.board.rewards} />
      <HistoryCard localDate={data.today.localDate} startsOn={startsOn} status={data.today.challenge.status} days={data.history.days} />
    </>
  );
}

async function markHabit(
  item: AscentDebtView,
  localDate: string,
  habits: Habit[],
  links: { id: string; targetCount: number | null }[],
  toggleHabitDay: (id: string, date: string) => Promise<void>,
  setHabitDayCount: (id: string, date: string, count: number) => Promise<void>
) {
  const stored = useStore.getState().habits.find((habit) => habit.id === item.sourceId) ?? habits.find((habit) => habit.id === item.sourceId);
  const link = links.find((habit) => habit.id === item.sourceId);
  const target = stored?.targetCount ?? link?.targetCount ?? null;
  const clearing = item.state === 'satisfied' || item.state === 'bypassed';
  const live = useStore.getState().habits.some((habit) => habit.id === item.sourceId);

  if (live && stored?.targetCount == null) {
    await toggleHabitDay(item.sourceId, localDate);
    return;
  }
  if (live && stored?.targetCount != null) {
    await setHabitDayCount(item.sourceId, localDate, clearing ? 0 : stored.targetCount);
    return;
  }
  if (target == null) {
    await toggleHabitDayRequest(item.sourceId, localDate);
    return;
  }
  await setHabitDayCountRequest(item.sourceId, localDate, clearing ? 0 : target);
}

function Scheduled({ screen }: { screen: Extract<AscentScreenData, { kind: 'scheduled' }> }) {
  const t = useTranslations('ascent');
  const locale = useLocale();
  const startsOn = challengeStartsOn(screen.today.challenge);
  return (
    <>
      <p className="text-sm text-muted-foreground">{t('home.scheduledBody')}</p>
      <p className="text-sm">{t('home.startsAt', { when: formatWhen(screen.today.challenge.startsAt, screen.today.challenge.timezone, locale) })}</p>
      <AscentClockCard clock={screen.today.clock} />
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">{t('home.rulesTitle')}</h2>
          <p className="text-sm leading-6">{t('rulesText')}</p>
        </CardContent>
      </Card>
      <AscentRestrictions restrictions={screen.board.restrictions} currentStreak={screen.today.currentStreak} />
      <HistoryCard localDate={screen.today.localDate} startsOn={startsOn} status="active" days={screen.history.days} />
    </>
  );
}

function Completed({ screen }: { screen: Extract<AscentScreenData, { kind: 'completed' }> }) {
  const t = useTranslations('ascent');
  const startsOn = challengeStartsOn(screen.challenge);
  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">{t('home.completedTitle')}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t('home.completedBody')}</p>
          <Button asChild>
            <Link href="/ascent/new">{t('home.newChallenge')}</Link>
          </Button>
        </CardContent>
      </Card>
      <AscentClockCard clock={screen.clock} />
      <StreakCards current={screen.challenge.currentStreak} best={screen.challenge.bestStreak} target={screen.challenge.targetDays} />
      <AscentXpCard balance={screen.challenge.xpBalance} earned={screen.challenge.xpEarnedTotal} rewards={screen.board.rewards} />
      <AscentRestrictions restrictions={screen.board.restrictions} currentStreak={screen.challenge.currentStreak} />
      <HistoryCard localDate={screen.localDate} startsOn={startsOn} status={screen.challenge.status} days={screen.days} />
      <PastChallenges items={screen.past} />
    </>
  );
}

function Welcome({ past }: { past: AscentChallengeView[] }) {
  const t = useTranslations('ascent');
  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm leading-6 text-muted-foreground">{t('home.welcomeBody')}</p>
          <Button asChild>
            <Link href="/ascent/new">{t('home.quitButton')}</Link>
          </Button>
          <p className="text-xs text-muted-foreground">{t('home.welcomeExamples')}</p>
        </CardContent>
      </Card>
      <PastChallenges items={past} />
    </>
  );
}

function PastChallenges({ items }: { items: AscentChallengeView[] }) {
  const t = useTranslations('ascent');
  const [openId, setOpenId] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, AscentHistoryView | 'error'>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  if (items.length === 0) return null;

  async function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (cache[id]) return;
    setLoadingId(id);
    try {
      const history = await loadAscentHistory(id);
      setCache((current) => ({ ...current, [id]: history }));
    } catch {
      setCache((current) => ({ ...current, [id]: 'error' }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('home.pastTitle')}</h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const history = cache[item.id];
          return (
            <li key={item.id} className="rounded-xl border px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(item.status === 'archived' ? 'home.archived' : 'home.completed')}
                    {' · '}
                    {t('home.dayCount', { count: item.currentStreak })}
                    {' · '}
                    {t('home.recordTitle')} {t('home.dayCount', { count: item.bestStreak })}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void toggle(item.id)}>
                  {openId === item.id ? t('home.hideHistory') : t('home.showHistory')}
                </Button>
              </div>
              {openId === item.id ? (
                <div className="mt-4">
                  {loadingId === item.id ? <p className="text-sm text-muted-foreground">{t('home.loading')}</p> : null}
                  {history === 'error' ? <p role="alert" className="text-sm text-destructive">{t('home.loadError')}</p> : null}
                  {history && history !== 'error' ? (
                    <AscentCalendar
                      localDate={history.localDate}
                      startsOn={challengeStartsOn(history.challenge)}
                      challengeStatus={history.challenge.status}
                      days={history.days}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function HistoryCard({
  localDate,
  startsOn,
  status,
  days,
}: {
  localDate: string;
  startsOn: string;
  status: string;
  days: { localDate: string; status: string }[];
}) {
  const t = useTranslations('ascent');
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t('home.historyTitle')}</h2>
        <AscentCalendar localDate={localDate} startsOn={startsOn} challengeStatus={status} days={days} />
      </CardContent>
    </Card>
  );
}

function StreakCards({
  current,
  best,
  target,
  pendingReset = false,
}: {
  current: number;
  best: number;
  target: number;
  pendingReset?: boolean;
}) {
  const t = useTranslations('ascent');
  const percent = target <= 0 ? 0 : Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-medium text-muted-foreground">{t('home.streakTitle')}</h2>
          <p className="text-2xl font-semibold">{t('home.dayCount', { count: current })}</p>
          <p className="text-sm tabular-nums">{t('home.progress', { current, target })}</p>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(current, target)}
            aria-label={t('home.progress', { current, target })}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          {pendingReset ? <p className="text-sm text-muted-foreground">{t('home.streakPendingReset')}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground">{t('home.recordTitle')}</h2>
          <p className="mt-2 text-2xl font-semibold">{t('home.dayCount', { count: best })}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({ challengeTitle, showSettings }: { challengeTitle?: string; showSettings: boolean }) {
  const t = useTranslations('ascent');
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('home.screenTitle')}</h1>
        {challengeTitle ? <p className="mt-1 truncate text-muted-foreground">{challengeTitle}</p> : null}
      </div>
      {showSettings ? (
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ascent/settings" aria-label={t('home.settings')}>
            <Settings />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function SignInCard() {
  const t = useTranslations('ascent');
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{t('signInTitle')}</CardTitle>
          <CardDescription>{t('signInBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton />
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-live="polite">
      <p className="sr-only">{label}</p>
      <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function clockOf(screen: AscentScreenData | null): AscentClock | null {
  if (!screen || screen.kind === 'welcome') return null;
  if (screen.kind === 'completed') return screen.clock;
  return screen.today.clock;
}

function challengeTitle(screen: Exclude<AscentScreenData, { kind: 'welcome' }>): string {
  if (screen.kind === 'completed') return screen.challenge.title;
  return screen.today.challenge.title;
}

function challengeStartsOn(challenge: { startsAt: string; timezone: string }): string {
  try {
    return formatLocalDate(new Date(challenge.startsAt), challenge.timezone);
  } catch {
    return challenge.startsAt.slice(0, 10);
  }
}

function formatWhen(iso: string, timeZone: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  } catch {
    return iso;
  }
}
