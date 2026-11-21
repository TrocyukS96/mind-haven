'use client';

import type { ProjectStatus } from '@/entities/project/model/types';
import type { TaskPriority } from '@/entities/task/model/types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { DatePicker } from '@/shared/ui/date-picker';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ProjectFormModal() {
  const t = useTranslations('projects');
  const tPriorities = useTranslations('priorities');
  const { isProjectFormOpen, selectedProject, closeProjectForm, addProject, updateProject, goals } =
    useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [goalId, setGoalId] = useState('none');
  const [nextAction, setNextAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');

  useEffect(() => {
    if (!isProjectFormOpen) return;
    setTitle(selectedProject?.title ?? '');
    setDescription(selectedProject?.description ?? '');
    setPriority(selectedProject?.priority ?? 'medium');
    setStatus(selectedProject?.status ?? 'active');
    setGoalId(selectedProject?.goalId ?? 'none');
    setNextAction(selectedProject?.nextAction ?? '');
    setStartDate(selectedProject?.startDate?.split('T')[0] ?? '');
    setPlannedEnd(selectedProject?.plannedEnd?.split('T')[0] ?? '');
  }, [isProjectFormOpen, selectedProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      goalId: goalId === 'none' ? undefined : goalId,
      nextAction: nextAction.trim(),
      startDate: startDate || undefined,
      plannedEnd: plannedEnd || undefined,
    };

    if (selectedProject) {
      updateProject(selectedProject.id, payload);
    } else {
      addProject(payload);
    }
    closeProjectForm();
  };

  return (
    <Dialog open={isProjectFormOpen} onOpenChange={(open) => !open && closeProjectForm()}>
      {isProjectFormOpen ? (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProject ? t('editProject') : t('newProject')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="project-title">{t('fields.title')}</Label>
              <Input
                id="project-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="project-description">{t('fields.description')}</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('fields.priority')}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{tPriorities('low')}</SelectItem>
                    <SelectItem value="medium">{tPriorities('medium')}</SelectItem>
                    <SelectItem value="high">{tPriorities('high')}</SelectItem>
                    <SelectItem value="urgent">{tPriorities('urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedProject ? (
                <div>
                  <Label>{t('fields.status')}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['active', 'paused', 'completed', 'archived'] as ProjectStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <div>
              <Label>{t('fields.goal')}</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('fields.noGoal')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('fields.noGoal')}</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('nextAction')}</Label>
              <Input
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('startDate')}</Label>
                <DatePicker id="project-start" value={startDate} onChange={setStartDate} className="mt-2" />
              </div>
              <div>
                <Label>{t('plannedEnd')}</Label>
                <DatePicker id="project-end" value={plannedEnd} onChange={setPlannedEnd} className="mt-2" />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {selectedProject ? t('save') : t('create')}
            </Button>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}