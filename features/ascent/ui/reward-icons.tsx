import {
  BookOpen,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Gift,
  Music,
  Sparkles,
  Store,
  Tv,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

export const REWARD_ICONS: readonly { name: string; icon: LucideIcon }[] = [
  { name: 'coffee', icon: Coffee },
  { name: 'utensils', icon: Utensils },
  { name: 'flame', icon: Flame },
  { name: 'tv', icon: Tv },
  { name: 'store', icon: Store },
  { name: 'dumbbell', icon: Dumbbell },
  { name: 'footprints', icon: Footprints },
  { name: 'droplets', icon: Droplets },
  { name: 'book', icon: BookOpen },
  { name: 'music', icon: Music },
  { name: 'sparkles', icon: Sparkles },
  { name: 'gift', icon: Gift },
];

export function RewardIcon({ name, className }: { name: string | null; className?: string }) {
  const match = REWARD_ICONS.find((item) => item.name === name);
  if (!match) return null;
  const Icon = match.icon;
  return <Icon className={className} aria-hidden />;
}
