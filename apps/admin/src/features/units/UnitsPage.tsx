import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { UnitOfMeasureDto, Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormError, PageToolbar } from '@/components/ui/page';

export default function UnitsPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitOfMeasureDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['units-of-measure', { page, search, onlyActive }],
    queryFn: () => httpGet<Paginated<UnitOfMeasureDto>>('/units-of-measure', { page, search, onlyActive, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['units-of-measure'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/units-of-measure/${editing.id}`, body) : httpPost('/units-of-measure', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Unidad de medida actualizada' : 'Unidad de medida creada');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/units-of-measure/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Unidad de medida dada de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => httpPatch(`/units-of-measure/${id}`, { isActive: true }),
    onSuccess: () => {
      invalidate();
      toast.success('Unidad de medida reactivada');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (item: UnitOfMeasureDto) => {
    setEditing(item);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: form.get('name'),
      abbr: form.get('abbr'),
      slug: form.get('slug'),
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : undefined,
    });
  };

  const handleRemove = async (item: UnitOfMeasureDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${item.name}"?` });
    if (ok) removeMutation.mutate(item.id);
  };

  const columns: ColumnDef<UnitOfMeasureDto, unknown>[] = [
    { header: 'Nombre', accessorKey: 'name' },
    { header: 'Slug', accessorKey: 'slug' },
    { header: 'Abreviatura', accessorKey: 'abbr' },
    { header: 'Orden', accessorKey: 'sortOrder' },
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
      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }}
        showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" /> Nueva unidad de medida
          </Button>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin unidades de medida" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar unidad de medida' : 'Nueva unidad de medida'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </Field>
            <Field label="Slug" htmlFor="slug" required error={fieldErrors.slug} hint="Usa mayúsculas y guiones bajos, por ejemplo: UNIDAD_MEDIDA.">
              <Input id="slug" name="slug" defaultValue={editing?.slug} required />
            </Field>
            <Field label="Abreviatura" htmlFor="abbr" required error={fieldErrors.abbr}>
              <Input id="abbr" name="abbr" defaultValue={editing?.abbr} required />
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
