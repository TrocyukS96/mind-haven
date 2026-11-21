'use client';

import type { Project, ProjectStatus } from '@/entities/project/model/types';
import { Link } from '@/i18n/routing';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, FolderKanban } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/utils';

const STATUS_FILTERS: Array<ProjectStatus | 'all'> = [
  'all',
  'active',
  'paused',
  'completed',
  'archived',
];

export function ProjectsPage() {
  const t = useTranslations('projects');
  const projects = useStore((s) => s.projects);
  const goals = useStore((s) => s.goals);
  const openProjectForm = useStore((s) => s.openProjectForm);
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...projects];
    if (status !== 'all') {
      list = list.filter((p) => p.status === status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [projects, status, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button size="lg" onClick={() => openProjectForm()}>
          <Plus className="mr-2 h-5 w-5" />
          {t('newProject')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="h-10 w-full max-w-sm rounded-xl border bg-background px-3 text-sm"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={status === item ? 'default' : 'outline'}
            onClick={() => setStatus(item)}
          >
            {t(`status.${item}`)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">{t('emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} goalTitle={goals.find((g) => g.id === project.goalId)?.title} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, goalTitle }: { project: Project; goalTitle?: string }) {
  const t = useTranslations('projects');

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 text-lg font-semibold group-hover:text-primary">{project.title}</h2>
        <Badge variant="secondary">{t(`status.${project.status}`)}</Badge>
      </div>
      {project.description ? (
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      ) : null}
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, project.progress)}%` }}
          />
        </div>
        <LabelRow label={t('progress')} value={`${project.progress}%`} />
        {goalTitle ? <LabelRow label={t('goal')} value={goalTitle} /> : null}
        {project.nextAction ? <LabelRow label={t('nextAction')} value={project.nextAction} /> : null}
      </div>
    </Link>
  );
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground')}>
      <span className="font-medium text-foreground">{label}: </span>
      <span className="line-clamp-1">{value}</span>
    </p>
  );
}