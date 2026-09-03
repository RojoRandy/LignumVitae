import { Popover as RadixPopover } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export const PopoverContent = ({ className, sideOffset = 8, align = 'start', ...props }: React.ComponentProps<typeof RadixPopover.Content>) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      sideOffset={sideOffset}
      align={align}
      className={cn(
        'z-50 rounded-card border border-border bg-surface-raised shadow-lift',
        // Radix calcula este origen apuntando al trigger: el popover
        // escala desde donde el usuario hizo click, no desde el centro.
        'origin-[var(--radix-popper-transform-origin)]',
        'data-[state=open]:animate-[popover-show_160ms_var(--ease-out)]',
        'data-[state=closed]:animate-[popover-hide_120ms_var(--ease-in-out)]',
        className,
      )}
      {...props}
    />
  </RadixPopover.Portal>
);
