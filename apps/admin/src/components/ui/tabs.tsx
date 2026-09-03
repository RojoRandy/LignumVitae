import { Tabs as RadixTabs } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Tabs = RadixTabs.Root;

export const TabsList = ({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) => (
  <RadixTabs.List className={cn('inline-flex items-center gap-1 rounded-input bg-surface-sunken p-1.5', className)} {...props} />
);

export const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) => (
  <RadixTabs.Trigger
    className={cn(
      'rounded-[7px] px-4 py-2 text-body-sm font-semibold text-text-muted transition-all duration-150',
      'data-[state=active]:bg-white data-[state=active]:text-accent-hover data-[state=active]:shadow-sm',
      'hover:text-text',
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: React.ComponentProps<typeof RadixTabs.Content>) => (
  <RadixTabs.Content className={cn('mt-5 animate-[var(--animate-fade-in)]', className)} {...props} />
);
