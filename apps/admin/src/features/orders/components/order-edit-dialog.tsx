import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpPatch, errorMessage } from '@/lib/http';
import type { OrderDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// dueDate es fecha pura en UTC: se arma a medianoche LOCAL para que el
// DatePicker muestre el mismo dia (igual que QuotationFormPage), y de vuelta
// se manda como YYYY-MM-DD local, sin pasar por toISOString.
const toLocalDate = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const OrderEditDialog = ({ order, open, onOpenChange }: { order: OrderDto; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setDueDate(toLocalDate(order.dueDate));
    setNotes(order.notes ?? '');
  }, [open, order.dueDate, order.notes]);

  const mutation = useMutation({
    mutationFn: () => httpPatch<OrderDto>(`/orders/${order.id}`, { dueDate: dueDate && toDateOnly(dueDate), notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido actualizado');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Editar pedido</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Fecha de entrega" required>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </Field>
          <Field label="Notas" htmlFor="order-notes">
            <Textarea id="order-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={!dueDate} loading={mutation.isPending} onClick={() => mutation.mutate()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
