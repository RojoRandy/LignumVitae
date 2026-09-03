import { cn } from '@/lib/cn';

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('animate-pulse rounded-input bg-surface-sunken', className)} {...props} />
);
