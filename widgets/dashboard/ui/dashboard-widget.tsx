'use client';

import { PointsDashboardWidget } from '@/features/points';
import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  BookOpen,
  Brain,
  Calendar,
  Sparkles,
  Target,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { RotatingDescription } from './rotating-description';

export function DashboardWidget() {
  const { markOverdueTasks, recalculateRating, tasks } = useStore();
  const t = useTranslations('dashboard');
  const descriptionSentences = t.raw('descriptionSentences') as string[];

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
    recalculateRating(tasks);
  }, [markOverdueTasks, recalculateRating, tasks]);

  return (
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PointsDashboardWidget />

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
