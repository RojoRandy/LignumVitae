// Etiqueta compacta para los editores de renglon dinamico (Compras,
// plantilla de insumos, velas del ramo). `Field` es demasiado alto para un
// grid denso de varias columnas; antes estos controles solo tenian
// `placeholder`, que DESAPARECE al escribir -- de ahi que "no se sabe a
// que se refiere cada numero en cuanto se llenan".
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from './tooltip';
import { cn } from '@/lib/cn';

export interface RowFieldProps {
  label: string;
  /** Id del control de adentro. Con esto la etiqueta es un <label htmlFor>
   *  real, no solo texto que se VE junto al campo -- sin esto un lector de
   *  pantalla anuncia el input sin nombre, igual que el placeholder que este
   *  componente reemplazo. Se omite solo en renglones que no envuelven un
   *  control enfocable (ej. el "Importe" calculado, de solo lectura). */
  htmlFor?: string;
  /** Mismo criterio que Field.tooltip: solo para renglones cuyo numero no
   *  se explica solo con la etiqueta (ej. los 3 numericos de una compra). */
  tooltip?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const RowField = ({ label, htmlFor, tooltip, className, children }: RowFieldProps) => {
  const LabelTag = htmlFor ? 'label' : 'span';
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <LabelTag
        {...(htmlFor ? { htmlFor } : {})}
        className="flex items-center gap-1 text-micro font-semibold uppercase tracking-wide text-text-faint"
      >
        {label}
        {tooltip && (
          <Tooltip content={tooltip}>
            <button
              type="button"
              className="flex rounded-sm normal-case text-text-faint transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label={`Informacion sobre ${label}`}
            >
              <Info className="size-3" />
            </button>
          </Tooltip>
        )}
      </LabelTag>
      {children}
    </div>
  );
};
