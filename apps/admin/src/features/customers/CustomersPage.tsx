import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { ApiError } from '@lignumvitae/types';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { CustomerDto, Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

export default function CustomersPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, search }],
    queryFn: () => httpGet<Paginated<CustomerDto>>('/customers', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/customers/${editing.id}`, body) : httpPost('/customers', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Cliente actualizado' : 'Cliente creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/customers/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Cliente dado de baja');
    },
    onError: (error) => {
      const details = error instanceof ApiError ? (error.details as { sampleFolios?: string[]; activeOrders?: number } | undefined) : undefined;
      if (details?.sampleFolios?.length) {
        toast.error(`Tiene ${details.activeOrders} pedido(s) activo(s): ${details.sampleFolios.join(', ')}`);
      } else {
        toast.error((error as Error).message);
      }
    },
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (customer: CustomerDto) => {
    setEditing(customer);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    saveMutation.mutate({
      fullName: form.get('fullName'),
      phone: form.get('phone'),
      whatsapp: form.get('whatsapp') || undefined,
      email: form.get('email') || undefined,
      address: form.get('address') || undefined,
      notes: form.get('notes') || undefined,
    });
  };

  const handleRemove = async (customer: CustomerDto) => {
    const ok = await confirm({ title: `¿Dar de baja a "${customer.fullName}"?`, description: 'No se puede si tiene pedidos abiertos.' });
    if (ok) removeMutation.mutate(customer.id);
  };

  const columns: ColumnDef<CustomerDto, unknown>[] = [
    { header: 'Nombre', accessorKey: 'fullName' },
    { header: 'Telefono', accessorKey: 'phone' },
    { header: 'WhatsApp', cell: ({ row }) => row.original.whatsapp ?? '—' },
    { header: 'Correo', cell: ({ row }) => row.original.email ?? '—' },
    { header: 'Estado', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Activo' : 'Baja'}</Badge> },
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
        title="Clientes"
        description="Quien pide las cotizaciones y los pedidos."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nuevo cliente
          </Button>
        }
      />

      <PageToolbar search={{ value: search, onChange: setSearch, placeholder: 'Buscar por nombre o telefono...' }} />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin clientes registrados" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="fullName" required error={fieldErrors.fullName}>
              <Input id="fullName" name="fullName" defaultValue={editing?.fullName} required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefono" htmlFor="phone" required>
                <Input id="phone" name="phone" defaultValue={editing?.phone} required />
              </Field>
              <Field label="WhatsApp" htmlFor="whatsapp" hint="Si es distinto al telefono">
                <Input id="whatsapp" name="whatsapp" defaultValue={editing?.whatsapp ?? ''} />
              </Field>
            </div>
            <Field label="Correo" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ''} />
            </Field>
            <Field label="Direccion" htmlFor="address">
              <Input id="address" name="address" defaultValue={editing?.address ?? ''} />
            </Field>
            <Field label="Notas" htmlFor="notes" hint='Ej. "Bautizo de Emilia", "XV de Sofia"'>
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
