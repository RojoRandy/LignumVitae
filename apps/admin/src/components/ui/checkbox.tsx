import { Checkbox as RadixCheckbox } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Checkbox = ({ className, ...props }: React.ComponentProps<typeof RadixCheckbox.Root>) => (
  <RadixCheckbox.Root
    className={cn(
      'flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-border-strong bg-white transition-colors duration-150',
      'data-[state=checked]:bg-accent data-[state=checked]:border-accent',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
      className,
    )}
    {...props}
  >
    <RadixCheckbox.Indicator>
      <Check className="size-3.5 text-white" strokeWidth={3} />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
);
