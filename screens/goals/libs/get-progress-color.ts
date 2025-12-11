export const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#f39c12';
    if (progress >= 50) return '#f39c12';
    return 'var(--primary)';
};