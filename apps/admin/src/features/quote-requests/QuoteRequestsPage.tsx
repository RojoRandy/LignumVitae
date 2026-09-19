// Bandeja de solicitudes que llegan del cotizador publico de la landing. Una
// solicitud no tiene precio ni cliente: de aqui sale "Crear cotizacion", que
// abre el alta precargada, o se descarta.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { errorMessage, httpGet, httpPost } from '@/lib/http';
import type { Paginated, QuoteRequestDto, QuoteRequestStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

const STATUS_LABEL: Record<QuoteRequestStatus, string> = {
  NEW: 'Nueva',
  CONVERTED: 'Convertida',
  DISMISSED: 'Descartada',
};
const STATUS_TONE: Record<QuoteRequestStatus, 'info' | 'success' | 'neutral'> = {
  NEW: 'info',
  CONVERTED: 'success',
  DISMISSED: 'neutral',
};

const totalPieces = (request: QuoteRequestDto) => request.items.reduce((acc, item) => acc + item.quantity, 0);
const whatsappUrl = (phone: string) => `https://wa.me/52${phone}`;

const QuoteRequestDetail = ({ request, onDone }: { request: QuoteRequestDto; onDone: () => void }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const dismissMutation = useMutation({
    mutationFn: () => httpPost<QuoteRequestDto>(`/quote-requests/${request.id}/dismiss`, { reason: reason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      toast.success('Solicitud descartada');
      onDone();
    },
  });

  const handleDismiss = async () => {
    const ok = await confirm({ title: `¿Descartar la solicitud de ${request.fullName}?`, description: 'Ya no se podra convertir en cotizacion.' });
    if (ok) dismissMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pr-8">
        <SheetTitle className="text-heading-sm font-semibold text-text">{request.fullName}</SheetTitle>
        <p className="text-body-sm text-text-muted">Recibida {formatDateTime(request.createdAt)}</p>
        <div>
          <Badge variant={STATUS_TONE[request.status]}>{STATUS_LABEL[request.status]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-caption text-text-muted">WhatsApp</p>
          <a className="text-body-sm font-medium text-accent underline" href={whatsappUrl(request.whatsapp)} target="_blank" rel="noreferrer">
            {request.whatsapp}
          </a>
        </div>
        <div>
          <p className="text-caption text-text-muted">Fecha del evento</p>
          <p className="text-body-sm font-medium text-text">{formatDate(request.eventDate)}</p>
        </div>
      </div>

      <Separator />

      <ul className="flex flex-col gap-3">
        {request.items.map((item, index) => (
          <li key={`${item.productId}-${index}`} className="flex flex-col gap-0.5">
            <p className="text-body-sm font-medium text-text">
              {formatNumber(item.quantity)} × {item.productName}
            </p>
            <p className="text-caption text-text-muted">
              {[
                item.candleColor && `Vela: ${item.candleColor}`,
                item.ribbonColor && `Liston: ${item.ribbonColor}`,
                ...(item.extraFields ?? []).map((field) => `${field.label}: ${field.value}`),
                item.withFragrance ? `Aroma: ${item.fragranceName ?? 'sin especificar'}` : 'Sin aroma',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ul>

      {request.notes && (
        <div>
          <p className="text-caption text-text-muted">Notas</p>
          <p className="whitespace-pre-line text-body-sm text-text">{request.notes}</p>
        </div>
      )}

      {request.status === 'CONVERTED' && request.convertedQuotationId && (
        <Link className="text-body-sm font-medium text-accent underline" to={`/cotizaciones/${request.convertedQuotationId}`}>
          Ver la cotizacion
        </Link>
      )}

      {request.status === 'DISMISSED' && request.dismissedReason && (
        <p className="text-body-sm text-text-muted">Motivo: {request.dismissedReason}</p>
      )}

      {request.status === 'NEW' && (
        <>
          <Separator />
          <Button onClick={() => navigate(`/cotizaciones/nueva?solicitud=${request.id}`)}>Crear cotizacion</Button>
          <Field label="Motivo para descartar" hint="Opcional" htmlFor="dismiss-reason">
            <Textarea id="dismiss-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <FormError>{dismissMutation.error ? errorMessage(dismissMutation.error) : undefined}</FormError>
          <Button variant="secondary" loading={dismissMutation.isPending} onClick={handleDismiss}>
            Descartar
          </Button>
        </>
      )}
    </div>
  );
};

export default function QuoteRequestsPage() {
  const { page, setPage } = useTableParams();
  const [status, setStatus] = useState<string | undefined>('NEW');
  const [selected, setSelected] = useState<QuoteRequestDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quote-requests', { page, status }],
    queryFn: () => httpGet<Paginated<QuoteRequestDto>>('/quote-requests', { page, status, limit: 20 }),
  });

  const columns: ColumnDef<QuoteRequestDto, unknown>[] = [
    { header: 'Recibida', cell: ({ row }) => formatDateTime(row.original.createdAt) },
    { header: 'Nombre', accessorKey: 'fullName', meta: { mobile: 'subtitle' } },
    {
      header: 'WhatsApp',
      cell: ({ row }) => (
        <a className="text-accent underline" href={whatsappUrl(row.original.whatsapp)} target="_blank" rel="noreferrer">
          {row.original.whatsapp}
        </a>
      ),
    },
    { header: 'Evento', cell: ({ row }) => formatDate(row.original.eventDate) },
    { header: 'Piezas', cell: ({ row }) => formatNumber(totalPieces(row.original)) },
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
          <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>Ver</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Solicitudes web" description="Lo que piden los clientes desde la landing. Aun sin precio: conviertelas en cotizacion." />

      <PageToolbar
        filters={
          <div className="w-full sm:w-64">
            <Select
              options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              placeholder="Todos los estados"
              clearable
            />
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Sin solicitudes"
        page={data?.page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
      />

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:w-96" aria-describedby={undefined}>
          {selected && <QuoteRequestDetail key={selected.id} request={selected} onDone={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
