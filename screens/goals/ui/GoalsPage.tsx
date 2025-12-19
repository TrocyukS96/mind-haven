'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import GoalsFilter from './GoalsFilter';
import GoalsList from './GoalsList';
import GoalsSearch from './GoalsSearch';
import { GoalCategory } from '@/entities/goal/model/types';

const GoalsPage = () => {
    const { goals } = useStore();
    const openGoalForm = useStore((state) => state.openGoalForm);

    const [filter, setFilter] = useState<GoalCategory>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredGoals = useMemo(() => {
        let result = goals;

        if (filter !== 'all') {
            result = result.filter((g) => g.category === filter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (goal) =>
                    goal.title.toLowerCase().includes(query) ||
                    (goal.description?.toLowerCase().includes(query) ?? false)
            );
        }

        return result;
    }, [goals, filter, searchQuery]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Цели</h1>
                    <p className="text-muted-foreground mt-1">
                        Ставь SMART-цели и отслеживай свой прогресс
                    </p>
                </div>

                <Button onClick={() => openGoalForm()} size="lg" className="shrink-0">
                    <Plus className="mr-2 h-5 w-5" />
                    Создать цель
                </Button>
            </div>

            <div className="flex flex-col justify-between sm:flex-row gap-4">
                <GoalsSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="flex-1 max-w-lg"
                    placeholder="Поиск по названию или описанию..."
                />
                <GoalsFilter activeFilter={filter} setFilter={setFilter} />
            </div>

            <GoalsList filteredGoals={filteredGoals} />
        </div>
    );
};

export default GoalsPage;