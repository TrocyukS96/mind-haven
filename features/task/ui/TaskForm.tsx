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

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskForm = ({ task, open, onOpenChange }: Props) => {
  const { goals, addTask, updateTask, defaultGoalId, defaultDeadline } = useStore();

  const [title, setTitle] = useState(task?.title || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [goalId, setGoalId] = useState<string>(task?.goalId || defaultGoalId || 'none');
  const [completed, setCompleted] = useState(task?.completed || false);
  const [deadline, setDeadline] = useState(task?.deadline || '');

  const isEditMode = !!task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalGoalId = goalId === 'none' ? undefined : goalId;
    const finalDeadline = deadline || undefined;

    if (isEditMode && task) {
      updateTask(task.id, {
        title: title.trim(),
        priority,
        goalId: finalGoalId,
        deadline: finalDeadline,
      });
    } else {
      addTask(title.trim(), finalGoalId, priority, finalDeadline);
    }

    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setPriority(task.priority);
        setGoalId(task.goalId || 'none');
        setDeadline(task.deadline || '');
      } else {
        setTitle('');
        setPriority('medium');
        setGoalId(defaultGoalId || 'none');
        setDeadline(defaultDeadline || '');
      }
    }
  }, [task, open, defaultGoalId, defaultDeadline]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Название задачи</Label>
        <Input
          id="title"
          placeholder="Например: Подготовить презентацию"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Приоритет</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger className="mt-2">
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
          <Label htmlFor="deadline">Дедлайн</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-2"
          />
        </div>

      </div>

      <div>
        <Label htmlFor="goal">Привязать к цели</Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Без цели" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без цели</SelectItem>
            {goals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isEditMode && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="completed"
            checked={completed}
            onCheckedChange={(checked) => setCompleted(checked as boolean)}
          />
          <Label htmlFor="completed" className="cursor-pointer">
            Отметить как выполненную
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button type="submit">
          {isEditMode ? 'Сохранить' : 'Создать задачу'}
        </Button>
      </div>
    </form>
  );
}

export default TaskForm;