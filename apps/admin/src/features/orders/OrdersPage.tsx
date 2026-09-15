import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { httpGet } from '@/lib/http';
import type { OrderDto, OrderStatus, Paginated } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageToolbar } from '@/components/ui/page';
import { PaymentProgress } from '@/components/domain/payment-progress';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: 'Pendiente anticipo',
  CONFIRMED: 'Confirmado',
  IN_PRODUCTION: 'En produccion',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};
const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING_DEPOSIT: 'warning',
  CONFIRMED: 'info',
  IN_PRODUCTION: 'info',
  READY: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { page, setPage } = useTableParams();
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { page, status }],
    queryFn: () => httpGet<Paginated<OrderDto>>('/orders', { page, status, limit: 20 }),
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
      // Junto al boton "Ver" en la tarjeta movil: se ve de inmediato sin bajar la vista.
      meta: { mobile: 'trailing' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/pedidos/${row.original.id}`)}>Ver</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pedidos"
        description="Ordenados por fecha de entrega: la cola de produccion."
      />

      <PageToolbar
        filters={
          <div className="w-full sm:w-64">
            <Select
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              value={status}
              onChange={setStatus}
              placeholder="Todos los estados"
              clearable
            />
          </div>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin pedidos" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />
    </div>
  );
}
