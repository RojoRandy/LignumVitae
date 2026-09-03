import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPost, httpGet } from '@/lib/http';
import type { AssetDto, Paginated } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';

const KIND_LABEL: Record<string, string> = { MOLD: 'Molde', TOOL: 'Herramienta', EQUIPMENT: 'Equipo' };
const KIND_OPTIONS = [
  { value: 'MOLD', label: 'Molde' },
  { value: 'TOOL', label: 'Herramienta' },
  { value: 'EQUIPMENT', label: 'Equipo' },
];

export default function AssetsPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acquiredAt, setAcquiredAt] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { page, search }],
    queryFn: () => httpGet<Paginated<AssetDto>>('/assets', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => httpPost('/assets', body),
    onSuccess: () => {
      invalidate();
      toast.success('Activo registrado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/assets/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Activo retirado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get('name'),
      kind: form.get('kind'),
      acquiredAt: acquiredAt.toISOString().slice(0, 10),
      quantity: Number(form.get('quantity') || 1),
      unitCost: Number(form.get('unitCost')),
      usefulLifeMonths: form.get('usefulLifeMonths') ? Number(form.get('usefulLifeMonths')) : undefined,
      notes: form.get('notes') || undefined,
    });
  };

  const handleRemove = async (asset: AssetDto) => {
    const ok = await confirm({ title: `¿Retirar "${asset.name}"?`, description: 'Deja de amortizarse en los gastos indirectos del mes.' });
    if (ok) removeMutation.mutate(asset.id);
  };

  const columns: ColumnDef<AssetDto, unknown>[] = [
    { header: 'Activo', accessorKey: 'name' },
    { header: 'Tipo', cell: ({ row }) => <Badge variant="neutral">{KIND_LABEL[row.original.kind]}</Badge> },
    { header: 'Adquirido', cell: ({ row }) => formatDate(row.original.acquiredAt) },
    { header: 'Cantidad', accessorKey: 'quantity' },
    { header: 'Costo total', cell: ({ row }) => formatMoney(row.original.totalCost) },
    { header: 'Vida util', cell: ({ row }) => `${row.original.usefulLifeMonths} meses` },
    { header: 'Amortizacion mensual', cell: ({ row }) => formatMoney(Number(row.original.totalCost) / row.original.usefulLifeMonths) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Retirar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-heading-lg font-semibold text-text">Activos</h1>
          <p className="text-body-sm text-text-muted">Moldes y herramienta. Se amortizan en el tiempo, no se cargan completos al mes que se compran.</p>
        </div>
        <Button onClick={() => { clear(); setDialogOpen(true); }}>
          <Plus className="size-4" /> Nuevo activo
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
        <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin activos registrados" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo activo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" placeholder="Molde vela rosa" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo" htmlFor="kind">
                <Select id="kind" name="kind" options={KIND_OPTIONS} defaultValue="MOLD" />
              </Field>
              <Field label="Fecha de adquisicion" required>
                <DatePicker value={acquiredAt} onChange={(d) => d && setAcquiredAt(d)} />
              </Field>
              <Field label="Cantidad" htmlFor="quantity">
                <NumberInput id="quantity" name="quantity" min={1} step={1} defaultValue={1} />
              </Field>
              <Field label="Costo unitario" htmlFor="unitCost" required>
                <NumberInput id="unitCost" name="unitCost" step={0.01} min={0} unit="$" unitPosition="prefix" required />
              </Field>
              <Field
                label="Vida util (meses)"
                htmlFor="usefulLifeMonths"
                hint="Vacio: usa el valor de Configuracion"
                tooltip="En cuantos meses se reparte el costo de este activo hacia los gastos indirectos (amortizacion en linea recta). Un molde de $2,000 a 24 meses aporta $83.33/mes a la bolsa que el cierre mensual reparte entre las piezas producidas."
              >
                <NumberInput id="usefulLifeMonths" name="usefulLifeMonths" min={1} step={1} unit="meses" />
              </Field>
            </div>
            <Field label="Notas" htmlFor="notes">
              <Input id="notes" name="notes" />
            </Field>
            {formError && <p className="text-body-sm text-danger-fg">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
