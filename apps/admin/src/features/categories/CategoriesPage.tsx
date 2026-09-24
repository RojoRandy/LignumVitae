import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import { staticUrl } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { CandleCategoryDto, Paginated, ProductDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { ColorInput } from '@/components/ui/color-input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { FormError, PageToolbar } from '@/components/ui/page';

export default function CategoriesPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandleCategoryDto | null>(null);
  const [colorHex, setColorHex] = useState('#7A5C3E');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { page, search, onlyActive }],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { page, search, onlyActive, limit: 20 }),
  });

  const { data: coverProducts, isLoading: coverImagesLoading } = useQuery({
    queryKey: ['products', { categoryId: editing?.id, forCover: true }],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { categoryId: editing!.id, limit: 100 }),
    enabled: dialogOpen && !!editing,
  });
  const coverImages = coverProducts?.items.flatMap((product) =>
    (product.images ?? []).map((image) => ({ ...image, productName: product.name })),
  ) ?? [];

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

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => httpPatch(`/categories/${id}`, { isActive: true }),
    onSuccess: () => {
      invalidate();
      toast.success('Categoría reactivada');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    setCoverImageUrl(null);
    setColorHex('#7A5C3E');
    clear();
    setDialogOpen(true);
  };

  const openEdit = (category: CandleCategoryDto) => {
    setEditing(category);
    setCoverImageUrl(category.coverImageUrl);
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
      ...(editing ? { coverImageUrl } : {}),
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
            <Plus className="size-4" /> Nueva categoria
          </Button>
        }
      />

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
            {editing && (
              <Field label="Imagen en el home" hint="Se muestra en la tarjeta de la categoria en la pagina principal">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label="Imagen automatica"
                    aria-pressed={coverImageUrl === null}
                    className={cn('size-16 rounded-input bg-surface-sunken text-caption', coverImageUrl === null && 'ring-2 ring-accent ring-offset-2')}
                    onClick={() => setCoverImageUrl(null)}
                  >
                    Automatica
                  </button>
                  {coverImagesLoading ? (
                    Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="size-16" />)
                  ) : coverImages.length > 0 ? (
                    coverImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        aria-label={`Usar foto de ${image.productName}`}
                        aria-pressed={coverImageUrl === image.url}
                        className={cn('rounded-input', coverImageUrl === image.url && 'ring-2 ring-accent ring-offset-2')}
                        onClick={() => setCoverImageUrl(image.url)}
                      >
                        <img src={staticUrl(image.url)} alt={image.productName} className="size-16 object-cover rounded-input" />
                      </button>
                    ))
                  ) : (
                    <p className="text-caption text-text-muted">Sube fotos a los productos de esta categoria para elegir una.</p>
                  )}
                </div>
              </Field>
            )}
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
