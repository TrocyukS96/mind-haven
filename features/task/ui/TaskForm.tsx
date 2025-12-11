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

export function TaskForm({ task, open, onOpenChange }: Props) {
  const { goals, addTask, updateTask } = useStore();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [goalId, setGoalId] = useState<string>('none'); // ← было '', стало 'none'
  const [completed, setCompleted] = useState(false);

  const isEdit = !!task;

  useEffect(() => {
    if (task && open) {
      setTitle(task.title);
      setPriority(task.priority);
      setGoalId(task.goalId || 'none');
      setCompleted(task.completed);
    } else if (!task && open) {
      setTitle('');
      setPriority('medium');
      setGoalId('none');
      setCompleted(false);
    }
  }, [task, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    console.log(e.target);
    console.log(goalId);

    const finalGoalId = goalId === 'none' ? undefined : goalId;

    console.log(finalGoalId);
    console.log(goals,'--goals');

    if (task) {
      updateTask(task.id, { title, priority, goalId: finalGoalId, completed });
    } else {
      addTask(title, finalGoalId, priority);
    }

    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {isEdit && (
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

      <div className="flex justify-end gap-3 pt-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button type="submit">
          {isEdit ? 'Сохранить' : 'Создать задачу'}
        </Button>
      </div>
    </form>
  );
}