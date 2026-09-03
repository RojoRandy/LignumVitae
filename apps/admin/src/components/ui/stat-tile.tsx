import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './card';

export const StatTile = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  /** Si viene, la tarjeta entera es clicable (p. ej. ir al listado que cuenta). */
  onClick?: () => void;
}) => {
  const toneClasses = {
    neutral: 'bg-accent-soft text-accent-hover',
    success: 'bg-success-bg text-success-fg',
    warning: 'bg-warning-bg text-warning-fg',
    danger: 'bg-danger-bg text-danger-fg',
  };
  return (
    <Card
      className={cn('p-5', onClick && 'cursor-pointer transition-colors hover:bg-surface-sunken')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold text-text-muted">{label}</p>
          <p className="text-display-lg font-extrabold tracking-tight text-text">{value}</p>
          {hint && <p className="text-caption text-text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-input', toneClasses[tone])}>{icon}</div>
        )}
      </div>
    </Card>
  );
};
