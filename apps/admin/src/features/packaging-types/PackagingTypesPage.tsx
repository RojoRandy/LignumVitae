import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { PackagingTypeDto, Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageToolbar } from '@/components/ui/page';
import { SupplyTemplateEditor, type SupplyTemplateRow } from '@/components/domain/supply-template-editor';

export default function PackagingTypesPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackagingTypeDto | null>(null);
  const [supplyRows, setSupplyRows] = useState<SupplyTemplateRow[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['packaging-types', { page, search }],
    queryFn: () => httpGet<Paginated<PackagingTypeDto>>('/packaging-types', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['packaging-types'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/packaging-types/${editing.id}`, body) : httpPost('/packaging-types', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Empaque actualizado' : 'Empaque creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/packaging-types/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Empaque dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setSupplyRows([]);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (item: PackagingTypeDto) => {
    setEditing(item);
    setSupplyRows((item.supplyTemplate ?? []).map((t) => ({ supplyId: t.supplyId, quantity: Number(t.quantity), unitId: t.unitId, note: t.note ?? undefined })));
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
      packMinutes: Number(form.get('packMinutes') || 0),
      setupMinutes: Number(form.get('setupMinutes') || 0),
      supplyTemplate: validRows.map((r) => ({ supplyId: r.supplyId, quantity: r.quantity, unitId: r.unitId, note: r.note })),
    });
  };

  const handleRemove = async (item: PackagingTypeDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${item.name}"?` });
    if (ok) removeMutation.mutate(item.id);
  };

  const columns: ColumnDef<PackagingTypeDto, unknown>[] = [
    { header: 'Empaque', accessorKey: 'name' },
    { header: 'Min. empaquetar (c/u)', accessorKey: 'packMinutes' },
    { header: 'Min. armado (por pedido)', accessorKey: 'setupMinutes' },
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
            <Plus className="size-4" /> Nuevo empaque
          </Button>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin empaques" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar empaque' : 'Nuevo empaque'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </Field>
            <Field label="Descripcion" htmlFor="description">
              <Input id="description" name="description" defaultValue={editing?.description ?? ''} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Minutos de empaquetar"
                htmlFor="packMinutes"
                hint="Por CADA pieza"
                tooltip="Tiempo de envolver UNA pieza en este empaque (doblar el celofan, amarrar el liston...). Se multiplica por la cantidad de piezas del pedido y si afecta el costo: entra al sueldo y a los gastos indirectos de cada pieza."
              >
                <NumberInput id="packMinutes" name="packMinutes" min={0} step={1} unit="min" defaultValue={editing?.packMinutes ?? 0} />
              </Field>
              <Field
                label="Minutos de armado"
                htmlFor="setupMinutes"
                hint="Por PEDIDO, no por pieza"
                tooltip="Tiempo de preparar el empaque UNA vez por pedido (cortar el papel, armar la caja...), sin importar cuantas piezas se hagan. Si afecta el precio: se reparte entre las piezas del pedido, asi que en pedidos chicos pesa mas por pieza que en pedidos grandes."
              >
                <NumberInput id="setupMinutes" name="setupMinutes" min={0} step={1} unit="min" defaultValue={editing?.setupMinutes ?? 0} />
              </Field>
            </div>
            <SupplyTemplateEditor rows={supplyRows} onChange={setSupplyRows} label="Insumos que incluye este empaque" />
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
