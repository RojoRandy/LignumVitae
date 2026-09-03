import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus } from 'lucide-react';
import { httpGet, httpPatch, errorMessage } from '@/lib/http';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import type { OrderDto, OrderStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { PaymentDialog } from './components/payment-dialog';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: 'Pendiente anticipo', CONFIRMED: 'Confirmado', IN_PRODUCTION: 'En produccion',
  READY: 'Listo', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};
const METHOD_LABEL: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', OTHER: 'Otro' };

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
      <div className="flex h-40 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const paidPct = Number(order.total) > 0 ? Math.min(100, (Number(order.paidAmount) / Number(order.total)) * 100) : 0;
  const depositCovered = Number(order.paidAmount) >= Number(order.depositAmount);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-heading-lg font-semibold text-text">{order.folio}</h1>
          <p className="text-body-sm text-text-muted">
            {order.customer?.fullName}
            {order.quotation && (
              <> · <button type="button" className="underline" onClick={() => navigate(`/cotizaciones/${order.quotation!.id}`)}>de {order.quotation.folio}</button></>
            )}
          </p>
        </div>
        <Tooltip content="El estado se cambia manualmente, no hay flujo automatico (excepto el anticipo, que confirma el pedido solo)">
          <div className="w-52">
            <Select
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              value={order.status}
              onChange={(v) => statusMutation.mutate(v as OrderStatus)}
            />
          </div>
        </Tooltip>
      </div>

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

        <Card className="sticky top-4 flex h-fit flex-col gap-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-body-sm">
              <span className="text-text-muted">Cobrado</span>
              <span className="font-medium text-text">{formatMoney(order.paidAmount)} / {formatMoney(order.total)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full bg-accent transition-all" style={{ width: `${paidPct}%` }} />
            </div>
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
