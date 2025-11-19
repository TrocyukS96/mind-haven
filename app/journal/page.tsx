'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Plus, Sparkles, Clock, Search } from 'lucide-react';
import { useStore } from '@/shared/providers/store-provider';
import { CreateEntryForm } from '@/features/journal/create-entry/ui/create-entry-form';

export default function JournalPage() {
  const { journalEntries } = useStore();
  const [isWriting, setIsWriting] = useState(false);

  const aiInsights = [
    'На основе твоих записей: ты часто упоминаешь важность баланса. Попробуй установить четкие границы между работой и отдыхом.',
    'Твои записи показывают рост осознанности. Продолжай практику благодарности — это укрепляет позитивное мышление.',
    'Ты пишешь о продуктивности регулярно. Возможно, стоит попробовать технику Pomodoro для улучшения фокуса.',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>Журнал рефлексии</h1>
          <p className="text-muted-foreground mt-2">
            Записывай свои мысли, чувства и наблюдения
          </p>
        </div>
        <Button onClick={() => setIsWriting(!isWriting)}>
          <Plus size={20} />
          Новая запись
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Поиск по записям..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Writing Area */}
      {isWriting && (
        <CreateEntryForm
          onCancel={() => setIsWriting(false)}
          onSuccess={() => setIsWriting(false)}
        />
      )}

      {/* AI Insights */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-100 flex-shrink-0">
              <Sparkles size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2">AI-советы</h3>
              <p className="text-muted-foreground">
                {aiInsights[Math.floor(Math.random() * aiInsights.length)]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div>
        <h2 className="mb-4">История записей</h2>
        <div className="space-y-4">
          {journalEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-2">{entry.title}</h3>
                    <p className="text-muted-foreground mb-3 line-clamp-2">
                      {entry.content}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock size={16} />
                      <span>{new Date(entry.date).toLocaleDateString('ru-RU', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
