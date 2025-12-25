'use client';

import { useStore } from "@/shared/store/store-config";
import { TaskCard } from "@/entities/task/ui/TaskCard";
import { Button } from "@/shared/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Task } from "@/entities/task/model/types";

const months = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

interface TasksCalendarModeProps {
  tasks: Task[];
}

export const TasksCalendarMode = ({ tasks }: TasksCalendarModeProps) => {
  const { openTaskForm } = useStore();

  // Создаём dailyTasks из переданных tasks
  const dailyTasks = tasks.reduce((acc, task) => {
    if (task.deadline) {
      const day = task.deadline.split('T')[0];
      if (!acc[day]) acc[day] = [];
      acc[day].push(task.id);
    }
    return acc;
  }, {} as Record<string, string[]>);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleMonthChange = (value: string) => {
    setCurrentMonth(new Date(year, parseInt(value), 1));
  };

  const handleYearChange = (value: string) => {
    setCurrentMonth(new Date(parseInt(value), monthIndex, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  const dayTasks = selectedDate
    ? dailyTasks[format(selectedDate, 'yyyy-MM-dd')]?.map(id => tasks.find(t => t.id === id)).filter(Boolean) || []
    : [];

  const getTaskCount = (date: Date) => dailyTasks[format(date, 'yyyy-MM-dd')]?.length || 0;

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        {/* Навигация */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Select value={monthIndex.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground mb-2">
          <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => {
            const taskCount = getTaskCount(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-32 rounded-xl border bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                  isCurrentDay && "ring-2 ring-primary ring-offset-2",
                  taskCount > 0 && "border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-sm font-semibold", isCurrentDay && "text-primary")}>
                    {format(day, 'd')}
                  </span>
                  {taskCount > 0 && (
                    <div className="text-xs font-medium text-primary">{taskCount}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {taskCount === 0 ? "Нет задач" : `${taskCount} задач${taskCount > 4 ? '' : taskCount === 1 ? 'а' : 'и'}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Модалка дня */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Задачи на {selectedDate && format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {dayTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет задач</p>
            ) : (
              dayTasks.map(task => task && <TaskCard key={task.id} task={task} showGoalTitle />)
            )}
          </div>
          <Button className="w-full mt-6" onClick={() => openTaskForm(undefined, undefined, selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить задачу
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};