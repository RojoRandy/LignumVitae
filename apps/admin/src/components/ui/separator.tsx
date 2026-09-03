import { Separator as RadixSeparator } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Separator = ({ className, ...props }: React.ComponentProps<typeof RadixSeparator.Root>) => (
  <RadixSeparator.Root
    className={cn('shrink-0 bg-border', props.orientation === 'vertical' ? 'w-px h-full' : 'h-px w-full', className)}
    {...props}
  />
);
