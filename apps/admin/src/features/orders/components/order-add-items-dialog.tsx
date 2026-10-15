// Agregar productos a un pedido ya aceptado. Los renglones nuevos se
// capturan con el mismo editor de la cotizacion; el servidor devuelve en vivo
// como queda todo el pedido (POST /orders/:id/items/preview), incluido el
// precio nuevo de lo que ya estaba si el pedido cruza a mayoreo. Guardar
// vuelve a correr exactamente el mismo calculo en el servidor.
import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { httpPost, errorMessage } from '@/lib/http';
import type { AddOrderItemsPreview, OrderDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  QuotationLineItemEditor,
  emptyQuotationLineRow,
  type QuotationLineItemRow,
} from '@/features/quotations/components/quotation-line-item-editor';
import { useDebounced, type QuotationLineInput } from '@/features/quotations/use-quotation-totals-preview';

const TIER_LABEL = { RETAIL: 'Menudeo', WHOLESALE: 'Mayoreo' } as const;

const toLineInput = (r: QuotationLineItemRow): QuotationLineInput => ({
  productId: r.productId!,
  quantity: r.quantity!,
  candleColor: r.candleColor || undefined,
  extraFields: r.extraFields.length ? r.extraFields : undefined,
  withFragrance: r.withFragrance,
  fragranceSupplyId: r.fragranceSupplyId ?? undefined,
  personalizationText: r.personalizationText || undefined,
  setupMinutesOverride: r.setupMinutesOverride ?? undefined,
  unitPriceOverride: r.unitPriceOverride ?? undefined,
});

export const OrderAddItemsDialog = ({ order, open, onOpenChange }: { order: OrderDto; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<QuotationLineItemRow[]>([]);
  const [prices, setPrices] = useState<Record<number, number | null>>({});

  useEffect(() => {
    if (!open) return;
    setRows([emptyQuotationLineRow()]);
    setPrices({});
  }, [open]);

  const ready = rows.length > 0 && rows.every((r) => r.productId && r.quantity && r.quantity > 0);
  const body = useMemo(
    () => ({
      items: ready ? rows.map(toLineInput) : [],
      existingPrices: Object.entries(prices)
        .filter(([, unitPrice]) => unitPrice !== null)
        .map(([itemId, unitPrice]) => ({ itemId: Number(itemId), unitPrice: unitPrice! })),
    }),
    [rows, prices, ready],
  );
  const debouncedBody = useDebounced(body, 300);

  const { data: preview, isFetching, error } = useQuery({
    queryKey: ['orders', String(order.id), 'add-items-preview', debouncedBody],
    queryFn: () => httpPost<AddOrderItemsPreview>(`/orders/${order.id}/items/preview`, debouncedBody),
    enabled: open && debouncedBody.items.length > 0,
    placeholderData: keepPreviousData,
  });
  const shown = ready ? preview : undefined;

  const mutation = useMutation({
    mutationFn: () => httpPost<OrderDto>(`/orders/${order.id}/items`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Productos agregados');
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const rowWarnings = rows.map((_, index) => {
    const w = shown?.warnings.find((warning) => warning.index === index);
    return w
      ? `Margen ${w.marginPct}% bajo el minimo de ${w.minMarginPct}%. Precio manual sugerido: ${formatMoney(w.minManualPrice)} (antes del aroma).`
      : undefined;
  });
  const previews = rows.map((_, index) => {
    const added = shown?.added[index];
    return added && { ...added, belowMinMargin: Boolean(rowWarnings[index]) };
  });
  const items = order.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Agregar productos</DialogTitle>
          <DialogDescription>
            El total, el anticipo y el nivel de precio se recalculan con todo el pedido. Si cruza a mayoreo, lo que ya estaba también cambia de precio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <QuotationLineItemEditor rows={rows} onChange={setRows} previews={previews} rowWarnings={rowWarnings} />

          <section className="flex flex-col gap-2">
            <h4 className="text-body-sm font-medium text-text">Precios de lo que ya estaba</h4>
            <div className="flex flex-col divide-y divide-border rounded-input border border-border">
              {items.map((item) => {
                const existing = shown?.existing.find((e) => e.itemId === item.id);
                const changed = existing && existing.unitPrice !== existing.previousUnitPrice;
                const warning = shown?.warnings.find((w) => w.itemId === item.id);
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-text">{item.productName}</p>
                      <p className="flex items-center gap-1.5 text-caption text-text-muted">
                        {item.quantity} × {formatMoney(item.unitPrice)}
                        {changed && (
                          <>
                            <ArrowRight className="size-3" aria-hidden />
                            <span className="font-medium text-text">{formatMoney(existing.unitPrice)}</span>
                          </>
                        )}
                        {item.candleColor ? ` · ${item.candleColor}` : ''}
                      </p>
                      {warning && (
                        <p className="text-caption text-warning-fg">
                          Margen {warning.marginPct}% bajo el minimo de {warning.minMarginPct}%. Precio final minimo: {formatMoney(warning.minUnitPrice)}.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`existing-price-${item.id}`} className="text-caption text-text-muted">Precio final por pieza</label>
                      <NumberInput
                        id={`existing-price-${item.id}`}
                        className="w-32"
                        min={0}
                        step={0.01}
                        unit="$"
                        unitPosition="prefix"
                        placeholder={existing ? existing.unitPrice.toFixed(2) : undefined}
                        value={prices[item.id] ?? null}
                        onChange={(value) => setPrices((current) => ({ ...current, [item.id]: value }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-caption text-text-muted">Vacío: se queda con el precio que se muestra. El precio final incluye el aroma.</p>
          </section>

          <section className="flex flex-col gap-1.5 rounded-input bg-surface-sunken px-4 py-3 text-body-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Nivel de precio</span>
              {shown ? <Badge variant={shown.priceTier === 'WHOLESALE' ? 'success' : 'info'}>{TIER_LABEL[shown.priceTier]}</Badge> : <span>—</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Piezas</span>
              <span className="text-text">{order.totalQuantity} → {shown?.totalQuantity ?? '—'}</span>
            </div>
            {shown && shown.discountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Descuento</span>
                <span className="text-text">−{formatMoney(shown.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total</span>
              <span className={cn('font-semibold text-text', isFetching && 'opacity-60')}>
                {formatMoney(order.total)} → {shown ? formatMoney(shown.total) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Anticipo requerido</span>
              <span className="text-text">{formatMoney(order.depositAmount)} → {shown ? formatMoney(shown.depositAmount) : '—'}</span>
            </div>
            {error && ready && <p className="text-caption text-danger-fg">{errorMessage(error)}</p>}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={!ready || !shown} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
