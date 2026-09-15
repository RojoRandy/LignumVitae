import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Card } from './card';
import { Skeleton } from './skeleton';

export const StatTile = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  onClick,
  isLoading,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  /** Si viene, la tarjeta entera es clicable (p. ej. ir al listado que cuenta). */
  onClick?: () => void;
  /** Sin esto la tarjeta muestra 0 mientras carga, que se lee como un dato. */
  isLoading?: boolean;
}) => {
  const toneClasses = {
    neutral: 'bg-accent-soft text-accent-hover',
    success: 'bg-success-bg text-success-fg',
    warning: 'bg-warning-bg text-warning-fg',
    danger: 'bg-danger-bg text-danger-fg',
  };
  return (
    <Card
      className={cn(
        'p-5',
        onClick &&
          'cursor-pointer transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
      onClick={onClick}
      // Clicable tambien por teclado: antes era un <div onClick> que el
      // tabulador se saltaba.
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold text-text-muted">{label}</p>
          {isLoading ? (
            <Skeleton className="h-11 w-20" />
          ) : (
            <p className="text-display-lg font-extrabold tracking-tight tabular-nums text-text">{value}</p>
          )}
          {hint && <p className="text-caption text-text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-input', toneClasses[tone])}>{icon}</div>
        )}
      </div>
    </Card>
  );
};
