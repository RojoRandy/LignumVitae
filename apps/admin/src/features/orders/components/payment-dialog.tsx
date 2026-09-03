import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpPost, errorMessage } from '@/lib/http';
import type { OrderDto, PaymentMethodValue } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const METHOD_OPTIONS: { value: PaymentMethodValue; label: string }[] = [
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'OTHER', label: 'Otro' },
];

export const PaymentDialog = ({ order, open, onOpenChange }: { order: OrderDto; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const queryClient = useQueryClient();
  const balance = Number(order.total) - Number(order.paidAmount);

  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethodValue>('TRANSFER');
  const [isDeposit, setIsDeposit] = useState(order.status === 'PENDING_DEPOSIT');
  const [paidAt, setPaidAt] = useState<Date | undefined>(new Date());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      httpPost<OrderDto>(`/orders/${order.id}/payments`, {
        amount,
        method,
        isDeposit,
        paidAt: paidAt?.toISOString().slice(0, 10),
        reference: reference || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (order.status === 'PENDING_DEPOSIT' && updated.status === 'CONFIRMED') {
        toast.success('Abono registrado: el anticipo quedo cubierto y el pedido se confirmo');
      } else {
        toast.success('Abono registrado');
      }
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Monto" required hint={`Saldo pendiente: ${formatMoney(balance)}`}>
            <NumberInput min={0.01} max={balance} step={0.01} unit="$" unitPosition="prefix" required value={amount} onChange={setAmount} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Metodo">
              <Select options={METHOD_OPTIONS} value={method} onChange={(v) => setMethod(v as PaymentMethodValue)} />
            </Field>
            <Field label="Fecha" required>
              <DatePicker value={paidAt} onChange={setPaidAt} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-input border border-border px-3 py-2.5">
            <div>
              <p className="text-body-sm text-text">Es el anticipo</p>
              <p className="text-caption text-text-muted">Marca si este pago es el que confirma el pedido</p>
            </div>
            <Switch checked={isDeposit} onCheckedChange={setIsDeposit} />
          </div>
          <Field label="Referencia" hint="Folio de transferencia, etc.">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Notas">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={!amount} loading={mutation.isPending} onClick={() => mutation.mutate()}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
