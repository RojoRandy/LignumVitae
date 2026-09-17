import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { CandleCategoryDto, CandleDto, Paginated } from '@/lib/types';
import { formatGrams } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageToolbar } from '@/components/ui/page';
import { SupplyTemplateEditor, type SupplyTemplateRow } from '@/components/domain/supply-template-editor';
import { useSupplyOptions } from '@/hooks/use-supply-options';

export default function CandlesPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  // includeWax: es el unico select del portal donde la cera SI es la respuesta.
  const { options: waxOptions } = useSupplyOptions({ includeWax: true });
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandleDto | null>(null);
  const [supplyRows, setSupplyRows] = useState<SupplyTemplateRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['candles', { page, search, onlyActive }],
    queryFn: () => httpGet<Paginated<CandleDto>>('/candles', { page, search, onlyActive, limit: 20 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { limit: 100 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['candles'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/candles/${editing.id}`, body) : httpPost('/candles', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Vela actualizada' : 'Vela creada');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/candles/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Vela dada de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => httpPatch(`/candles/${id}`, { isActive: true }),
    onSuccess: () => {
      invalidate();
      toast.success('Vela reactivada');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setSupplyRows([]);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (candle: CandleDto) => {
    setEditing(candle);
    setSupplyRows(
      (candle.supplyTemplate ?? []).map((t) => ({ supplyId: t.supplyId, quantity: Number(t.quantity), unitId: t.unitId, note: t.note ?? undefined })),
    );
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validRows = supplyRows.filter((r) => r.supplyId);
    saveMutation.mutate({
      name: form.get('name'),
      categoryId: Number(form.get('categoryId')),
      grams: Number(form.get('grams')),
      widthCm: form.get('widthCm') ? Number(form.get('widthCm')) : undefined,
      heightCm: form.get('heightCm') ? Number(form.get('heightCm')) : undefined,
      wastePct: form.get('wastePct') ? Number(form.get('wastePct')) / 100 : undefined,
      meltMinutes: Number(form.get('meltMinutes')),
      meltBatchGrams: form.get('meltBatchGrams') ? Number(form.get('meltBatchGrams')) : undefined,
      waxSupplyId: form.get('waxSupplyId') ? Number(form.get('waxSupplyId')) : undefined,
      supplyTemplate: validRows.map((r) => ({ supplyId: r.supplyId, quantity: r.quantity, unitId: r.unitId, note: r.note })),
    });
  };

  const handleRemove = async (candle: CandleDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${candle.name}"?`, description: 'Deja de estar disponible para nuevos productos.' });
    if (ok) removeMutation.mutate(candle.id);
  };

  const columns: ColumnDef<CandleDto, unknown>[] = [
    {
      header: 'Vela',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{row.original.name}</span>
          <span className="text-caption text-text-muted">{row.original.category?.name}</span>
        </div>
      ),
    },
    { header: 'Gramos', cell: ({ row }) => formatGrams(row.original.grams) },
    {
      header: 'Medidas',
      cell: ({ row }) =>
        row.original.widthCm && row.original.heightCm ? `${row.original.widthCm} x ${row.original.heightCm} cm` : '—',
    },
    {
      header: 'Insumos propios',
      cell: ({ row }) => <Badge variant="accent">{row.original.supplyTemplate?.length ?? 0}</Badge>,
    },
    { header: 'Estado', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Activo' : 'Baja'}</Badge> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
            Editar
          </Button>
          {row.original.isActive ? (
            <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>
              Dar de baja
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => reactivateMutation.mutate(row.original.id)}>Reactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }}
        showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva vela
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Sin velas registradas"
        emptyDescription="Da de alta el primer molde para poder crear productos."
        page={data?.page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar vela' : 'Nueva vela'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" htmlFor="name" required error={fieldErrors.name} className="col-span-2">
                <Input id="name" name="name" defaultValue={editing?.name} required />
              </Field>
              <Field label="Categoria" htmlFor="categoryId" required>
                <Select
                  id="categoryId"
                  name="categoryId"
                  options={(categories?.items ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                  defaultValue={editing ? String(editing.categoryId) : undefined}
                  required
                />
              </Field>
              <Field label="Gramos de cera" htmlFor="grams" required hint="De una pieza, sin merma">
                <NumberInput id="grams" name="grams" step={0.01} min={0.01} unit="g" defaultValue={editing ? Number(editing.grams) : undefined} required />
              </Field>
              <Field label="Ancho (cm)" htmlFor="widthCm">
                <NumberInput id="widthCm" name="widthCm" step={0.1} min={0} unit="cm" defaultValue={editing?.widthCm ? Number(editing.widthCm) : undefined} />
              </Field>
              <Field label="Alto (cm)" htmlFor="heightCm">
                <NumberInput id="heightCm" name="heightCm" step={0.1} min={0} unit="cm" defaultValue={editing?.heightCm ? Number(editing.heightCm) : undefined} />
              </Field>
              <Field
                label="Merma de vaciado (%)"
                htmlFor="wastePct"
                hint="Cera que se queda en la olla y el cucharon"
                tooltip="Porcentaje que se suma a los gramos de la vela antes de costear la cera, para no cobrar de menos por la cera que se pierde al vaciar y que nunca llega al molde."
              >
                <NumberInput
                  id="wastePct"
                  name="wastePct"
                  step={0.1}
                  min={0}
                  max={100}
                  unit="%"
                  defaultValue={editing ? Number(editing.wastePct) * 100 : 3}
                />
              </Field>
              <Field
                label="Minutos de derretir (por lote)"
                htmlFor="meltMinutes"
                required
                tooltip="Cuanto tarda derretir y desmoldar UN LOTE completo de la olla, no una pieza sola. Ese tiempo se reparte entre las piezas que caben en la olla (ver Capacidad de la olla)."
              >
                <NumberInput id="meltMinutes" name="meltMinutes" min={1} step={1} unit="min" defaultValue={editing?.meltMinutes ?? 15} required />
              </Field>
              <Field
                label="Capacidad de la olla (g)"
                htmlFor="meltBatchGrams"
                hint="Vacio: usa el valor de Configuracion"
                tooltip="Cuantos gramos de cera caben en la olla de una sola vez. Con esto se calcula cuantas piezas de ESTA vela salen por lote (capacidad ÷ gramos de la vela), y ese numero es el que reparte el tiempo de derretir entre cada pieza -- reemplaza el '/30' fijo que usaba el Excel para todas las velas por igual."
              >
                <NumberInput id="meltBatchGrams" name="meltBatchGrams" min={1} step={1} unit="g" defaultValue={editing?.meltBatchGrams ?? undefined} />
              </Field>
              <Field
                label="Cera de esta vela"
                htmlFor="waxSupplyId"
                className="col-span-2"
                hint="Vacio: usa la de Configuracion"
                tooltip="De que insumo sale el precio por gramo de cera de ESTA vela. Solo hace falta si esta vela se hace con una cera distinta a la de Configuracion (por ejemplo soya en vez de parafina)."
              >
                <Select
                  id="waxSupplyId"
                  name="waxSupplyId"
                  options={waxOptions}
                  defaultValue={editing?.waxSupplyId ? String(editing.waxSupplyId) : undefined}
                  placeholder="Usar la de Configuracion"
                  clearable
                  searchable
                />
              </Field>
            </div>

            <SupplyTemplateEditor
              rows={supplyRows}
              onChange={setSupplyRows}
              label="Insumos propios de la vela (mecha, colorante...)"
            />

            <FormError>{formError}</FormError>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
