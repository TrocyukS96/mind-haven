import { cn } from '@/shared/lib/utils';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export function AppLogo({ className, size = 40 }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="MindHaven"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-xl', className)}
    />
  );
}
