// Alta corta de cliente sin salir de la cotizacion: el caso real es que la
// clienta llama, pide precio, y no esta dada de alta. Solo nombre y telefono
// -- el resto (correo, direccion, notas) se completa despues en /clientes,
// que sigue siendo la pantalla del alta completa.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpPost } from '@/lib/http';
import { useFieldErrors } from '@/hooks/use-field-errors';
import type { CustomerDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormError } from '@/components/ui/page';

export const CustomerQuickCreateDialog = ({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recibe el cliente recien creado para dejarlo ya seleccionado. */
  onCreated: (customer: CustomerDto) => void;
}) => {
  const queryClient = useQueryClient();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const createMutation = useMutation({
    mutationFn: () => httpPost<CustomerDto>('/customers', { fullName, phone }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente creado');
      onCreated(customer);
      setFullName('');
      setPhone('');
      onOpenChange(false);
    },
    onError: handleError,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clear();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nombre completo" htmlFor="quick-fullName" required error={fieldErrors.fullName}>
            <Input id="quick-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Telefono" htmlFor="quick-phone" required error={fieldErrors.phone} hint="10 digitos">
            <Input
              id="quick-phone"
              inputMode="numeric"
              maxLength={10}
              pattern="\d{10}"
              title="10 digitos, sin espacios ni guiones"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          <FormError>{formError}</FormError>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
