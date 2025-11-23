'use client';

import { CreateGoalForm } from '@/features/goal/create-goal/ui/create-goal-form';
import { useStore } from '@/shared/providers/store-provider';
import { Button } from '@/shared/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import GoalsFilter from './GoalsFilter';
import GoalsList from './GoalsList';

const GoalsPage = () => {
      const { goals } = useStore();
    const [filter, setFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
    const [isCreating, setIsCreating] = useState(false);

    const filteredGoals = filter === 'all' ? goals : goals.filter(g => g.category === filter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1>Цели</h1>
                    <p className="text-muted-foreground mt-2">
                        Ставь SMART-цели и отслеживай свой прогресс
                    </p>
                </div>
                <Button onClick={() => setIsCreating(!isCreating)}>
                    <Plus size={20} />
                    Создать цель
                </Button>
            </div>

            <GoalsFilter setFilter={setFilter} />

            {isCreating && (
                <CreateGoalForm
                    onCancel={() => setIsCreating(false)}
                    onSuccess={() => setIsCreating(false)}
                />
            )}

            <GoalsList filteredGoals={filteredGoals} setIsCreating={setIsCreating} />
        </div>
    );
};

export default GoalsPage;

