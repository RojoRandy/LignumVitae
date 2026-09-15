import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  // scale(0.97) en :active da feedback tactil instantaneo sin JS: es la
  // recomendacion directa de Emil Kowalski para botones, y CSS transitions
  // (no keyframes) permiten interrumpir el press a media animacion.
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-input font-semibold',
    'transition-[background-color,box-shadow,transform] duration-150 ease-out',
    'active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md',
        secondary: 'bg-white border border-border-strong text-text shadow-sm hover:bg-surface-sunken hover:border-text-faint',
        ghost: 'text-text hover:bg-surface-sunken',
        danger: 'bg-danger-solid text-white shadow-sm hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3.5 text-body-sm',
        md: 'h-11 px-5 text-body-sm',
        lg: 'h-12 px-6 text-body',
        icon: 'h-11 w-11 shrink-0',
        'icon-sm': 'h-9 w-9 shrink-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* Con asChild el hijo pasa TAL CUAL: Slot de Radix exige un unico
            elemento, y el hueco de {loading && ...} contaba como un segundo
            hijo, asi que cualquier <Button asChild> reventaba en runtime. */}
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
