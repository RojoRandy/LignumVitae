/*
 * Panel de totales de los formularios y detalles largos (cotizacion, pedido,
 * producto).
 *
 * En escritorio es la tarjeta sticky de siempre. El problema era movil: al
 * apilarse la rejilla, el total quedaba al final de la pagina, asi que
 * capturabas renglones sin ver nunca cuanto llevabas. Abajo de lg el panel
 * se convierte en una barra fija con el total y un boton que abre el
 * desglose completo en un Sheet.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export const StickySummary = ({
  title,
  /** La cifra que se ve sin abrir nada. Ya formateada. */
  total,
  /** Opcional, junto al total en la barra movil (ej. "Vista previa"). */
  hint,
  children,
}: {
  title: string;
  total: string;
  hint?: string;
  children: ReactNode;
}) => (
  <>
    <Card className="sticky top-4 hidden h-fit flex-col gap-3 p-4 lg:flex">
      <h2 className="text-body font-semibold text-text">{title}</h2>
      {children}
    </Card>

    {/* Espaciador: la barra es fixed y si no taparia el ultimo control. */}
    <div className="h-[72px] lg:hidden" aria-hidden="true" />
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-panel lg:hidden">
      <div className="flex min-w-0 flex-col">
        <span className="text-caption text-text-muted">{hint ?? title}</span>
        <span className="truncate text-heading-sm font-semibold tabular-nums text-text">{total}</span>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary" size="sm" className="shrink-0">
            Ver desglose
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col gap-3">
          <SheetTitle className="text-body font-semibold text-text">{title}</SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    </div>
  </>
);
