export const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#f39c12';
    if (progress >= 30) return 'var(--chart-2)';
    return 'var(--primary)';
};