'use client';

import { cn } from '@/shared/lib/utils';
import { Card, CardContent } from '@/shared/ui/card';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  showCard?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
  compact = false,
  showCard = true,
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      "text-center",
      compact ? "py-4" : "py-12",
      className
    )}>
      {Icon && (
        <Icon 
          size={compact ? 32 : 48} 
          className={cn(
            "mx-auto mb-4 text-muted-foreground",
            compact && "mb-2"
          )} 
        />
      )}
      <h3 className={cn(
        "mb-2 font-medium",
        compact ? "text-base" : "text-xl"
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          "text-muted-foreground mb-4",
          compact && "text-sm mb-3"
        )}>
          {description}
        </p>
      )}
      {/* {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          size={compact ? "sm" : "default"}
        >
          {actionLabel}
        </Button>
      )} */}
      {children}
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardContent className={compact ? "p-6" : "p-12"}>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}