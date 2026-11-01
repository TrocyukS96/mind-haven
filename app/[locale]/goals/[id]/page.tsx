'use client';

import { GoalTreePage } from '@/screens/goals/ui/GoalTreePage';
import { useParams } from 'next/navigation';

export default function GoalTreeRoute() {
  const params = useParams<{ id: string }>();
  return <GoalTreePage goalId={params.id} />;
}
