'use client';

import { Task, TaskPriority } from "@/entities/task/model/types";
import { useStore } from "@/shared/store/store-config";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskForm = ({ task, open, onOpenChange }: Props) => {
  const { goals, addTask, updateTask, defaultGoalId } = useStore();

  const [title, setTitle] = useState(task?.title || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [goalId, setGoalId] = useState<string>(task?.goalId || defaultGoalId || 'none');
  const [completed, setCompleted] = useState(task?.completed || false);
  const [deadline, setDeadline] = useState(task?.deadline || '');
  
  const isEditMode = !!task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Название задачи не может быть пустым');
      return;
    };

    const finalGoalId = goalId === 'none' ? undefined : goalId;

    if (isEditMode && task) {
      updateTask(task.id, {
        title: title.trim(),
        priority,
        goalId: finalGoalId,
        completed,
      });
    } else {
      addTask(title.trim(), finalGoalId, priority);
    }

    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Название задачи */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">
          Название задачи
        </Label>
        <Input
          id="title"
          placeholder="Например: Подготовить презентацию для команды"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
          className="text-base"
        />
      </div>

      {/* Приоритет и цель — аккуратная сетка */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-base font-medium">
            Приоритет
          </Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Низкий</SelectItem>
              <SelectItem value="medium">Средний</SelectItem>
              <SelectItem value="high">Высокий</SelectItem>
              <SelectItem value="urgent">Срочно!</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal" className="text-base font-medium">
            Привязать к цели
          </Label>
          <Select value={goalId} onValueChange={setGoalId}>
            <SelectTrigger id="goal">
              <SelectValue placeholder="Без цели" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без цели</SelectItem>
              {goals.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Нет доступных целей
                </div>
              ) : (
                goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Выполнено — только при редактировании */}
      {isEditMode && (
        <div className="flex items-center space-x-3 py-2">
          <Checkbox
            id="completed"
            checked={completed}
            onCheckedChange={(checked) => setCompleted(checked as boolean)}
            className="h-5 w-5"
          />
          <Label htmlFor="completed" className="text-base cursor-pointer select-none">
            Отметить как выполненную
          </Label>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="deadline">Дедлайн (необязательно)</Label>
        <Input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Кнопки */}
      <div className="flex justify-end gap-3 pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => onOpenChange(false)}
          className="px-6"
        >
          Отмена
        </Button>
        <Button type="submit" size="lg" className="px-8">
          {isEditMode ? 'Сохранить изменения' : 'Создать задачу'}
        </Button>
      </div>
    </form>
  );
}

export default TaskForm;