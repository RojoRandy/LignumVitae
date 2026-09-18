import { DropdownMenu as RadixDropdownMenu } from 'radix-ui';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './portal-container';

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;
export const DropdownMenuGroup = RadixDropdownMenu.Group;
export const DropdownMenuSub = RadixDropdownMenu.Sub;
export const DropdownMenuRadioGroup = RadixDropdownMenu.RadioGroup;

const menuContentClass =
  'z-50 min-w-48 overflow-hidden rounded-card border border-border bg-surface-raised p-1.5 shadow-lift ' +
  'origin-[var(--radix-popper-transform-origin)] ' +
  'data-[state=open]:animate-[popover-show_160ms_var(--ease-out)] ' +
  'data-[state=closed]:animate-[popover-hide_120ms_var(--ease-in-out)]';

export const DropdownMenuContent = ({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof RadixDropdownMenu.Content>) => {
  const portalContainer = usePortalContainer();
  return (
    <RadixDropdownMenu.Portal container={portalContainer}>
      <RadixDropdownMenu.Content sideOffset={sideOffset} className={cn(menuContentClass, className)} {...props} />
    </RadixDropdownMenu.Portal>
  );
};

export const DropdownMenuItem = ({ className, ...props }: React.ComponentProps<typeof RadixDropdownMenu.Item>) => (
  <RadixDropdownMenu.Item
    className={cn(
      'flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-body-sm text-text outline-none transition-colors',
      'data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-hover data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
);

export const DropdownMenuCheckboxItem = ({ className, children, ...props }: React.ComponentProps<typeof RadixDropdownMenu.CheckboxItem>) => (
  <RadixDropdownMenu.CheckboxItem
    className={cn(
      'relative flex cursor-pointer items-center gap-2.5 rounded-[8px] py-2 pl-8 pr-2.5 text-body-sm outline-none transition-colors data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-hover',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex size-4 items-center justify-center">
      <RadixDropdownMenu.ItemIndicator>
        <Check className="size-3.5" />
      </RadixDropdownMenu.ItemIndicator>
    </span>
    {children}
  </RadixDropdownMenu.CheckboxItem>
);

export const DropdownMenuRadioItem = ({ className, children, ...props }: React.ComponentProps<typeof RadixDropdownMenu.RadioItem>) => (
  <RadixDropdownMenu.RadioItem
    className={cn(
      'relative flex cursor-pointer items-center gap-2.5 rounded-[8px] py-2 pl-8 pr-2.5 text-body-sm outline-none transition-colors data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-hover',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex size-4 items-center justify-center">
      <RadixDropdownMenu.ItemIndicator>
        <Circle className="size-2 fill-current" />
      </RadixDropdownMenu.ItemIndicator>
    </span>
    {children}
  </RadixDropdownMenu.RadioItem>
);

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof RadixDropdownMenu.Label>) => (
  <RadixDropdownMenu.Label className={cn('px-2.5 py-1.5 text-micro font-bold uppercase tracking-wide text-text-faint', className)} {...props} />
);

export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof RadixDropdownMenu.Separator>) => (
  <RadixDropdownMenu.Separator className={cn('my-1.5 h-px bg-border', className)} {...props} />
);

export const DropdownMenuSubTrigger = ({ className, children, ...props }: React.ComponentProps<typeof RadixDropdownMenu.SubTrigger>) => (
  <RadixDropdownMenu.SubTrigger
    className={cn(
      'flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-body-sm outline-none transition-colors data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-hover',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-3.5" />
  </RadixDropdownMenu.SubTrigger>
);

export const DropdownMenuSubContent = ({ className, ...props }: React.ComponentProps<typeof RadixDropdownMenu.SubContent>) => {
  const portalContainer = usePortalContainer();
  return (
    <RadixDropdownMenu.Portal container={portalContainer}>
      <RadixDropdownMenu.SubContent className={cn(menuContentClass, className)} {...props} />
    </RadixDropdownMenu.Portal>
  );
};
