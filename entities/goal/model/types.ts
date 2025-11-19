export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  deadline: string;
  category: 'week' | 'month' | 'year';
}
