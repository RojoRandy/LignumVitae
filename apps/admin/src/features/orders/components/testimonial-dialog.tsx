import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage, uploadTestimonial } from '@/lib/http';
import type { OrderDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Se abre al marcar un pedido como entregado (el estado ya cambio antes de
// que este dialogo aparezca) y tambien desde el menu de un pedido ya
// entregado, para capturar el testimonio mas tarde. Por eso "cancelar" aqui
// nunca revierte la entrega: solo cierra sin guardar nada.
export const TestimonialDialog = ({ order, open, onOpenChange }: { order: OrderDto; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState(order.customer?.fullName ?? '');
  const [alt, setAlt] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => uploadTestimonial(file!, { customerName, alt, orderId: order.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      toast.success('Testimonio guardado');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Agregar testimonio</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Captura de pantalla" required hint="JPEG, PNG o WebP, hasta 10 MB">
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
          </Field>
          <Field label="Nombre a publicar" required hint='Como ella quiere aparecer, por ejemplo "Ana L."'>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
          <Field label="¿Qué dice el mensaje?" required hint="Se usa como texto alternativo de la imagen: sin esto no lo lee un lector de pantalla">
            <Textarea rows={3} value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Entregar sin testimonial</Button>
          <Button
            type="button"
            disabled={!file || !customerName.trim() || !alt.trim()}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
