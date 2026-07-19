'use client';

import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import {
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RotatingDescription } from './rotating-description';

export function DashboardWidget() {
  const { journalEntries, goals, habits, markOverdueTasks } = useStore();
  const openGoalForm = useStore((state) => state.openGoalForm);
  const t = useTranslations('dashboard');
  const descriptionSentences = t.raw('descriptionSentences') as string[];

  const stats = [
    {
      label: t('journalEntries'),
      value: journalEntries.length,
      icon: BookOpen,
      color: 'hsl(var(--primary))',
    },
    {
      label: t('activeGoals'),
      value: goals.length,
      icon: Target,
      color: 'hsl(var(--secondary))',
    },
    {
      label: t('activeHabits'),
      value: habits.length,
      icon: CheckSquare,
      color: '#f39c12',
    },
  ];

  const features: {
    key: 'goals' | 'journal' | 'ai';
    icon: typeof Target;
    href?: '/goals' | '/journal';
    color: string;
  }[] = [
    {
      key: 'goals',
      icon: Target,
      href: '/goals',
      color: 'hsl(var(--secondary))',
    },
    {
      key: 'journal',
      icon: BookOpen,
      href: '/journal',
      color: 'hsl(var(--primary))',
    },
    {
      key: 'ai',
      icon: Sparkles,
      color: '#a855f7',
    },
  ];

  useEffect(() => {
    markOverdueTasks();
  }, [markOverdueTasks]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{t('subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => openGoalForm()}>
          <Plus size={20} />
          {t('createGoal')}
        </Button>
      </div>

      <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-chart-2/5">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-chart-2/10 blur-3xl" />
        <CardContent className="relative p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-primary/10 p-3">
              <Brain size={28} className="text-primary" />
            </div>
            <RotatingDescription sentences={descriptionSentences} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map(({ key, icon: Icon, href, color }) => {
              const content = (
                <>
                  <div
                    className="mb-3 inline-flex rounded-lg p-2.5"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon size={20} style={{ color }} />
                  </div>
                  <h3 className="font-medium">{t(`features.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {t(`features.${key}.description`)}
                  </p>
                </>
              );

              if (href) {
                return (
                  <Link
                    key={key}
                    href={href}
                    className="group rounded-xl border bg-card/80 p-4 transition-colors hover:border-primary/30 hover:bg-card"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={key}
                  className="rounded-xl border bg-card/80 p-4"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon size={24} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                    <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('recentActivity')}</CardTitle>
              <TrendingUp size={20} className="text-secondary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-primary" />
                <span>{t('newJournalEntry')}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('hoursAgo')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckSquare size={18} className="text-secondary" />
                <span>{t('habitCompleted', { name: 'Meditation' })}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('today')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Target size={18} style={{ color: '#f39c12' }} />
                <span>{t('goalProgress', { name: 'Reading books' })}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('yesterday')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('weekEvents')}</CardTitle>
              <Calendar size={20} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border-l-4 border-primary bg-primary/10 rounded">
              <p className="font-medium">{t('deadlineProject')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('in3Days')}</p>
            </div>
            <div className="p-3 border-l-4 border-chart-2 bg-chart-2/10 rounded">
              <p className="font-medium">{t('meditationGoal')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('daysLeft2')}</p>
            </div>
            <div className="p-3 border-l-4 border-[#f39c12] bg-chart-4/10 rounded">
              <p className="font-medium">{t('weekReview')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('sunday')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
