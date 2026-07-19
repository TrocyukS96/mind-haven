'use client';

import { cn } from '@/shared/lib/utils';
import { useEffect, useState } from 'react';

const INTERVAL_MS = 5000;
const FADE_MS = 450;

type RotatingDescriptionProps = {
  sentences: string[];
};

export function RotatingDescription({ sentences }: RotatingDescriptionProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (sentences.length <= 1) return;

    let fadeTimeout: ReturnType<typeof setTimeout>;

    const interval = setInterval(() => {
      setVisible(false);
      fadeTimeout = setTimeout(() => {
        setIndex((current) => (current + 1) % sentences.length);
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
    };
  }, [sentences.length]);

  return (
    <div className="min-h-[5.5rem] md:min-h-[4.5rem] flex flex-col justify-center">
      <p
        aria-live="polite"
        className={cn(
          'text-base md:text-lg leading-relaxed text-foreground/90 transition-all duration-500 ease-in-out',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        )}
      >
        {sentences[index]}
      </p>
      {sentences.length > 1 && (
        <div className="mt-4 flex items-center gap-1.5">
          {sentences.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${sentences.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => {
                setVisible(false);
                setTimeout(() => {
                  setIndex(i);
                  setVisible(true);
                }, FADE_MS);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
