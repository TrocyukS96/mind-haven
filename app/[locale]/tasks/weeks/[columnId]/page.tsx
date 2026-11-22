import { WeekPlanningPage } from '@/screens/tasks/ui/WeekPlanningPage';

export default async function Page({ params }: { params: Promise<{ columnId: string }> }) {
  const { columnId } = await params;
  return <WeekPlanningPage columnId={columnId} />;
}
