import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { httpGet } from '@/lib/http';
import type { Paginated, QuotationDto, QuotationStatus } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageToolbar } from '@/components/ui/page';

const STATUS_LABEL: Record<QuotationStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  VIEWED: 'Vista',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
};
const STATUS_TONE: Record<QuotationStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  VIEWED: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
};

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { page, setPage } = useTableParams();
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', { page, status }],
    queryFn: () => httpGet<Paginated<QuotationDto>>('/quotations', { page, status, limit: 20 }),
  });

  const columns: ColumnDef<QuotationDto, unknown>[] = [
    { header: 'Folio', accessorKey: 'folio' },
    {
      header: 'Cliente',
      cell: ({ row }) => row.original.customer?.fullName ?? '—',
      meta: { mobile: 'subtitle' },
    },
    { header: 'Emitida', cell: ({ row }) => formatDate(row.original.issuedAt) },
    { header: 'Vigente hasta', cell: ({ row }) => formatDate(row.original.validUntil) },
    { header: 'Total', cell: ({ row }) => formatMoney(row.original.total) },
    {
      header: 'Estado',
      cell: ({ row }) => <Badge variant={STATUS_TONE[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge>,
      meta: { mobile: 'trailing' },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/cotizaciones/${row.original.id}`)}>Ver</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Cotizaciones"
        description="Cada una congela su propio costo y precio, aunque el catalogo cambie despues."
        actions={
          <Button onClick={() => navigate('/cotizaciones/nueva')}>
            <Plus className="size-4" /> Nueva cotizacion
          </Button>
        }
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

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin cotizaciones" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />
    </div>
  );
}
