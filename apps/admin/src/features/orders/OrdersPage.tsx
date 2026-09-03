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
    { header: 'Cliente', cell: ({ row }) => row.original.customer?.fullName ?? '—' },
    { header: 'Entrega', cell: ({ row }) => formatDate(row.original.dueDate) },
    { header: 'Total', cell: ({ row }) => formatMoney(row.original.total) },
    {
      header: 'Cobrado',
      cell: ({ row }) => {
        const pct = Number(row.original.total) > 0 ? Math.min(100, (Number(row.original.paidAmount) / Number(row.original.total)) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-caption text-text-muted">{formatMoney(row.original.paidAmount)}</span>
          </div>
        );
      },
    },
    { header: 'Estado', cell: ({ row }) => <Badge variant={STATUS_TONE[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge> },
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
      <div>
        <h1 className="text-heading-lg font-semibold text-text">Pedidos</h1>
        <p className="text-body-sm text-text-muted">Ordenados por fecha de entrega: la cola de produccion.</p>
      </div>

      <div className="max-w-xs">
        <Select
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          value={status}
          onChange={setStatus}
          placeholder="Todos los estados"
          clearable
        />
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin pedidos" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />
    </div>
  );
}
