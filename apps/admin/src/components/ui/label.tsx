import { Label as RadixLabel } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Label = ({ className, ...props }: React.ComponentProps<typeof RadixLabel.Root>) => (
  <RadixLabel.Root className={cn('text-body-sm font-semibold text-text', className)} {...props} />
);
