import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { SupplyTypeDto, Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageToolbar } from '@/components/ui/page';

export default function SupplyTypesPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyTypeDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['supply-types', { page, search }],
    queryFn: () => httpGet<Paginated<SupplyTypeDto>>('/supply-types', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['supply-types'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/supply-types/${editing.id}`, body) : httpPost('/supply-types', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Tipo de insumo actualizado' : 'Tipo de insumo creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/supply-types/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Tipo de insumo dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (item: SupplyTypeDto) => {
    setEditing(item);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: form.get('name'),
      slug: editing?.isSystem ? editing.slug : form.get('slug'),
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : undefined,
    });
  };

  const handleRemove = async (item: SupplyTypeDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${item.name}"?` });
    if (ok) removeMutation.mutate(item.id);
  };

  const columns: ColumnDef<SupplyTypeDto, unknown>[] = [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Slug', accessorKey: 'slug' },
    { header: 'Orden', accessorKey: 'sortOrder' },
    { header: 'Sistema', cell: ({ row }) => row.original.isSystem ? <Badge variant="accent">Sistema</Badge> : null },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>Editar</Button>
          {!row.original.isSystem && (
            <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Dar de baja</Button>
          )}
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
            <Plus className="size-4" aria-hidden="true" /> Nuevo tipo de insumo
          </Button>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin tipos de insumo" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tipo de insumo' : 'Nuevo tipo de insumo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </Field>
            <Field label="Slug" htmlFor="slug" required error={fieldErrors.slug} hint="Usa mayúsculas y guiones bajos, por ejemplo: TIPO_INSUMO.">
              <Input id="slug" name="slug" defaultValue={editing?.slug} disabled={editing?.isSystem} required />
            </Field>
            <Field label="Orden" htmlFor="sortOrder" error={fieldErrors.sortOrder}>
              <NumberInput id="sortOrder" name="sortOrder" min={0} step={1} defaultValue={editing?.sortOrder ?? 0} />
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
