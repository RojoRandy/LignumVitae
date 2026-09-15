import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, TrendingUp } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { Paginated, SupplyDto, UnitOfMeasure } from '@/lib/types';
import { formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

const SUPPLY_TYPES: { value: string; label: string }[] = [
  { value: 'WAX', label: 'Cera' },
  { value: 'FRAGRANCE', label: 'Aroma' },
  { value: 'WICK', label: 'Mecha' },
  { value: 'DYE', label: 'Colorante' },
  { value: 'ALUMINUM_BASE', label: 'Base de aluminio' },
  { value: 'CELLOPHANE', label: 'Celofan' },
  { value: 'RIBBON', label: 'Liston' },
  { value: 'LABEL', label: 'Etiqueta' },
  { value: 'PRINTING', label: 'Impresion' },
  { value: 'SEAL', label: 'Sello' },
  { value: 'BELL', label: 'Cascabel' },
  { value: 'SILICONE', label: 'Silicon' },
  { value: 'BOX', label: 'Caja' },
  { value: 'TULLE', label: 'Tul' },
  { value: 'ACETATE', label: 'Acetato' },
  { value: 'PAPER', label: 'Papel' },
  { value: 'OTHER', label: 'Otro' },
];

const UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'GRAM', label: 'Gramo' },
  { value: 'KILOGRAM', label: 'Kilogramo' },
  { value: 'MILLILITER', label: 'Mililitro' },
  { value: 'LITER', label: 'Litro' },
  { value: 'CENTIMETER', label: 'Centimetro' },
  { value: 'METER', label: 'Metro' },
  { value: 'PIECE', label: 'Pieza' },
  { value: 'SHEET', label: 'Pliego' },
];

export default function SuppliesPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['supplies', { page, search }],
    queryFn: () => httpGet<Paginated<SupplyDto>>('/supplies', { page, search, limit: 20 }),
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
      toast.success('Costo sugerido aplicado');
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
      type: form.get('type'),
      unit: form.get('unit'),
      currentUnitCost: Number(form.get('currentUnitCost')),
      minStockQty: form.get('minStockQty') ? Number(form.get('minStockQty')) : undefined,
      defaultPackLabel: form.get('defaultPackLabel') || undefined,
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
          <span className="text-caption text-text-muted">{SUPPLY_TYPES.find((t) => t.value === row.original.type)?.label}</span>
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
            <span className="text-caption text-text-faint">/ {UNITS.find((u) => u.value === supply.unit)?.label.toLowerCase()}</span>
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
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>Editar</Button>
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Dar de baja</Button>
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

        <PageToolbar search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }} />

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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tipo" htmlFor="type" required>
                  <Select id="type" name="type" options={SUPPLY_TYPES} defaultValue={editing?.type ?? 'OTHER'} required />
                </Field>
                <Field label="Unidad base" htmlFor="unit" required>
                  <Select id="unit" name="unit" options={UNITS} defaultValue={editing?.unit ?? 'PIECE'} required />
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
                label="Existencia minima"
                htmlFor="minStockQty"
                tooltip="Cuando la existencia baja de este numero, el insumo se marca en rojo como 'Bajo' en el listado, para avisar que hay que comprar mas antes de quedarse sin material."
              >
                <NumberInput id="minStockQty" name="minStockQty" step={0.001} min={0} defaultValue={editing?.minStockQty ? Number(editing.minStockQty) : 0} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Como se compra" htmlFor="defaultPackLabel" hint='Ej. "bulto de 20 kg"'>
                  <Input id="defaultPackLabel" name="defaultPackLabel" defaultValue={editing?.defaultPackLabel ?? ''} />
                </Field>
                <Field
                  label="Unidades base por paquete"
                  htmlFor="defaultBaseQtyPerPack"
                  tooltip="Cuantas unidades base (gramos, piezas, metros...) trae el paquete de arriba. Se usa para precargar el renglon de compra de este insumo, para no tener que calcularlo a mano cada vez."
                >
                  <NumberInput id="defaultBaseQtyPerPack" name="defaultBaseQtyPerPack" min={0} defaultValue={editing?.defaultBaseQtyPerPack ? Number(editing.defaultBaseQtyPerPack) : undefined} />
                </Field>
              </div>
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
