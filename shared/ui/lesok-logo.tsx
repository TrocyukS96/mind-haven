import { cn } from '@/shared/lib/utils';

interface LesokLogoProps {
  className?: string;
  size?: number;
}

export function LesokLogo({ className, size = 40 }: LesokLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d="M31.5 54.5C22.2 49.2 12.4 40.4 14.6 26.8C16.4 15.8 26.2 12.2 33.2 20.6C37.6 25.8 37.2 36.4 34.8 44.2C33.6 48.2 32.6 51.6 31.5 54.5Z"
        className="fill-[#9CBF55] dark:fill-[#C6DE78]"
      />
      <path
        d="M30.8 48.5C26.4 40.6 22.8 32.2 24.2 22.4"
        className="stroke-[#6D9338] dark:stroke-[#E7F3C4]"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M27.8 56.2C32.6 46.4 44.2 39.6 53.2 28.2C58.4 21.4 54.6 12.2 45.2 13.6C36.4 14.8 30.2 24.6 28.4 35.2C27.2 42.4 27 50.2 27.8 56.2Z"
        className="fill-[#2F6B38] dark:fill-[#7EBF55]"
      />
      <path
        d="M32.2 50.6C37.4 42.2 44.6 34.6 50.4 26.2"
        className="stroke-[#E8F4D4] dark:stroke-[#F4FBE4]"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M29.2 56.8C28.2 52.4 27.6 48.2 28.4 44.6"
        className="stroke-[#24562C] dark:stroke-[#2C4A28]"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
