'use client';

import { ProjectDetailPage } from '@/screens/projects/ui/ProjectDetailPage';
import { useParams } from 'next/navigation';

export default function ProjectDetailRoute() {
  const params = useParams<{ id: string }>();
  return <ProjectDetailPage projectId={params.id} />;
}