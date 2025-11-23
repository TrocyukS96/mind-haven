import { Card } from "@/shared/ui/card";
import { CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { GoalCategory } from "@/entities/goal/model/types";

const filters: { label: string; value: 'all' | 'week' | 'month' | 'year' }[] = [
    { label: 'Все цели', value: 'all' },
    { label: 'Неделя', value: 'week' },
    { label: 'Месяц', value: 'month' },
    { label: 'Год', value: 'year' },
];

const GoalsFilter = ({activeFilter, setFilter }: { activeFilter: GoalCategory; setFilter: (filter: GoalCategory) => void }) => {
    return (
            <div className="flex flex-wrap gap-2 justify-end">
                {filters.map((filter) => (
                    <GoalsFilterButton key={filter.value} activeFilter={activeFilter} filter={filter.value} setFilter={setFilter} label={filter.label} />
                ))}
            </div>
    );
};

const GoalsFilterButton = ({ filter,activeFilter, setFilter, label }: { filter: GoalCategory; activeFilter: GoalCategory; setFilter: (filter: GoalCategory) => void; label: string }) => {
    return (
        <Button
            variant={filter === activeFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(filter)}
        >
            {label}
        </Button>
    );
};

export default GoalsFilter;