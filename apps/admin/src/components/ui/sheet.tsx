// Variante del Dialog que entra deslizando desde un lado: menu movil,
// paneles de detalle.
import { Dialog as RadixDialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export const SheetContent = ({
  className,
  children,
  side = 'left',
  ...props
}: React.ComponentProps<typeof RadixDialog.Content> & { side?: 'left' | 'right' }) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px]',
        'data-[state=open]:animate-[overlay-show_200ms_var(--ease-out)]',
        'data-[state=closed]:animate-[overlay-hide_150ms_var(--ease-in-out)]',
      )}
    />
    <RadixDialog.Content
      className={cn(
        'fixed top-0 z-50 h-full w-80 max-w-[85vw] overflow-y-auto bg-surface-raised p-4 shadow-panel',
        side === 'left' ? 'left-0' : 'right-0',
        'data-[state=open]:animate-[sheet-content-show-left_220ms_var(--ease-drawer,var(--ease-out))]',
        'data-[state=closed]:animate-[sheet-content-hide-left_160ms_var(--ease-in-out)]',
        className,
      )}
      {...props}
    >
      {children}
      <RadixDialog.Close className="absolute right-3 top-3 rounded-input p-1.5 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text">
        <X className="size-4" />
      </RadixDialog.Close>
    </RadixDialog.Content>
  </RadixDialog.Portal>
);

export const SheetTitle = RadixDialog.Title;
