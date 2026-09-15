import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MoreHorizontal, Plus } from 'lucide-react';
import { httpGet, httpPatch, errorMessage } from '@/lib/http';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import type { OrderDto, OrderStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { PageHeader, PageState } from '@/components/ui/page';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentProgress } from '@/components/domain/payment-progress';
import { PaymentDialog } from './components/payment-dialog';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: 'Pendiente anticipo', CONFIRMED: 'Confirmado', IN_PRODUCTION: 'En produccion',
  READY: 'Listo', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};
const METHOD_LABEL: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' };

/*
 * Avance manual real: PENDING_DEPOSIT -> CONFIRMED lo hace solo el backend
 * al registrar el abono (registerPaymentUseCase), no esta aqui a proposito
 * -- el "boton primario" para ese estado es "Registrar abono", que ya vive
 * en la tarjeta de Pagos. De CONFIRMED en adelante si es un paso manual del
 * taller, uno a la vez.
 */
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  CONFIRMED: { status: 'IN_PRODUCTION', label: 'Marcar en produccion' },
  IN_PRODUCTION: { status: 'READY', label: 'Marcar listo' },
  READY: { status: 'DELIVERED', label: 'Marcar entregado' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => httpGet<OrderDto>(`/orders/${id}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => httpPatch<OrderDto>(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      toast.success('Estado actualizado');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: (paymentId: number) => httpPatch(`/payments/${paymentId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', id] });
      toast.success('Pago cancelado');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const handleCancelPayment = async (paymentId: number) => {
    const ok = await confirm({ title: '¿Cancelar este pago?', description: 'El saldo pendiente del pedido vuelve a subir. El estado del pedido no cambia solo.' });
    if (ok) cancelPaymentMutation.mutate(paymentId);
  };

  if (isLoading || !order) {
    return (
      <PageState isLoading />
    );
  }

  const depositCovered = Number(order.paidAmount) >= Number(order.depositAmount);
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo="/pedidos"
        title={order.folio}
        badge={<Badge variant={order.status === 'CANCELLED' ? 'danger' : order.status === 'DELIVERED' ? 'success' : 'info'}>{STATUS_LABEL[order.status]}</Badge>}
        description={
          <>
            {order.customer?.fullName}
            {order.quotation && (
              <>
                {' · '}
                <button type="button" className="underline" onClick={() => navigate(`/cotizaciones/${order.quotation!.id}`)}>
                  de {order.quotation.folio}
                </button>
              </>
            )}
          </>
        }
        actions={
          <>
            {nextStatus && (
              <Button onClick={() => statusMutation.mutate(nextStatus.status)} loading={statusMutation.isPending}>
                {nextStatus.label}
              </Button>
            )}
            {order.status !== 'CANCELLED' && (
              <Tooltip content="El estado se cambia manualmente, no hay flujo automatico (excepto el anticipo, que confirma el pedido solo)">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" aria-label="Cambiar estado manualmente">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Cambiar estado manualmente</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(Object.entries(STATUS_LABEL) as [OrderStatus, string][])
                      .filter(([value]) => value !== order.status)
                      .map(([value, label]) => (
                        <DropdownMenuItem key={value} onSelect={() => statusMutation.mutate(value)}>
                          {label}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </Tooltip>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <div><p className="text-caption text-text-muted">Pedido</p><p className="text-body-sm font-medium text-text">{formatDate(order.orderDate)}</p></div>
            <div><p className="text-caption text-text-muted">Entrega</p><p className="text-body-sm font-medium text-text">{formatDate(order.dueDate)}</p></div>
            <div><p className="text-caption text-text-muted">Entregado</p><p className="text-body-sm font-medium text-text">{order.deliveredAt ? formatDate(order.deliveredAt) : '—'}</p></div>
            <div><p className="text-caption text-text-muted">Piezas</p><p className="text-body-sm font-medium text-text">{order.totalQuantity}</p></div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-body font-semibold text-text">Renglones</h3>
            <div className="flex flex-col divide-y divide-border">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div>
                    <p className="text-body-sm font-medium text-text">{item.productName}</p>
                    <p className="text-caption text-text-muted">
                      {[item.candleColor, item.ribbonColor, item.withFragrance ? `Aroma${item.fragranceName ? `: ${item.fragranceName}` : ''}` : null, item.personalizationText]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <p className="text-body-sm text-text">{item.quantity} × {formatMoney(item.unitPrice)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-semibold text-text">Pagos</h3>
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)} disabled={order.status === 'CANCELLED'}>
                <Plus className="size-3.5" /> Registrar abono
              </Button>
            </div>
            {(order.payments ?? []).length === 0 ? (
              <p className="text-body-sm text-text-muted">Sin abonos registrados.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {(order.payments ?? []).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div>
                      <p className="text-body-sm font-medium text-text">
                        {formatMoney(payment.amount)} {payment.isDeposit && <Badge variant="accent" className="ml-1">Anticipo</Badge>}
                      </p>
                      <p className="text-caption text-text-muted">{METHOD_LABEL[payment.method]} · {formatDateTime(payment.paidAt)}{payment.reference ? ` · ${payment.reference}` : ''}</p>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleCancelPayment(payment.id)}>Cancelar</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="order-first flex h-fit flex-col gap-3 p-4 lg:order-none lg:sticky lg:top-4">
          {/* order-first en movil: el panel de cobro quedaba al fondo, tras
              dos Cards; en lg+ vuelve a su lugar natural (columna derecha,
              sticky) porque order-none restaura el orden del DOM. */}
          <div>
            <div className="mb-1 flex items-center justify-between text-body-sm">
              <span className="text-text-muted">Cobrado</span>
              <span className="font-medium text-text">{formatMoney(order.paidAmount)} / {formatMoney(order.total)}</span>
            </div>
            <PaymentProgress paid={order.paidAmount} total={order.total} />
          </div>
          {depositCovered && <Badge variant="success">Anticipo cubierto</Badge>}
          <div className="flex flex-col gap-1.5 text-body-sm">
            <div className="flex justify-between"><span className="text-text-muted">Anticipo requerido</span><span className="font-medium text-text">{formatMoney(order.depositAmount)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Costo total</span><span className="text-text-muted">{formatMoney(order.totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Margen</span><span className="text-text-muted">{formatMoney(order.grossProfit)}</span></div>
          </div>
        </Card>
      </div>

      <PaymentDialog order={order} open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} />
    </div>
  );
}
