import { Card } from "@/shared/ui/card";
import { CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";

const filters: { label: string; value: 'all' | 'week' | 'month' | 'year' }[] = [
    { label: 'Все цели', value: 'all' },
    { label: 'Неделя', value: 'week' },
    { label: 'Месяц', value: 'month' },
    { label: 'Год', value: 'year' },
];

const GoalsFilter = ({ setFilter }: { setFilter: (filter: 'all' | 'week' | 'month' | 'year') => void }) => {
    return (
        <Card>
        <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <GoalsFilterButton key={filter.value} filter={filter.value} setFilter={setFilter} label={filter.label} />
                ))}
            </div>
        </CardContent>
    </Card>
    );
};

const GoalsFilterButton = ({ filter, setFilter, label }: { filter: 'all' | 'week' | 'month' | 'year'; setFilter: (filter: 'all' | 'week' | 'month' | 'year') => void; label: string }) => {
    return (
        <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(filter)}
        >
            {label}
        </Button>
    );
};

export default GoalsFilter;