'use client';

import type { Project } from '@/entities/project/model/types';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import { Link } from '@/i18n/routing';
import { tasksForProject } from '@/shared/lib/planner/calculate-progress';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { ArrowLeft, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getDateLocale } from '@/shared/lib/date-locale';

type ProjectTab = 'tasks' | 'description' | 'activity' | 'notes';

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useTranslations('projects');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const hydrated = useStoreHydrated();
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const activityEvents = useStore((s) => s.activityEvents);
  const projectNotes = useStore((s) => s.projectNotes[projectId] ?? []);
  const openTaskForm = useStore((s) => s.openTaskForm);
  const addProjectNote = useStore((s) => s.addProjectNote);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const archiveProject = useStore((s) => s.archiveProject);
  const [tab, setTab] = useState<ProjectTab>('tasks');
  const [noteDraft, setNoteDraft] = useState('');

  const projectTasks = useMemo(
    () => (project ? tasksForProject(tasks, project.id) : []),
    [project, tasks]
  );

  const activity = useMemo(
    () =>
      activityEvents.filter(
        (event) =>
          (event.entityId === projectId && event.entityType === 'PROJECT') ||
          (event.metadata?.projectId === projectId)
      ),
    [activityEvents, projectId]
  );

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t('notFound')}</h1>
        <Button asChild>
          <Link href="/projects">{t('backToList')}</Link>
        </Button>
      </div>
    );
  }

  const linkedGoal = goals.find((g) => g.id === project.goalId);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/projects" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('backToList')}
        </Link>
      </Button>

      <header className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t(`status.${project.status}`)} · {project.progress}%
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => updateProject(project.id, { status: 'paused' })}>
              {t('actions.pause')}
            </Button>
            <Button variant="outline" onClick={() => archiveProject(project.id)}>
              {t('actions.archive')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(t('deleteConfirm'))) {
                  deleteProject(project.id, 'detach');
                }
              }}
            >
              {t('actions.delete')}
            </Button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
        </div>
        {project.nextAction ? (
          <p className="text-sm">
            <span className="font-medium">{t('nextAction')}: </span>
            {project.nextAction}
          </p>
        ) : null}
        {linkedGoal ? (
          <p className="text-sm text-muted-foreground">
            {t('goal')}:{' '}
            <Link href={`/goals/${linkedGoal.id}`} className="text-primary underline-offset-2 hover:underline">
              {linkedGoal.title}
            </Link>
          </p>
        ) : null}
      </header>

      <div className="flex gap-2 border-b pb-2">
        {(['tasks', 'description', 'activity', 'notes'] as ProjectTab[]).map((key) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(key)}
          >
            {t(`tabs.${key}`)}
          </Button>
        ))}
      </div>

      {tab === 'tasks' ? (
        <div className="space-y-4">
          <Button onClick={() => openTaskForm(undefined, project.goalId, undefined, project.id)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addTask')}
          </Button>
          <div className="space-y-2">
            {projectTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
            ) : (
              projectTasks.map((task) => <TaskCard key={task.id} task={task} showType />)
            )}
          </div>
        </div>
      ) : null}

      {tab === 'description' ? (
        <div className="rounded-2xl border bg-card p-6 space-y-4 text-sm">
          <p className="whitespace-pre-wrap">{project.description || t('noDescription')}</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {project.startDate ? (
              <div>
                <dt className="text-muted-foreground">{t('startDate')}</dt>
                <dd>{format(new Date(project.startDate), 'd MMM yyyy', { locale: dateLocale })}</dd>
              </div>
            ) : null}
            {project.plannedEnd ? (
              <div>
                <dt className="text-muted-foreground">{t('plannedEnd')}</dt>
                <dd>{format(new Date(project.plannedEnd), 'd MMM yyyy', { locale: dateLocale })}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      {tab === 'activity' ? (
        <ul className="space-y-2">
          {activity.length === 0 ? (
            <li className="text-sm text-muted-foreground">{t('noActivity')}</li>
          ) : (
            activity.map((event) => (
              <li key={event.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                <span className="font-medium">{event.title || event.type}</span>
                <span className="ml-2 text-muted-foreground">
                  {format(new Date(event.createdAt), 'd MMM yyyy HH:mm', { locale: dateLocale })}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {tab === 'notes' ? (
        <div className="space-y-4">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteDraft.trim()) return;
              addProjectNote(projectId, noteDraft);
              setNoteDraft('');
            }}
          >
            <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} placeholder={t('notePlaceholder')} />
            <Button type="submit">{t('saveNote')}</Button>
          </form>
          <ul className="space-y-2">
            {projectNotes.map((note) => (
              <li key={note.id} className="rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap">
                {note.content}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}