import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { CardTypeDto, Paginated } from '@/lib/types';
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

export default function CardTypesPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CardTypeDto | null>(null);
  const [supplyRows, setSupplyRows] = useState<SupplyTemplateRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['card-types', { page, search }],
    queryFn: () => httpGet<Paginated<CardTypeDto>>('/card-types', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['card-types'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/card-types/${editing.id}`, body) : httpPost('/card-types', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Tarjeta actualizada' : 'Tarjeta creada');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/card-types/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Tarjeta dada de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setSupplyRows([]);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (item: CardTypeDto) => {
    setEditing(item);
    setSupplyRows((item.supplyTemplate ?? []).map((t) => ({ supplyId: t.supplyId, quantity: Number(t.quantity), unit: t.unit, note: t.note ?? undefined })));
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validRows = supplyRows.filter((r) => r.supplyId);
    saveMutation.mutate({
      name: form.get('name'),
      description: form.get('description') || undefined,
      widthCm: form.get('widthCm') ? Number(form.get('widthCm')) : undefined,
      heightCm: form.get('heightCm') ? Number(form.get('heightCm')) : undefined,
      printedSides: Number(form.get('printedSides') || 1),
      setupMinutes: Number(form.get('setupMinutes') || 0),
      supplyTemplate: validRows.map((r) => ({ supplyId: r.supplyId, quantity: r.quantity, unit: r.unit, note: r.note })),
    });
  };

  const handleRemove = async (item: CardTypeDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${item.name}"?` });
    if (ok) removeMutation.mutate(item.id);
  };

  const columns: ColumnDef<CardTypeDto, unknown>[] = [
    { header: 'Tarjeta', accessorKey: 'name' },
    { header: 'Medidas', cell: ({ row }) => (row.original.widthCm && row.original.heightCm ? `${row.original.widthCm} x ${row.original.heightCm} cm` : '—') },
    { header: 'Caras impresas', accessorKey: 'printedSides' },
    { header: 'Min. diseno (por pedido)', accessorKey: 'setupMinutes' },
    { header: 'Insumos', cell: ({ row }) => <Badge variant="accent">{row.original.supplyTemplate?.length ?? 0}</Badge> },
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
      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva tarjeta
          </Button>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin tarjetas" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tarjeta' : 'Nueva tarjeta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ancho (cm)" htmlFor="widthCm">
                <NumberInput id="widthCm" name="widthCm" step={0.1} min={0} unit="cm" defaultValue={editing?.widthCm ? Number(editing.widthCm) : undefined} />
              </Field>
              <Field label="Alto (cm)" htmlFor="heightCm">
                <NumberInput id="heightCm" name="heightCm" step={0.1} min={0} unit="cm" defaultValue={editing?.heightCm ? Number(editing.heightCm) : undefined} />
              </Field>
              <Field label="Caras impresas" htmlFor="printedSides">
                <Select
                  id="printedSides"
                  name="printedSides"
                  options={[
                    { value: '1', label: 'Una cara' },
                    { value: '2', label: 'Dos caras' },
                  ]}
                  defaultValue={String(editing?.printedSides ?? 1)}
                />
              </Field>
              <Field
                label="Minutos de diseno"
                htmlFor="setupMinutes"
                hint="Por PEDIDO, no por pieza"
                tooltip="Tiempo de personalizar el arte de la tarjeta con el nombre/fecha del evento, una sola vez por pedido. Se reparte entre las piezas del pedido, no se multiplica por cada una."
              >
                <NumberInput id="setupMinutes" name="setupMinutes" min={0} step={1} unit="min" defaultValue={editing?.setupMinutes ?? 15} />
              </Field>
            </div>
            <SupplyTemplateEditor rows={supplyRows} onChange={setSupplyRows} label="Insumos que incluye esta tarjeta" />
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
