'use client';

import { Button } from "@/shared/ui/button";
import { Plus, Target } from "lucide-react";
import { TaskCard } from "@/entities/task/ui/TaskCard";
import { format, isToday, isTomorrow, addDays, isWithinInterval, endOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { Task } from "@/entities/task/model/types";
import { useStore } from "@/shared/store/store-config";

interface TasksByDayModeProps {
  tasks: Task[];
}

export function TasksByDayMode({ tasks }: TasksByDayModeProps) {
  const { openTaskForm } = useStore();

  const groupedTasks = {
    today: tasks.filter(t => t.deadline && isToday(new Date(t.deadline))),
    tomorrow: tasks.filter(t => t.deadline && isTomorrow(new Date(t.deadline))),
    thisWeek: tasks.filter(t => t.deadline && isWithinInterval(new Date(t.deadline), { start: addDays(new Date(), 2), end: endOfWeek(new Date()) })),
    later: tasks.filter(t => t.deadline && !isToday(new Date(t.deadline)) && !isTomorrow(new Date(t.deadline)) && !isWithinInterval(new Date(t.deadline), { start: addDays(new Date(), 2), end: endOfWeek(new Date()) })),
    backlog: tasks.filter(t => !t.deadline),
  };

  const DaySection = ({ title, tasks: dayTasks, dateLabel }: { title: string; tasks: Task[]; dateLabel?: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {title} {dateLabel && <span className="text-muted-foreground text-base">— {dateLabel}</span>} ({dayTasks.length})
        </h2>
        <Button size="sm" onClick={() => openTaskForm(undefined, undefined, dateLabel?.split(' — ')[1] || undefined)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {dayTasks.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <Target className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Нет задач</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayTasks.map(task => (
            <div key={task.id} className="bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4">
              <TaskCard task={task} showGoalTitle />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-12">
      <DaySection title="Сегодня" tasks={groupedTasks.today} dateLabel={format(new Date(), 'd MMMM', { locale: ru })} />
      <DaySection title="Завтра" tasks={groupedTasks.tomorrow} dateLabel={format(addDays(new Date(), 1), 'd MMMM', { locale: ru })} />
      <DaySection title="На этой неделе" tasks={groupedTasks.thisWeek} />
      <DaySection title="Позже" tasks={groupedTasks.later} />
      <DaySection title="Бэклог (без срока)" tasks={groupedTasks.backlog} />
    </div>
  );
}