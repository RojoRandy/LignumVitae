import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Download, FileStack, MoreHorizontal, Pencil, Send, X } from 'lucide-react';
import { downloadPdf, errorMessage, httpGet, httpPost } from '@/lib/http';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { QuotationDto, QuotationStatus } from '@/lib/types';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader, PageState } from '@/components/ui/page';
import { MoneyRow } from '@/components/domain/money-row';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: 'Borrador', SENT: 'Enviada', VIEWED: 'Vista', ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida',
};
const STATUS_TONE: Record<QuotationStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'neutral', SENT: 'info', VIEWED: 'info', ACCEPTED: 'success', REJECTED: 'danger', EXPIRED: 'warning',
};

const PUBLIC_SITE_URL = import.meta.env.VITE_PUBLIC_SITE_URL ?? 'http://localhost:4321';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => httpGet<QuotationDto>(`/quotations/${id}`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotations'] });
    queryClient.invalidateQueries({ queryKey: ['quotations', id] });
  };

  const sendMutation = useMutation({
    mutationFn: () => httpPost(`/quotations/${id}/send`),
    onSuccess: () => { invalidate(); toast.success('Cotizacion enviada'); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => httpPost(`/quotations/${id}/reject`),
    onSuccess: () => { invalidate(); toast.success('Cotizacion rechazada'); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => httpPost<QuotationDto>(`/quotations/${id}/duplicate`),
    onSuccess: (dup) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Duplicada como ${dup.folio}`);
      navigate(`/cotizaciones/${dup.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const acceptMutation = useMutation({
    mutationFn: () => httpPost<{ id: number }>(`/orders/from-quotation/${id}`),
    onSuccess: (order) => {
      invalidate();
      toast.success('Pedido creado');
      navigate(`/pedidos/${order.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const downloadMutation = useMutation({
    mutationFn: (filename: string) => downloadPdf(`/quotations/${id}/pdf`, filename),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const handleReject = async () => {
    const ok = await confirm({ title: '¿Rechazar esta cotizacion?', description: 'El cliente no podra aceptarla despues.' });
    if (ok) rejectMutation.mutate();
  };

  const handleAccept = async () => {
    const ok = await confirm({
      title: '¿Aceptar y crear pedido?',
      description: 'Esto crea el pedido con el anticipo pendiente de cobrar. No se puede deshacer.',
      confirmLabel: 'Aceptar y crear pedido',
      variant: 'primary',
    });
    if (ok) acceptMutation.mutate();
  };

  const copyPublicLink = () => {
    if (!quotation) return;
    const url = `${PUBLIC_SITE_URL}/cotizacion/${quotation.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado');
  };

  if (isLoading || !quotation) {
    return (
      <PageState isLoading />
    );
  }

  const canSend = quotation.status === 'DRAFT';
  const canAcceptReject = quotation.status === 'SENT' || quotation.status === 'VIEWED';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo="/cotizaciones"
        title={quotation.folio}
        description={quotation.customer?.fullName}
        badge={<Badge variant={STATUS_TONE[quotation.status]}>{STATUS_LABEL[quotation.status]}</Badge>}
        actions={
          <>
            {/* Una sola accion primaria, la que toca segun el estado. Antes
                eran hasta 7 botones del mismo peso que en movil se
                envolvian en un muro y no decian por donde seguir. */}
            {canSend && (
              <Button onClick={() => sendMutation.mutate()} loading={sendMutation.isPending}>
                <Send className="size-4" /> Enviar
              </Button>
            )}
            {canAcceptReject && (
              <Button onClick={handleAccept} loading={acceptMutation.isPending}>
                Aceptar y crear pedido
              </Button>
            )}
            {quotation.order && (
              <Button variant="secondary" onClick={() => navigate(`/pedidos/${quotation.order!.id}`)}>
                Ver pedido {quotation.order.folio}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" aria-label="Mas acciones">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {quotation.status === 'DRAFT' && (
                  <DropdownMenuItem onSelect={() => navigate(`/cotizaciones/${id}/editar`)}>
                    <Pencil className="size-3.5" /> Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => downloadMutation.mutate(`${quotation.folio}.pdf`)}>
                  <Download className="size-3.5" /> Descargar PDF
                </DropdownMenuItem>
                {quotation.status !== 'DRAFT' && (
                  <DropdownMenuItem onSelect={copyPublicLink}>
                    <Copy className="size-3.5" /> Copiar enlace
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => duplicateMutation.mutate()}>
                  <FileStack className="size-3.5" /> Duplicar
                </DropdownMenuItem>
                {canAcceptReject && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleReject} className="text-danger-fg">
                      <X className="size-3.5" /> Rechazar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div><p className="text-caption text-text-muted">Emitida</p><p className="text-body-sm font-medium text-text">{formatDate(quotation.issuedAt)}</p></div>
            <div><p className="text-caption text-text-muted">Vigente hasta</p><p className="text-body-sm font-medium text-text">{formatDate(quotation.validUntil)}</p></div>
            <div><p className="text-caption text-text-muted">Fecha del evento</p><p className="text-body-sm font-medium text-text">{quotation.eventDate ? formatDate(quotation.eventDate) : '—'}</p></div>
            <div><p className="text-caption text-text-muted">Piezas</p><p className="text-body-sm font-medium text-text">{quotation.totalQuantity}</p></div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-body font-semibold text-text">Renglones</h3>
            <div className="flex flex-col divide-y divide-border">
              {(quotation.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div>
                    <p className="text-body-sm font-medium text-text">{item.product?.name}</p>
                    <p className="text-caption text-text-muted">
                      {[item.candleColor, item.ribbonColor, item.withFragrance ? `Aroma${item.fragranceSupply?.name ? `: ${item.fragranceSupply.name}` : ''}` : null, item.personalizationText]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm text-text">{item.quantity} × {formatMoney(item.unitPrice)}</p>
                    <p className="text-caption text-text-muted">{formatMoney(item.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {(quotation.notes || quotation.terms) && (
            <Card className="flex flex-col gap-3 p-4">
              {quotation.notes && <div><p className="text-caption font-semibold text-text-muted">Notas</p><p className="text-body-sm text-text">{quotation.notes}</p></div>}
              {quotation.terms && <div><p className="text-caption font-semibold text-text-muted">Terminos</p><p className="text-body-sm whitespace-pre-line text-text">{quotation.terms}</p></div>}
            </Card>
          )}
        </div>

        <Card className="sticky top-4 flex h-fit flex-col gap-1.5 p-4 text-body-sm">
          <MoneyRow label="Subtotal" value={formatMoney(quotation.subtotal)} />
          {quotation.discountEnabled && <MoneyRow label="Descuento" value={`-${formatMoney(quotation.discountAmount)}`} />}
          <MoneyRow label="Envio" value={formatMoney(quotation.shippingCost)} />
          <Separator />
          <MoneyRow label="Total" value={formatMoney(quotation.total)} strong />
          <MoneyRow label="Anticipo requerido" value={formatMoney(quotation.depositAmount)} accent />
          <Separator />
          <MoneyRow label="Costo total" value={formatMoney(quotation.totalCost)} muted />
          <MoneyRow label="Margen" value={`${formatMoney(quotation.grossProfit)} (${formatPercent(quotation.grossMarginPct)})`} muted />
        </Card>
      </div>
    </div>
  );
}

