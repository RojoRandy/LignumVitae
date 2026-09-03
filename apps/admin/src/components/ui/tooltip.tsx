import { Tooltip as RadixTooltip } from 'radix-ui';
import { cn } from '@/lib/cn';

// skipDelayDuration: una vez que un tooltip esta abierto, pasar a otro
// vecino lo abre al instante (sin el delay inicial) durante 300ms. Se
// siente mas rapido sin perder la proteccion contra activacion accidental.
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <RadixTooltip.Provider delayDuration={400} skipDelayDuration={300}>
    {children}
  </RadixTooltip.Provider>
);

export const Tooltip = ({
  content,
  children,
  side = 'top',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => (
  <RadixTooltip.Root>
    <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
    <RadixTooltip.Portal>
      <RadixTooltip.Content
        side={side}
        sideOffset={6}
        className={cn(
          'z-50 max-w-64 rounded-input bg-ink px-2.5 py-1.5 text-caption font-medium text-white shadow-lift',
          'origin-[var(--radix-popper-transform-origin)]',
          'data-[state=delayed-open]:animate-[popover-show_125ms_var(--ease-out)]',
          'data-[state=closed]:animate-[popover-hide_100ms_var(--ease-in-out)]',
        )}
      >
        {content}
        <RadixTooltip.Arrow className="fill-ink" />
      </RadixTooltip.Content>
    </RadixTooltip.Portal>
  </RadixTooltip.Root>
);
