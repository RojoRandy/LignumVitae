import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { CandleCategoryDto, Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { ColorInput } from '@/components/ui/color-input';
import { Switch } from '@/components/ui/switch';

export default function CategoriesPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandleCategoryDto | null>(null);
  const [colorHex, setColorHex] = useState('#7A5C3E');

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { page, search }],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/categories/${editing.id}`, body) : httpPost('/categories', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Categoria actualizada' : 'Categoria creada');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/categories/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Categoria dada de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setColorHex('#7A5C3E');
    clear();
    setDialogOpen(true);
  };

  const openEdit = (category: CandleCategoryDto) => {
    setEditing(category);
    setColorHex(category.colorHex);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: form.get('name'),
      colorHex,
      description: form.get('description') || undefined,
      isVisibleOnLanding: form.get('isVisibleOnLanding') === 'on',
      sortOrder: Number(form.get('sortOrder') || 0),
    });
  };

  const handleRemove = async (category: CandleCategoryDto) => {
    const ok = await confirm({
      title: `¿Dar de baja "${category.name}"?`,
      description: 'Esta categoria dejara de mostrarse, pero se conserva el historial.',
    });
    if (ok) removeMutation.mutate(category.id);
  };

  const columns: ColumnDef<CandleCategoryDto, unknown>[] = [
    {
      header: 'Categoria',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: row.original.colorHex }} />
          <span className="font-medium text-text">{row.original.name}</span>
        </div>
      ),
    },
    {
      header: 'Landing',
      cell: ({ row }) =>
        row.original.isVisibleOnLanding ? (
          <Badge variant="success">Visible</Badge>
        ) : (
          <Badge variant="neutral">Oculta</Badge>
        ),
    },
    { header: 'Orden', accessorKey: 'sortOrder' },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>
            Dar de baja
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-heading-lg font-semibold text-text">Categorias</h1>
          <p className="text-body-sm text-text-muted">Agrupan el catalogo por tipo: Animalitos, Flores, Ramos...</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nueva categoria
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
        <Input placeholder="Buscar..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Sin categorias"
        emptyDescription="Crea la primera categoria para empezar a organizar el catalogo."
        page={data?.page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar categoria' : 'Nueva categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" defaultValue={editing?.name} required />
            </Field>
            <Field label="Color" hint="Se usa para diferenciar la categoria en el catalogo y la landing">
              <ColorInput value={colorHex} onChange={setColorHex} />
            </Field>
            <Field label="Descripcion" htmlFor="description">
              <Input id="description" name="description" defaultValue={editing?.description ?? ''} />
            </Field>
            <Field
              label="Orden"
              htmlFor="sortOrder"
              tooltip="En que posicion aparece esta categoria frente a las demas, tanto en el admin como en la landing. Numero mas chico aparece primero."
            >
              <NumberInput id="sortOrder" name="sortOrder" min={0} step={1} defaultValue={editing?.sortOrder ?? 0} />
            </Field>
            <div className="flex items-center justify-between rounded-input border border-border px-3 py-2.5">
              <span className="text-body-sm text-text">Visible en la landing</span>
              <Switch name="isVisibleOnLanding" defaultChecked={editing?.isVisibleOnLanding ?? true} />
            </div>
            {formError && <p className="text-body-sm text-danger-fg">{formError}</p>}
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
