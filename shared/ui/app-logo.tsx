import { LesokLogo } from '@/shared/ui/lesok-logo';
import { cn } from '@/shared/lib/utils';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className, size = 40 }: AppLogoProps) {
  return (
    <span role="img" aria-label="Lesok" className={cn('inline-flex shrink-0', className)}>
      <LesokLogo size={size} />
    </span>
  );
}
