import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { httpDelete, httpPost, httpGet } from '@/lib/http';
import type { ExpenseCategoryDto, ExpenseDto, Paginated } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormError, PageToolbar } from '@/components/ui/page';

const SOURCE_LABEL: Record<string, string> = { MANUAL: 'Manual', PURCHASE: 'Compra', DEPRECIATION: 'Depreciacion' };

export default function ExpensesPage() {
  const { page, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [incurredAt, setIncurredAt] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { page }],
    queryFn: () => httpGet<Paginated<ExpenseDto>>('/expenses', { page, limit: 20 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => httpGet<ExpenseCategoryDto[]>('/expenses/categories'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses'] });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => httpPost('/expenses', body),
    onSuccess: () => {
      invalidate();
      toast.success('Gasto registrado');
      setDialogOpen(false);
    },
    onError: handleError,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => httpPost('/expenses/categories', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Categoria creada');
      setCategoryDialogOpen(false);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/expenses/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success('Gasto dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      categoryId: Number(form.get('categoryId')),
      description: form.get('description'),
      amount: Number(form.get('amount')),
      incurredAt: incurredAt.toISOString().slice(0, 10),
    });
  };

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createCategoryMutation.mutate({ name: form.get('name'), kind: form.get('kind') });
  };

  const handleRemove = async (expense: ExpenseDto) => {
    if (expense.source !== 'MANUAL') {
      toast.error('Este gasto viene de una compra o de la depreciacion mensual: se corrige desde su origen.');
      return;
    }
    const ok = await confirm({ title: '¿Dar de baja este gasto?' });
    if (ok) removeMutation.mutate(expense.id);
  };

  const columns: ColumnDef<ExpenseDto, unknown>[] = [
    // La fecha es index 0, pero como titulo de tarjeta no identifica nada;
    // Descripcion es lo que de verdad distingue un gasto de otro.
    { header: 'Fecha', cell: ({ row }) => formatDate(row.original.incurredAt), meta: { mobile: 'meta' } },
    { header: 'Categoria', cell: ({ row }) => row.original.category?.name ?? '—', meta: { mobile: 'subtitle' } },
    { header: 'Descripcion', accessorKey: 'description', meta: { mobile: 'title' } },
    {
      header: 'Origen',
      cell: ({ row }) => <Badge variant="neutral">{SOURCE_LABEL[row.original.source]}</Badge>,
      meta: { mobile: 'trailing' },
    },
    { header: 'Importe', cell: ({ row }) => formatMoney(row.original.amount) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>Dar de baja</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageToolbar
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCategoryDialogOpen(true)}>Nueva categoria</Button>
            <Button onClick={() => { clear(); setDialogOpen(true); }}>
              <Plus className="size-4" /> Nuevo gasto
            </Button>
          </div>
        }
      />

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin gastos registrados" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Categoria" htmlFor="categoryId" required>
              <Select
                id="categoryId"
                name="categoryId"
                options={(categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="Elegir..."
                required
              />
            </Field>
            <Field label="Descripcion" htmlFor="description" required error={fieldErrors.description}>
              <Input id="description" name="description" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Importe" htmlFor="amount" required>
                <NumberInput id="amount" name="amount" step={0.01} min={0} unit="$" unitPosition="prefix" required />
              </Field>
              <Field label="Fecha" required>
                <DatePicker value={incurredAt} onChange={(d) => d && setIncurredAt(d)} />
              </Field>
            </div>
            <FormError>{formError}</FormError>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Nueva categoria de gasto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="catName" required>
              <Input id="catName" name="name" required />
            </Field>
            <Field
              label="Tipo"
              htmlFor="catKind"
              hint="Define si este gasto encarece las velas o no"
              tooltip="Gasto indirecto: entra a la bolsa que el cierre mensual reparte entre todas las piezas producidas (gas, luz, renta del taller). No operativo: se registra pero NO afecta el costo de ninguna vela (publicidad, comisiones bancarias). Usalo para gastos del negocio que no son parte de fabricar."
            >
              <Select
                id="catKind"
                name="kind"
                options={[
                  { value: 'OVERHEAD', label: 'Gasto indirecto' },
                  { value: 'NON_OPERATING', label: 'No operativo' },
                ]}
                defaultValue="OVERHEAD"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createCategoryMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
