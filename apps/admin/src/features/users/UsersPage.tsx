import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPatch, httpPost, httpGet } from '@/lib/http';
import type { Paginated, UserDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { FormError, PageHeader, PageToolbar } from '@/components/ui/page';

const ROLE_LABEL: Record<string, string> = { employee: 'Empleada', admin: 'Admin', super_user: 'Administradora' };

export default function UsersPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: () => httpGet<Paginated<UserDto>>('/auth/users', { page, search, limit: 20 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? httpPatch(`/auth/users/${editing.id}`, body) : httpPost('/auth/users', body),
    onSuccess: () => {
      invalidate();
      toast.success(editing ? 'Usuario actualizado' : 'Usuario creado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/auth/users/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Usuario dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const openCreate = () => {
    setEditing(null);
    clear();
    setDialogOpen(true);
  };

  const openEdit = (user: UserDto) => {
    setEditing(user);
    clear();
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = form.get('password');
    saveMutation.mutate({
      username: form.get('username'),
      fullName: form.get('fullName'),
      role: form.get('role'),
      ...(password ? { password } : {}),
    });
  };

  const handleRemove = async (user: UserDto) => {
    const ok = await confirm({ title: `¿Dar de baja a "${user.fullName}"?`, description: 'Pierde acceso al portal de inmediato.' });
    if (ok) removeMutation.mutate(user.id);
  };

  const columns: ColumnDef<UserDto, unknown>[] = [
    {
      header: 'Usuario',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.original.fullName} />
          <div className="flex flex-col">
            <span className="font-medium text-text">{row.original.fullName}</span>
            <span className="text-caption text-text-muted">@{row.original.username}</span>
          </div>
        </div>
      ),
    },
    { header: 'Rol', cell: ({ row }) => <Badge variant="accent">{ROLE_LABEL[row.original.role]}</Badge> },
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
        title="Usuarios"
        description="Sin correo: entran con nombre de usuario y contrasena."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <PageToolbar search={{ value: search, onChange: setSearch, placeholder: 'Buscar...' }} />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin usuarios" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="fullName" required>
              <Input id="fullName" name="fullName" defaultValue={editing?.fullName} required />
            </Field>
            <Field label="Usuario" htmlFor="username" required error={fieldErrors.username}>
              <Input id="username" name="username" defaultValue={editing?.username} required />
            </Field>
            <Field label={editing ? 'Nueva contrasena' : 'Contrasena'} htmlFor="password" required={!editing} hint={editing ? 'Dejar vacio para no cambiarla' : 'Minimo 8 caracteres'}>
              <Input id="password" name="password" type="password" minLength={8} required={!editing} />
            </Field>
            <Field label="Rol" htmlFor="role" required>
              <Select
                id="role"
                name="role"
                options={[
                  { value: 'employee', label: 'Empleada' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'super_user', label: 'Administradora' },
                ]}
                defaultValue={editing?.role ?? 'employee'}
                required
              />
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
