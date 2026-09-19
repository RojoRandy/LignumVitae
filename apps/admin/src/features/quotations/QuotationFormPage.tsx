// Alta/edicion de cotizacion. Solo editable en DRAFT: una vez enviada, esta
// pagina se abre en modo lectura con un banner y un link al detalle -- el
// panel de totales aqui es SOLO vista previa (POST /quotations/preview-totals,
// sin guardar), la fuente de la verdad es lo que el servidor recalcula al
// guardar de verdad, igual que el panel de costo del asistente de producto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { errorMessage, httpGet, httpPatch, httpPost } from '@/lib/http';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useCustomerOptions } from '@/hooks/use-customer-options';
import type { AdjustmentTypeValue, CustomerDto, QuotationDto, QuoteRequestDto, SettingsDto } from '@/lib/types';
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
import { CustomerQuickCreateDialog } from '@/features/customers/quick-create-dialog';
import { QuotationLineItemEditor, type QuotationLineItemRow } from './components/quotation-line-item-editor';
import { useQuotationTotalsPreview, type PreviewQuotationTotalsInput } from './use-quotation-totals-preview';

export default function QuotationFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formError, handleError, clear } = useFieldErrors();
  const { options: customerOptions, customers, isLoading: loadingCustomers } = useCustomerOptions();
  const [searchParams] = useSearchParams();
  // Alta desde la bandeja de solicitudes web: /cotizaciones/nueva?solicitud=ID
  const quoteRequestId = isEditing ? undefined : Number(searchParams.get('solicitud')) || undefined;

  const [customerId, setCustomerId] = useState<string | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<AdjustmentTypeValue>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | null>(0);
  const [shippingCost, setShippingCost] = useState<number | null>(0);
  const [rows, setRows] = useState<QuotationLineItemRow[]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

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

  const { data: quoteRequest } = useQuery({
    queryKey: ['quote-requests', quoteRequestId],
    queryFn: () => httpGet<QuoteRequestDto>(`/quote-requests/${quoteRequestId}`),
    enabled: Boolean(quoteRequestId),
  });
  const fromRequest = quoteRequest?.status === 'NEW' ? quoteRequest : undefined;
  const requestCustomer = fromRequest ? customers.find((c) => c.phone === fromRequest.whatsapp) : undefined;

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
        fragranceSupplyId: item.fragranceSupplyId ?? null,
        personalizationText: item.personalizationText ?? '',
        setupMinutesOverride: item.setupMinutesOverride,
        unitPriceOverride: item.priceVariance !== '0' ? Number(item.unitListPrice) + Number(item.priceVariance) : null,
      })),
    );
  }, [existing]);

  // Igual que la precarga de `existing`, pero una sola vez: si la query se
  // refresca no debe pisar lo que la duena ya ajusto.
  const prefilledRequest = useRef(false);
  useEffect(() => {
    if (!fromRequest || prefilledRequest.current) return;
    prefilledRequest.current = true;
    // eventDate llega como fecha pura en UTC; se arma a medianoche LOCAL para
    // que el DatePicker muestre el mismo dia y toISOString() lo regrese igual.
    if (fromRequest.eventDate) {
      const [y, m, d] = fromRequest.eventDate.slice(0, 10).split('-').map(Number);
      setEventDate(new Date(y, m - 1, d));
    }
    setNotes(fromRequest.notes ?? '');
    setRows(
      fromRequest.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        candleColor: item.candleColor ?? '',
        ribbonColor: item.ribbonColor ?? '',
        withFragrance: item.withFragrance,
        fragranceSupplyId: item.fragranceSupplyId ?? null,
        personalizationText: '',
        setupMinutesOverride: null,
        unitPriceOverride: null,
      })),
    );
  }, [fromRequest]);

  const selectedRequestCustomer = useRef(false);
  useEffect(() => {
    if (!requestCustomer || selectedRequestCustomer.current) return;
    selectedRequestCustomer.current = true;
    setCustomerId(String(requestCustomer.id));
  }, [requestCustomer]);

  const createRequestCustomer = useMutation({
    mutationFn: () => httpPost<CustomerDto>('/customers', { fullName: fromRequest!.fullName, phone: fromRequest!.whatsapp }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente creado');
      setCustomerId(String(customer.id));
    },
    onError: handleError,
  });

  useEffect(() => {
    if (!settings || isEditing) return;
    setTerms(settings.quotationTerms ?? '');
  }, [settings, isEditing]);

  /*
   * previewIndexByRow existe porque el `.filter()` compactaba los renglones y
   * luego se buscaba el preview por (productId, quantity): dos renglones del
   * MISMO producto con la MISMA cantidad caian los dos en el primero, asi que
   * el segundo mostraba el precio y el margen del primero aunque tuviera otro
   * precio manual. Aqui cada renglon se queda con el indice que de verdad le
   * toco en la peticion, y los renglones incompletos valen undefined.
   */
  const { previewInput, previewIndexByRow } = useMemo(() => {
    const items: PreviewQuotationTotalsInput['items'] = [];
    const previewIndexByRow = rows.map((r) => {
      if (!r.productId || !r.quantity) return undefined;
      items.push({
        productId: r.productId,
        quantity: r.quantity,
        candleColor: r.candleColor || undefined,
        ribbonColor: r.ribbonColor || undefined,
        withFragrance: r.withFragrance,
        fragranceSupplyId: r.fragranceSupplyId ?? undefined,
        personalizationText: r.personalizationText || undefined,
        setupMinutesOverride: r.setupMinutesOverride ?? undefined,
        unitPriceOverride: r.unitPriceOverride ?? undefined,
      });
      return items.length - 1;
    });

    return {
      previewInput: {
        items,
        discountEnabled,
        discountType,
        discountValue: discountValue ?? 0,
        shippingCost: shippingCost ?? 0,
      },
      previewIndexByRow,
    };
  }, [rows, discountEnabled, discountType, discountValue, shippingCost]);

  const {
    data: preview,
    isFetching: previewLoading,
    error: previewError,
  } = useQuotationTotalsPreview(previewInput);

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
      quoteRequestId: fromRequest?.id,
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

      {quoteRequest && !fromRequest && (
        <Card className="border-warning-solid/40 bg-warning-bg p-4">
          <p className="text-body-sm text-warning-fg">
            La solicitud web #{quoteRequest.id} ya no esta nueva ({quoteRequest.status === 'CONVERTED' ? 'ya se convirtio' : 'se descarto'}), asi que no se precargo.
          </p>
        </Card>
      )}

      {fromRequest && (
        <Card className="flex flex-col gap-3 border-info-solid/40 bg-info-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-info-fg">
            Desde la solicitud web #{fromRequest.id} de {fromRequest.fullName} ({fromRequest.whatsapp}).
            {!requestCustomer && !loadingCustomers && ' Este cliente aun no esta registrado.'}
          </p>
          {!requestCustomer && !loadingCustomers && (
            <Button type="button" size="sm" loading={createRequestCustomer.isPending} onClick={() => createRequestCustomer.mutate()}>
              Darlo de alta
            </Button>
          )}
        </Card>
      )}

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

      <CustomerQuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        onCreated={(customer) => setCustomerId(String(customer.id))}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:col-span-2" inert={readOnly || undefined}>
          <Card className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cliente" required>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select options={customerOptions} value={customerId} onChange={setCustomerId} placeholder="Elegir cliente..." searchable />
                  </div>
                  <Button type="button" variant="secondary" size="icon" aria-label="Nuevo cliente" onClick={() => setQuickCreateOpen(true)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
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
              previews={rows.map((_row, rowIndex) => {
                const idx = previewIndexByRow[rowIndex];
                const item = idx === undefined ? undefined : preview?.totals.items[idx];
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

          {/*
           * El error del preview se pinta aqui porque antes no se pintaba en
           * ningun lado: con un precio manual bajo el piso de margen la API
           * responde 400, keepPreviousData deja los totales viejos en pantalla
           * y el usuario lee "bajé el precio y no recalculó".
           */}
          <FormError>{formError ?? (previewError ? errorMessage(previewError) : undefined)}</FormError>

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

