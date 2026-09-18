import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, TrendingUp } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useSupplyTypeOptions } from '@/hooks/use-supply-type-options';
import { useUnitOfMeasureOptions } from '@/hooks/use-unit-of-measure-options';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { Paginated, SupplyDto } from '@/lib/types';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

export default function SuppliesPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const { supplyTypes, options: typeOptions } = useSupplyTypeOptions();
  const { units, options: unitOptions } = useUnitOfMeasureOptions();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyDto | null>(null);
  const defaultTypeId = String(editing?.typeId ?? supplyTypes.find((t) => t.slug === 'OTHER')?.id ?? '');
  const defaultUnitId = String(editing?.unitId ?? units.find((u) => u.slug === 'PIECE')?.id ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['supplies', { page, search, onlyActive }],
    queryFn: () => httpGet<Paginated<SupplyDto>>('/supplies', { page, search, onlyActive, limit: 20 }),
  });

  const { data: drift } = useQuery({
    queryKey: ['supplies', 'cost-drift'],
    queryFn: () => httpGet<{ supply: SupplyDto; driftPct: number }[]>('/supplies/cost-drift'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['supplies'] });
  };

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/supplies/${editing.id}`, body) : httpPost('/supplies', body),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Insumo actualizado' : 'Insumo creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/supplies/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Insumo dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const applySuggestedMutation = useMutation({
    mutationFn: (id: number) => httpPost(`/supplies/${id}/apply-suggested-cost`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['supplies', 'cost-drift'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Costo sugerido aplicado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => httpPatch(`/supplies/${id}`, { isActive: true }),
    onSuccess: () => {
      invalidate();
      toast.success('Insumo reactivado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (supply: SupplyDto) => {
    setEditing(supply);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: form.get('name'),
      isFragrance: form.get('isFragrance') === 'on',
      typeId: Number(form.get('typeId')),
      unitId: Number(form.get('unitId')),
      currentUnitCost: Number(form.get('currentUnitCost')),
      minStockQty: form.get('minStockQty') ? Number(form.get('minStockQty')) : undefined,
      defaultBaseQtyPerPack: form.get('defaultBaseQtyPerPack') ? Number(form.get('defaultBaseQtyPerPack')) : undefined,
      notes: form.get('notes') || undefined,
    });
  };

  const handleRemove = async (supply: SupplyDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${supply.name}"?` });
    if (ok) removeMutation.mutate(supply.id);
  };

  const driftMap = new Map((drift ?? []).map((d) => [d.supply.id, d.driftPct]));

  const columns: ColumnDef<SupplyDto, unknown>[] = [
    {
      header: 'Insumo',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{row.original.name}</span>
          <span className="text-caption text-text-muted">{row.original.type.name}</span>
          {row.original.isFragrance && <Badge variant="neutral" className="self-start">Aroma</Badge>}
        </div>
      ),
    },
    {
      header: 'Costo actual',
      cell: ({ row }) => {
        const supply = row.original;
        const driftPct = driftMap.get(supply.id);
        return (
          <div className="flex items-center gap-1.5">
            <span>{formatMoney(supply.currentUnitCost)}</span>
            <span className="text-caption text-text-faint">/ {supply.unit.name.toLowerCase()}</span>
            {driftPct !== undefined && (
              <Tooltip content={`Sugerido: ${formatMoney(supply.suggestedUnitCost)} (${formatPercent(driftPct)} de desfase)`}>
                <button
                  type="button"
                  onClick={() => applySuggestedMutation.mutate(supply.id)}
                  className="flex items-center gap-0.5 rounded-full bg-warning-bg px-1.5 py-0.5 text-micro font-medium text-warning-fg hover:opacity-80"
                >
                  <TrendingUp className="size-3" /> Aplicar
                </button>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    { header: 'Existencia', cell: ({ row }) => formatNumber(row.original.stockQty, 2) },
    {
      header: 'Stock',
      cell: ({ row }) => {
        const low = Number(row.original.stockQty) <= Number(row.original.minStockQty);
        return low ? <Badge variant="danger">Bajo</Badge> : <Badge variant="success">OK</Badge>;
      },
    },
    { header: 'Estado', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Activo' : 'Baja'}</Badge> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>Editar</Button>
          {row.original.isActive ? (
            <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Dar de baja</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => reactivateMutation.mutate(row.original.id)}>Reactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Insumos"
          description="Cera, mecha, empaques... con su costo, existencia y costo sugerido desde las compras."
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Nuevo insumo
            </Button>
          }
        />

        <PageToolbar
          search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }}
          showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }}
        />

        <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin insumos" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar insumo' : 'Nuevo insumo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
                <Input id="name" name="name" defaultValue={editing?.name} required />
              </Field>
              <label htmlFor="isFragrance" className="flex items-center gap-2 text-body-sm text-text">
                <Checkbox id="isFragrance" name="isFragrance" defaultChecked={editing?.isFragrance} />
                Aroma
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo" htmlFor="typeId" required>
                  <Select key={defaultTypeId} id="typeId" name="typeId" options={typeOptions} defaultValue={defaultTypeId} required />
                </Field>
                <Field label="Unidad de medida" htmlFor="unitId" required>
                  <Select key={defaultUnitId} id="unitId" name="unitId" options={unitOptions} defaultValue={defaultUnitId} required />
                </Field>
              </div>
              <Field
                label="Costo actual ($ por unidad base)"
                htmlFor="currentUnitCost"
                required
                hint="El que usa el motor de costeo"
                tooltip="El precio con el que se calcula el costo de toda vela, empaque o tarjeta que use este insumo. Cuando registras una compra, el sistema calcula un costo sugerido a partir del historial reciente; este campo es el que de verdad usa el costeo hasta que apliques ese sugerido."
              >
                <NumberInput id="currentUnitCost" name="currentUnitCost" step={0.000001} min={0} unit="$" unitPosition="prefix" required defaultValue={editing?.currentUnitCost ? Number(editing.currentUnitCost) : undefined} />
              </Field>
              <Field
                label="Contenido por unidad"
                htmlFor="defaultBaseQtyPerPack"
                tooltip="Cuantas unidades base (gramos, piezas, metros...) trae cada unidad de compra. Se usa para precargar el renglon de compra de este insumo, para no tener que calcularlo a mano cada vez."
              >
                <NumberInput id="defaultBaseQtyPerPack" name="defaultBaseQtyPerPack" min={0} defaultValue={editing?.defaultBaseQtyPerPack ? Number(editing.defaultBaseQtyPerPack) : undefined} />
              </Field>
              <Field
                label="Existencia minima"
                htmlFor="minStockQty"
                tooltip="Cuando la existencia baja de este numero, el insumo se marca en rojo como 'Bajo' en el listado, para avisar que hay que comprar mas antes de quedarse sin material."
              >
                <NumberInput id="minStockQty" name="minStockQty" step={0.001} min={0} defaultValue={editing?.minStockQty ? Number(editing.minStockQty) : 0} />
              </Field>
              <Field label="Notas" htmlFor="notes">
                <Input id="notes" name="notes" defaultValue={editing?.notes ?? ''} />
              </Field>
              <FormError>{formError}</FormError>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" loading={saveMutation.isPending}>Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}
