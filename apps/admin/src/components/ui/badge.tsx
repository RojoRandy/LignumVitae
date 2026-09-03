import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold', {
  variants: {
    variant: {
      neutral: 'bg-surface-sunken text-text-muted',
      accent: 'bg-accent-soft text-accent-hover',
      success: 'bg-success-bg text-success-fg',
      warning: 'bg-warning-bg text-warning-fg',
      danger: 'bg-danger-bg text-danger-fg',
      info: 'bg-info-bg text-info-fg',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant, className }))} {...props} />
);
