'use client';
import { Button } from "@/shared/ui/button";

export const TasksTabs = ({ viewMode, setViewMode }: { viewMode: 'by-day' | 'calendar' | 'list'; setViewMode: (viewMode: 'by-day' | 'calendar' | 'list') => void }) => {
    return (
        <div className="flex rounded-lg border bg-card p-1 w-max">
        <Button variant={viewMode === 'by-day' ? 'default' : 'ghost'} onClick={() => setViewMode('by-day')}>
          По дням
        </Button>
        <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} onClick={() => setViewMode('calendar')}>
          Календарь
        </Button>
        <Button variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')}>
          Список
        </Button>
      </div>
    );
};
