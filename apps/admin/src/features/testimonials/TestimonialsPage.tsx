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
import type { Paginated, TestimonialDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

export default function TestimonialsPage() {
  const { page, onlyActive, setOnlyActive, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['testimonials', { page, onlyActive }],
    queryFn: () => httpGet<Paginated<TestimonialDto>>('/testimonials', { page, onlyActive, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['testimonials'] });

  const saveMutation = useMutation({
    mutationFn: (body: FormData | Record<string, unknown>) =>
      editing ? httpPatch(`/testimonials/${editing.id}`, body) : httpPost('/testimonials', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Testimonio actualizado' : 'Testimonio creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/testimonials/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Testimonio eliminado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (testimonial: TestimonialDto) => {
    setEditing(testimonial);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (editing) {
      saveMutation.mutate({
        customerName: form.get('customerName'),
        alt: form.get('alt'),
        sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : undefined,
        isActive: form.get('isActive') === 'on',
      });
    } else {
      // La captura solo se sube al crear: para cambiar la foto se borra y se
      // vuelve a dar de alta, no hay reemplazo de archivo en edicion.
      saveMutation.mutate(form);
    }
  };

  const handleRemove = async (testimonial: TestimonialDto) => {
    const ok = await confirm({
      title: `¿Eliminar el testimonio de "${testimonial.customerName}"?`,
      description: 'Se borra la captura del almacenamiento. No se puede deshacer.',
      variant: 'danger',
    });
    if (ok) removeMutation.mutate(testimonial.id);
  };

  const columns: ColumnDef<TestimonialDto, unknown>[] = [
    {
      header: 'Testimonio',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img src={staticUrl(row.original.imageUrl)} alt={row.original.alt} className="size-12 shrink-0 rounded-input object-cover" />
          <div className="flex flex-col">
            <span className="font-medium text-text">{row.original.customerName}</span>
            <span className="max-w-xs truncate text-caption text-text-muted">{row.original.alt}</span>
          </div>
        </div>
      ),
    },
    { header: 'Orden', cell: ({ row }) => row.original.sortOrder },
    {
      header: 'Estado',
      cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Publicado' : 'Oculto'}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>Editar</Button>
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Testimoniales"
        description="Capturas de clientas que se publican en la portada. También se pueden agregar desde un pedido al marcarlo entregado."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nuevo testimonio
          </Button>
        }
      />

      <PageToolbar showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }} />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Sin testimoniales"
        page={data?.page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar testimonio' : 'Nuevo testimonio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!editing && (
              <Field label="Captura de pantalla" htmlFor="file" required hint="JPEG, PNG o WebP, hasta 10 MB">
                <Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
              </Field>
            )}
            <Field label="Nombre a publicar" htmlFor="customerName" required error={fieldErrors.customerName}>
              <Input id="customerName" name="customerName" defaultValue={editing?.customerName} required />
            </Field>
            <Field label="¿Qué dice el mensaje?" htmlFor="alt" required hint="Se usa como texto alternativo de la imagen" error={fieldErrors.alt}>
              <Textarea id="alt" name="alt" rows={3} defaultValue={editing?.alt} required />
            </Field>
            <Field label="Orden" htmlFor="sortOrder" hint="Los testimonios con menor numero se publican primero">
              <NumberInput id="sortOrder" name="sortOrder" min={0} defaultValue={editing?.sortOrder ?? 0} />
            </Field>
            {editing && (
              <label htmlFor="isActive" className="flex items-center gap-2 text-body-sm text-text">
                <Checkbox id="isActive" name="isActive" defaultChecked={editing.isActive} />
                Publicado
              </label>
            )}
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
