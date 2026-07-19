'use client';

import { useStore } from '@/shared/store/store-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { BookOpen, Calendar, CheckSquare, Plus, Target, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function DashboardWidget() {
  const { journalEntries, goals, habits, markOverdueTasks } = useStore();
  const openGoalForm = useStore((state) => state.openGoalForm);
  const t = useTranslations('dashboard');

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

  useEffect(() => {
    markOverdueTasks();
  }, [markOverdueTasks]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => openGoalForm()}>
          <Plus size={20} />
          {t('createGoal')}
        </Button>
      </div>

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
