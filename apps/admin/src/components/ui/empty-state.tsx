import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center justify-center gap-3.5 px-6 py-14 text-center', className)}>
    {icon && (
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-sunken text-text-faint">{icon}</div>
    )}
    <div className="flex flex-col gap-1.5">
      <p className="text-body-lg font-bold text-text">{title}</p>
      {description && <p className="max-w-sm text-body-sm text-text-muted">{description}</p>}
    </div>
    {action}
  </div>
);
