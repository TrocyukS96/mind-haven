'use client';

import { Link, useRouter } from '@/i18n/routing';
import { ProjectStepsList } from '@/features/project/ui/project-steps-list';
import { tasksForProject } from '@/shared/lib/planner/calculate-progress';
import { sortProjectSteps } from '@/shared/lib/planner/project-step-order';
import { getDateLocale } from '@/shared/lib/date-locale';
import { cn } from '@/shared/lib/utils';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type StepFilter = 'all' | 'active' | 'done';

const EMPTY_NOTES: never[] = [];

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const t = useTranslations('projects');
  const tPriorities = useTranslations('priorities');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const tasks = useStore((s) => s.tasks);
  const goals = useStore((s) => s.goals);
  const projectNotes = useStore((s) => s.projectNotes[projectId]) ?? EMPTY_NOTES;
  const openTaskForm = useStore((s) => s.openTaskForm);
  const openProjectForm = useStore((s) => s.openProjectForm);
  const addTask = useStore((s) => s.addTask);
  const addProjectNote = useStore((s) => s.addProjectNote);
  const removeProjectNote = useStore((s) => s.removeProjectNote);
  const updateProject = useStore((s) => s.updateProject);
  const reorderProjectSteps = useStore((s) => s.reorderProjectSteps);
  const deleteProject = useStore((s) => s.deleteProject);
  const archiveProject = useStore((s) => s.archiveProject);
  const [stepDraft, setStepDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [filter, setFilter] = useState<StepFilter>('all');
  const [leaving, setLeaving] = useState(false);

  const projectTasks = useMemo(() => {
    if (!project) return [];
    return sortProjectSteps(tasksForProject(tasks, project.id));
  }, [project, tasks]);

  const visibleSteps = projectTasks.filter((step) => {
    if (filter === 'active') return !step.completed;
    if (filter === 'done') return step.completed;
    return true;
  });

  if (!hydrated || leaving) {
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
  const completed = projectTasks.filter((step) => step.completed).length;
  const formatDate = (value?: string) =>
    value ? format(new Date(value), 'd MMM yyyy', { locale: dateLocale }) : t('notSet');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/projects" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('backToList')}
        </Link>
      </Button>

      <header className="space-y-5 rounded-2xl border bg-card/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{t(`status.${project.status}`)}</Badge>
              <Badge variant="outline">{tPriorities(project.priority)}</Badge>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-foreground">
                {completed}/{projectTasks.length}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openProjectForm(project)}>
              <Pencil className="mr-2 h-4 w-4" />
              {tCommon('edit')}
            </Button>
            {project.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={() => updateProject(project.id, { status: 'paused' })}>
                {t('actions.pause')}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => updateProject(project.id, { status: 'active' })}>
                {t('actions.resume')}
              </Button>
            )}
            {project.status !== 'archived' ? (
              <Button variant="outline" size="sm" onClick={() => archiveProject(project.id)}>
                {t('actions.archive')}
              </Button>
            ) : null}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!confirm(t('deleteConfirm'))) return;
                setLeaving(true);
                deleteProject(project.id, 'detach');
                router.push('/projects');
              }}
            >
              {t('actions.delete')}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('progress')}</span>
            <span className="tabular-nums">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, project.progress)}%` }} />
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t('about')}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {project.description.trim() ? project.description : t('noDescription')}
          </p>
        </section>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label={t('goal')} value={linkedGoal?.title} empty={t('fields.noGoal')} href={linkedGoal ? `/goals/${linkedGoal.id}` : undefined} />
          <InfoItem label={t('nextAction')} value={project.nextAction} empty={t('notSet')} />
          <InfoItem label={t('fields.priority')} value={tPriorities(project.priority)} empty={t('notSet')} />
          <InfoItem label={t('startDate')} value={project.startDate ? formatDate(project.startDate) : undefined} empty={t('notSet')} />
          <InfoItem label={t('plannedEnd')} value={project.plannedEnd ? formatDate(project.plannedEnd) : undefined} empty={t('notSet')} />
          <InfoItem label={t('createdAt')} value={formatDate(project.createdAt)} empty={t('notSet')} />
          <InfoItem label={t('updatedAt')} value={formatDate(project.updatedAt)} empty={t('notSet')} />
        </dl>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
        <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{t('stepsTitle')}</h2>
            <div className="flex gap-2">
              {(['all', 'active', 'done'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs',
                    filter === item ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                  )}
                >
                  {t(`filters.${item}`)}
                </button>
              ))}
            </div>
          </div>

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const title = stepDraft.trim();
              if (!title) return;
              addTask(title, project.goalId, project.priority, undefined, 'backlog', undefined, project.id);
              setStepDraft('');
            }}
          >
            <Input
              value={stepDraft}
              onChange={(event) => setStepDraft(event.target.value)}
              placeholder={t('stepPlaceholder')}
              aria-label={t('stepPlaceholder')}
            />
            <div className="flex gap-2">
              <Button type="submit" className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                {t('addStep')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => openTaskForm(undefined, project.goalId, undefined, project.id)}
              >
                {t('openStepDetails')}
              </Button>
            </div>
          </form>

          <div className="mt-4">
            {visibleSteps.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('noSteps')}</p>
            ) : (
              <ProjectStepsList
                steps={visibleSteps}
                onReorder={(orderedIds) => reorderProjectSteps(project.id, orderedIds)}
              />
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card/80 p-4 sm:p-5">
          <h2 className="font-semibold">{t('commentsTitle')}</h2>
          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!commentDraft.trim()) return;
              addProjectNote(projectId, commentDraft);
              setCommentDraft('');
            }}
          >
            <Textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              rows={4}
              placeholder={t('commentPlaceholder')}
              aria-label={t('commentPlaceholder')}
            />
            <Button type="submit">{t('addComment')}</Button>
          </form>
          <ul className="mt-4 space-y-2">
            {projectNotes.length === 0 ? (
              <li className="text-sm text-muted-foreground">{t('noComments')}</li>
            ) : (
              projectNotes.map((note) => (
                <li key={note.id} className="rounded-xl border bg-background/60 p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <time className="text-xs text-muted-foreground" dateTime={note.createdAt}>
                      {format(new Date(note.createdAt), 'd MMM yyyy HH:mm', { locale: dateLocale })}
                    </time>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={tCommon('delete')}
                      onClick={() => removeProjectNote(projectId, note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  empty,
  href,
}: {
  label: string;
  value?: string;
  empty: string;
  href?: string;
}) {
  const text = value?.trim() ? value : empty;
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">
        {href && value?.trim() ? (
          <Link href={href} className="text-primary underline-offset-2 hover:underline">
            {text}
          </Link>
        ) : (
          text
        )}
      </dd>
    </div>
  );
}
