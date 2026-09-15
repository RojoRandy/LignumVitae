// Renglon etiqueta/importe de los paneles de totales. Estaba duplicado byte
// a byte en QuotationDetailPage y QuotationFormPage, y una tercera vez en
// linea dentro de OrderDetailPage.
import { cn } from '@/lib/cn';

export const MoneyRow = ({
  label,
  value,
  strong,
  accent,
  muted,
}: {
  label: string;
  value: string;
  /** El total de la cotizacion: el numero mas grande del panel. */
  strong?: boolean;
  /** Dato accionable (anticipo requerido), en color de acento. */
  accent?: boolean;
  /** Dato interno (costo, margen): presente pero en segundo plano. */
  muted?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className={muted ? 'text-text-muted' : 'text-text'}>{label}</span>
    <span
      className={cn(
        'tabular-nums',
        strong ? 'text-heading font-semibold text-text' : accent ? 'font-semibold text-accent' : muted ? 'text-text-muted' : 'font-medium text-text',
      )}
    >
      {value}
    </span>
  </div>
);
