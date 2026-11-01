export type TreeStage = 'seed' | 'sprout' | 'sapling' | 'young' | 'adult' | 'mature' | 'fruit';

export const TREE_STAGES: TreeStage[] = ['seed', 'sprout', 'sapling', 'young', 'adult', 'mature', 'fruit'];

export function getTreeStage(progress: number): TreeStage {
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  if (value <= 0) return 'seed';
  if (value <= 20) return 'sprout';
  if (value <= 40) return 'sapling';
  if (value <= 60) return 'young';
  if (value <= 80) return 'adult';
  if (value < 100) return 'mature';
  return 'fruit';
}

export function treeVariant(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash + char.charCodeAt(0)) % 5;
  }
  return hash;
}
