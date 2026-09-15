// Alta/edicion de cotizacion. Solo editable en DRAFT: una vez enviada, esta
// pagina se abre en modo lectura con un banner y un link al detalle -- el
// panel de totales aqui es SOLO vista previa (POST /quotations/preview-totals,
// sin guardar), la fuente de la verdad es lo que el servidor recalcula al
// guardar de verdad, igual que el panel de costo del asistente de producto.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpGet, httpPatch, httpPost } from '@/lib/http';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useCustomerOptions } from '@/hooks/use-customer-options';
import type { AdjustmentTypeValue, QuotationDto, SettingsDto } from '@/lib/types';
import { formatMoney, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { FormError, PageHeader, PageState } from '@/components/ui/page';
import { MoneyRow } from '@/components/domain/money-row';
import { QuotationLineItemEditor, type QuotationLineItemRow } from './components/quotation-line-item-editor';
import { useQuotationTotalsPreview } from './use-quotation-totals-preview';

export default function QuotationFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formError, handleError, clear } = useFieldErrors();
  const { options: customerOptions } = useCustomerOptions();

  const [customerId, setCustomerId] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<AdjustmentTypeValue>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | null>(0);
  const [shippingCost, setShippingCost] = useState<number | null>(0);
  const [rows, setRows] = useState<QuotationLineItemRow[]>([]);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => httpGet<QuotationDto>(`/quotations/${id}`),
    enabled: isEditing,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => httpGet<SettingsDto>('/settings'),
    staleTime: 60_000,
  });

  const readOnly = isEditing && existing && existing.status !== 'DRAFT';

  useEffect(() => {
    if (!existing) return;
    setCustomerId(String(existing.customerId));
    setEventDate(existing.eventDate ? new Date(existing.eventDate) : undefined);
    setNotes(existing.notes ?? '');
    setTerms(existing.terms ?? '');
    setDiscountEnabled(existing.discountEnabled);
    setDiscountType(existing.discountType);
    setDiscountValue(Number(existing.discountValue));
    setShippingCost(Number(existing.shippingCost));
    setRows(
      (existing.items ?? []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        candleColor: item.candleColor ?? '',
        ribbonColor: item.ribbonColor ?? '',
        withFragrance: item.withFragrance,
        fragranceName: item.fragranceName ?? '',
        personalizationText: item.personalizationText ?? '',
        setupMinutesOverride: item.setupMinutesOverride,
        unitPriceOverride: item.priceVariance !== '0' ? Number(item.unitListPrice) + Number(item.priceVariance) : null,
      })),
    );
  }, [existing]);

  useEffect(() => {
    if (!settings || isEditing) return;
    setTerms(settings.quotationTerms ?? '');
  }, [settings, isEditing]);

  const previewInput = useMemo(
    () => ({
      items: rows
        .filter((r): r is QuotationLineItemRow & { productId: number; quantity: number } => Boolean(r.productId) && Boolean(r.quantity))
        .map((r) => ({
          productId: r.productId,
          quantity: r.quantity,
          candleColor: r.candleColor || undefined,
          ribbonColor: r.ribbonColor || undefined,
          withFragrance: r.withFragrance,
          fragranceName: r.fragranceName || undefined,
          personalizationText: r.personalizationText || undefined,
          setupMinutesOverride: r.setupMinutesOverride ?? undefined,
          unitPriceOverride: r.unitPriceOverride ?? undefined,
        })),
      discountEnabled,
      discountType,
      discountValue: discountValue ?? 0,
      shippingCost: shippingCost ?? 0,
    }),
    [rows, discountEnabled, discountType, discountValue, shippingCost],
  );

  const { data: preview, isFetching: previewLoading } = useQuotationTotalsPreview(previewInput);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEditing ? httpPatch<QuotationDto>(`/quotations/${id}`, body) : httpPost<QuotationDto>('/quotations', body),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(isEditing ? 'Cotizacion actualizada' : 'Cotizacion creada');
      navigate(`/cotizaciones/${quotation.id}`);
    },
    onError: handleError,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clear();
    if (!customerId) {
      handleError(new Error('Elige un cliente'));
      return;
    }
    if (previewInput.items.length === 0) {
      handleError(new Error('Agrega al menos un renglon'));
      return;
    }
    saveMutation.mutate({
      customerId: Number(customerId),
      eventDate: eventDate ? eventDate.toISOString().slice(0, 10) : undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      discountEnabled,
      discountType,
      discountValue: discountValue ?? 0,
      shippingCost: shippingCost ?? 0,
      items: previewInput.items,
    });
  };

  if (isEditing && loadingExisting) {
    return (
      <PageState isLoading />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo="/cotizaciones"
        title={isEditing ? `Editar ${existing?.folio ?? ''}` : 'Nueva cotizacion'}
        description="Elige el cliente, agrega renglones y ajusta descuentos o envio."
      />

      {readOnly && (
        <Card className="border-warning-solid/40 bg-warning-bg p-4">
          <p className="text-body-sm text-warning-fg">
            Esta cotizacion ya no esta en borrador ({existing?.status}), asi que no se puede editar.{' '}
            <button type="button" className="font-semibold underline" onClick={() => navigate(`/cotizaciones/${id}`)}>
              Ver el detalle
            </button>
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:col-span-2" inert={readOnly || undefined}>
          <Card className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cliente" required>
                <Select options={customerOptions} value={customerId} onChange={setCustomerId} placeholder="Elegir cliente..." searchable />
              </Field>
              <Field
                label="Fecha del evento"
                hint="Opcional"
                tooltip="Si la capturas, el pedido resultante hereda esta fecha como su entrega comprometida. Debe respetar el minimo de dias de anticipacion de Configuracion."
              >
                <DatePicker value={eventDate} onChange={setEventDate} placeholder="Sin fecha de evento" />
              </Field>
            </div>
            <Field label="Notas" htmlFor="notes">
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field label="Terminos" htmlFor="terms" hint="Se imprime en el PDF">
              <Textarea id="terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </Field>
          </Card>

          <Card className="p-4">
            <QuotationLineItemEditor
              rows={rows}
              onChange={setRows}
              previews={rows.map((row) => {
                const idx = previewInput.items.findIndex((i) => i.productId === row.productId && i.quantity === row.quantity);
                const item = idx >= 0 ? preview?.totals.items[idx] : undefined;
                return item ? { unitPrice: item.unitPrice, lineTotal: item.lineTotal, lineMargin: item.lineMargin } : undefined;
              })}
            />
          </Card>

          <Card className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text">Descuento</p>
                <p className="text-caption text-text-muted">Aplica sobre el subtotal</p>
              </div>
              <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
            </div>
            {discountEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo">
                  <Select
                    options={[
                      { value: 'PERCENTAGE', label: 'Porcentaje' },
                      { value: 'FIXED', label: 'Monto fijo' },
                    ]}
                    value={discountType}
                    onChange={(v) => setDiscountType(v as AdjustmentTypeValue)}
                  />
                </Field>
                <Field label="Valor">
                  <NumberInput min={0} step={discountType === 'PERCENTAGE' ? 1 : 0.01} unit={discountType === 'PERCENTAGE' ? '%' : '$'} unitPosition={discountType === 'PERCENTAGE' ? 'suffix' : 'prefix'} value={discountValue} onChange={setDiscountValue} />
                </Field>
              </div>
            )}
            <Field label="Envio" hint="Se suma al total, no entra al costo">
              <NumberInput min={0} step={0.01} unit="$" unitPosition="prefix" value={shippingCost} onChange={setShippingCost} />
            </Field>
          </Card>

          <FormError>{formError}</FormError>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/cotizaciones')}>Cancelar</Button>
              <Button type="submit" loading={saveMutation.isPending}>Guardar</Button>
            </div>
          )}
        </form>

        <div className="lg:col-span-1">
          <Card className="sticky top-4 flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-body font-semibold text-text">Totales</h3>
              {previewLoading && <Spinner className="size-3.5" />}
            </div>
            {preview ? (
              <>
                <div className="flex flex-col gap-1.5 text-body-sm">
                  <MoneyRow label="Subtotal" value={formatMoney(preview.totals.subtotal)} />
                  {discountEnabled && <MoneyRow label="Descuento" value={`-${formatMoney(preview.totals.discountAmount)}`} />}
                  <MoneyRow label="Envio" value={formatMoney(preview.totals.shippingCost)} />
                  <Separator />
                  <MoneyRow label="Total" value={formatMoney(preview.totals.total)} strong />
                  <MoneyRow label="Anticipo requerido" value={formatMoney(preview.totals.depositAmount)} accent />
                  <Separator />
                  <MoneyRow label="Costo total" value={formatMoney(preview.totals.totalCost)} muted />
                  <MoneyRow label="Margen" value={`${formatMoney(preview.totals.grossProfit)} (${formatPercent(preview.totals.grossMarginPct)})`} muted />
                </div>
                <p className="text-caption text-text-faint">Vista previa — se recalcula al guardar.</p>
              </>
            ) : (
              <p className="text-body-sm text-text-muted">Agrega renglones para ver el total.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

