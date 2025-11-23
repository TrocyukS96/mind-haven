export const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'hsl(var(--secondary))';
    if (progress >= 50) return '#f39c12';
    return 'hsl(var(--primary))';
};