// Wrapper de campo de formulario: label + control + hint + error. El error
// se pasa por codigo (useFieldErrors ramifica sobre error.code, nunca sobre
// el texto), nunca se arma un mensaje generico en el cliente.
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Label } from './label';
import { Tooltip } from './tooltip';
import { cn } from '@/lib/cn';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Icono de informacion junto a la etiqueta, para campos cuyo proposito
   *  o efecto en el costeo no es obvio con solo el nombre. */
  tooltip?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const Field = ({ label, htmlFor, required, hint, error, tooltip, className, children }: FieldProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger-solid"> *</span>}
      </Label>
      {tooltip && (
        <Tooltip content={tooltip}>
          {/*
            type=button: dentro de un <form>, un boton sin type dispara
            submit al hacer click/Enter -- este solo debe abrir el tooltip.
            SI queda en el orden de tabulacion a proposito (Radix Tooltip
            tambien se abre con foco de teclado, no solo con el mouse):
            quitarlo del tab order dejaria el contenido inalcanzable para
            quien navega sin mouse, que es peor que un stop de mas.
          */}
          <button
            type="button"
            className="flex rounded-sm text-text-faint transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label={`Informacion sobre ${label}`}
          >
            <Info className="size-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
    {children}
    {error ? (
      <p className="text-caption text-danger-fg">{error}</p>
    ) : hint ? (
      <p className="text-caption text-text-muted">{hint}</p>
    ) : null}
  </div>
);
