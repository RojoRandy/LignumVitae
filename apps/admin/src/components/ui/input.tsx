import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/*
 * El chasis visual de todo control de una linea (Input, NumberInput, el
 * disparador de Select y el de DatePicker) vive aqui y en ningun otro lado.
 * Antes cada uno repetia la misma cadena de clases a mano y por eso se iban
 * separando en silencio: el <select> nativo tenia pr-9 y el Combobox no, el
 * DatePicker perdio el placeholder:text-text-faint en algun momento. Un
 * solo origen de verdad es la unica forma de que la consistencia visual se
 * sostenga sin que alguien tenga que acordarse de copiar bien.
 */
export const controlShell =
  'flex h-11 w-full items-center rounded-input border border-border-strong bg-white px-3.5 text-body text-text transition-colors';

/** Para controles que SON el elemento enfocable (input, button-disparador). */
export const controlFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent';

/** Para envolturas que CONTIENEN al elemento enfocable (NumberInput con unidad). */
export const controlFocusWithinRing = 'focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent';

export const controlDisabled = 'disabled:cursor-not-allowed disabled:opacity-50';

export const controlInvalid = 'border-danger-solid ring-2 ring-danger-solid/25';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        controlShell,
        controlFocusRing,
        controlDisabled,
        'placeholder:text-text-faint',
        // El date/time picker nativo del navegador se ve fuera de lugar
        // junto a los primitivos propios: se le quita el icono default y
        // se estandariza con el resto (DatePicker propio cubre los casos
        // que de verdad necesitan calendario visual).
        '[&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
