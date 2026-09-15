import { Dialog as RadixDialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export const DialogContent = ({
  className,
  children,
  size = 'md',
  ...props
}: React.ComponentProps<typeof RadixDialog.Content> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px]',
          'data-[state=open]:animate-[overlay-show_200ms_var(--ease-out)]',
          'data-[state=closed]:animate-[overlay-hide_150ms_var(--ease-in-out)]',
        )}
      />
      {/*
        El centrado lo hace ESTE contenedor con flexbox, no un
        left-1/2 + translate-x-1/2 en el Content. Un left/top + translate
        estatico competia con la keyframe de entrada/salida (las dos animan
        "posicion") y al terminar la animacion sin fill-mode se quedaba solo
        la utilidad estatica -- el modal aparecia desplazado y luego
        "saltaba" al centro. Con flexbox, Content no necesita transform de
        posicion en ningun momento: la keyframe de abajo solo anima
        opacity/scale, que nunca compite con nada.
      */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <RadixDialog.Content
          className={cn(
            // relative es obligatorio: el boton de cerrar es absolute y,
            // como Content ya no es "fixed" (el centrado lo hace el
            // contenedor de afuera), sin esto se posicionaria contra el
            // wrapper de pantalla completa en vez de contra la tarjeta.
            'relative w-full overflow-y-auto bg-surface-raised p-6 shadow-panel',
            // Movil: pantalla completa. Un formulario de varios renglones
            // (Compras) se siente atrapado en un modal centrado de 90vh con
            // margen alrededor; desde sm: vuelve al modal centrado y acotado
            // de siempre. ponytail: reusa la misma transicion opacity/scale
            // en vez de una entrada deslizada propia para movil -- subir a
            // eso si el fundido en pantalla completa se siente brusco.
            // Sin rounded-none aqui: compite con sm:rounded-card por la misma
            // propiedad y Tailwind los emite en un orden donde rounded-none
            // gana siempre, incluso en sm:+. Sin clase, el radio ya es 0 por
            // defecto del navegador -- no hace falta forzarlo.
            'fixed inset-0 h-dvh max-h-none',
            'sm:static sm:inset-auto sm:h-auto sm:max-h-[90vh] sm:rounded-card',
            'data-[state=open]:animate-[dialog-content-show_220ms_var(--ease-out)]',
            'data-[state=closed]:animate-[dialog-content-hide_150ms_var(--ease-in-out)]',
            widths[size],
            className,
          )}
          {...props}
        >
          {children}
          <RadixDialog.Close className="absolute right-4 top-4 rounded-input p-1.5 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            <X className="size-4" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </div>
    </RadixDialog.Portal>
  );
};

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-5 flex flex-col gap-1.5 pr-8', className)} {...props} />
);

export const DialogTitle = ({ className, ...props }: React.ComponentProps<typeof RadixDialog.Title>) => (
  <RadixDialog.Title className={cn('text-heading-sm font-bold tracking-tight text-text', className)} {...props} />
);

export const DialogDescription = ({ className, ...props }: React.ComponentProps<typeof RadixDialog.Description>) => (
  <RadixDialog.Description className={cn('text-body-sm text-text-muted', className)} {...props} />
);

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-7 flex items-center justify-end gap-2.5', className)} {...props} />
);
