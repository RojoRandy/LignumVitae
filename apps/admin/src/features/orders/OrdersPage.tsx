import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { httpGet } from '@/lib/http';
import type { OrderDto, OrderStatus, Paginated } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { OrderBoard } from './components/order-board';
import { OrderDetail, STATUS_LABEL } from './components/order-detail';
import { PageHeader, PageToolbar } from '@/components/ui/page';
import { PaymentProgress } from '@/components/domain/payment-progress';

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING_DEPOSIT: 'warning',
  CONFIRMED: 'info',
  IN_PRODUCTION: 'info',
  READY: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export default function OrdersPage() {
  const { page, setPage } = useTableParams();
  const [closedStatus, setClosedStatus] = useState<'DELIVERED' | 'CANCELLED'>('DELIVERED');
  const [openOrder, setOpenOrder] = useState<OrderDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status: closedStatus }],
    queryFn: () => httpGet<Paginated<OrderDto>>('/orders', { page, status: closedStatus, limit: 20 }),
  });

  const columns: ColumnDef<OrderDto, unknown>[] = [
    { header: 'Folio', accessorKey: 'folio' },
    {
      header: 'Cliente',
      cell: ({ row }) => row.original.customer?.fullName ?? '—',
      // Bajo el folio en la tarjeta movil, como el SKU bajo el nombre en Productos.
      meta: { mobile: 'subtitle' },
    },
    { header: 'Entrega', cell: ({ row }) => formatDate(row.original.dueDate) },
    { header: 'Total', cell: ({ row }) => formatMoney(row.original.total) },
    {
      header: 'Cobrado',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <PaymentProgress paid={row.original.paidAmount} total={row.original.total} size="sm" />
          <span className="text-caption text-text-muted">{formatMoney(row.original.paidAmount)}</span>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: ({ row }) => <Badge variant={STATUS_TONE[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge>,
      // A la derecha en la tarjeta movil: se ve de inmediato sin bajar la vista.
      meta: { mobile: 'trailing' },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pedidos"
        description="Tablero de produccion. Arrastra una tarjeta para cambiar su estado."
      />

      <OrderBoard onOpen={setOpenOrder} />

      <h2 className="text-body font-semibold text-text">Cerrados</h2>

      <PageToolbar
        filters={
          <div className="w-full sm:w-64">
            <Select
              options={[
                { value: 'DELIVERED', label: 'Entregados' },
                { value: 'CANCELLED', label: 'Cancelados' },
              ]}
              value={closedStatus}
              onChange={(value) => {
                if (value === 'DELIVERED' || value === 'CANCELLED') {
                  setClosedStatus(value);
                  setPage(1);
                }
              }}
            />
          </div>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin pedidos" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} onRowClick={setOpenOrder} />

      <Dialog open={openOrder !== null} onOpenChange={(open) => !open && setOpenOrder(null)}>
        <DialogContent size="xl">
          <DialogTitle className="sr-only">Pedido {openOrder?.folio}</DialogTitle>
          {openOrder && <OrderDetail orderId={String(openOrder.id)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
