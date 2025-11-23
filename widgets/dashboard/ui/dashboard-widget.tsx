'use client';

import { useStore } from '@/shared/providers/store-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { BookOpen, Calendar, CheckSquare, Plus, Table, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function DashboardWidget() {
  const { journalEntries, goals, habits, tables } = useStore();

  const stats = [
    { label: 'Записей в журнале', value: journalEntries.length, icon: BookOpen, color: 'hsl(var(--primary))' },
    { label: 'Активных целей', value: goals.length, icon: Target, color: 'hsl(var(--secondary))' },
    { label: 'Привычек в работе', value: habits.length, icon: CheckSquare, color: '#f39c12' },
    { label: 'Таблиц создано', value: tables.length, icon: Table, color: '#9b59b6' },
  ];

  const modules = [
    {
      id: 'journal',
      title: 'Журнал рефлексии',
      description: 'Записывай свои мысли и получай AI-советы',
      icon: BookOpen,
      color: 'hsl(var(--primary))',
      href: '/journal',
    },
    {
      id: 'goals',
      title: 'Цели',
      description: 'Ставь SMART-цели и отслеживай прогресс',
      icon: Target,
      color: 'hsl(var(--secondary))',
      href: '/goals',
    },
    {
      id: 'habits',
      title: 'Привычки',
      description: 'Формируй полезные привычки каждый день',
      icon: CheckSquare,
      color: '#f39c12',
      href: '/habits',
    },
    {
      id: 'tables',
      title: 'Таблицы',
      description: 'Организуй данные с гибкими таблицами',
      icon: Table,
      color: '#9b59b6',
      href: '/tables',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Твоя комната для роста</h1>
          <p className="text-muted-foreground mt-2">
            Добро пожаловать! Начни свой путь к лучшей версии себя.
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/goals">
            <Plus size={20} />
            Создать цель
          </Link>
        </Button>
      </div>

      {/* Stats */}
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Недавняя активность</CardTitle>
              <TrendingUp size={20} className="text-secondary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-primary" />
                <span>Новая запись в журнале</span>
              </div>
              <span className="text-sm text-muted-foreground">2 часа назад</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CheckSquare size={18} className="text-secondary" />
                <span>Выполнена привычка &quot;Медитация&quot;</span>
              </div>
              <span className="text-sm text-muted-foreground">Сегодня</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Target size={18} style={{ color: '#f39c12' }} />
                <span>Прогресс цели &quot;Читать книги&quot;</span>
              </div>
              <span className="text-sm text-muted-foreground">Вчера</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>События на неделе</CardTitle>
              <Calendar size={20} className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border-l-4 border-primary bg-primary/10 rounded">
              <p className="font-medium">Дедлайн: Завершить проект</p>
              <p className="text-sm text-muted-foreground mt-1">Через 3 дня</p>
            </div>
            <div className="p-3 border-l-4 border-chart-2 bg-chart-2/10 rounded">
              <p className="font-medium">Цель: 7 дней медитации подряд</p>
              <p className="text-sm text-muted-foreground mt-1">Осталось 2 дня</p>
            </div>
            <div className="p-3 border-l-4 border-[#f39c12] bg-chart-4/10 rounded">
              <p className="font-medium">Обзор недели</p>
              <p className="text-sm text-muted-foreground mt-1">Воскресенье</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div className="">
        <h2 className="mb-6">Модули</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} href={module.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="p-4 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${module.color}20` }}
                      >
                        <Icon size={28} style={{ color: module.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-2">{module.title}</h3>
                        <p className="text-muted-foreground">{module.description}</p>
                        <Button variant="ghost" size="sm" className="mt-3 px-0">
                          Открыть модуль →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
