'use client';

import { useStore } from '@/shared/store/store-config';
import { useEffect } from 'react';
import { ForestDashboard } from './forest-dashboard';

export function DashboardWidget() {
  const markOverdueTasks = useStore((state) => state.markOverdueTasks);

  useEffect(() => {
    markOverdueTasks();
  }, [markOverdueTasks]);

  return <ForestDashboard />;
}
