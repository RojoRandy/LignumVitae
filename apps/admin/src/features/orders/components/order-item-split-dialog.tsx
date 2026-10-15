import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { httpPost, errorMessage } from '@/lib/http';
import type { OrderDto, OrderItemDto } from '@/lib/types';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Part {
  quantity: number | null;
  candleColor: string;
  fragranceSupplyId: string;
}

const MAX_PARTS = 20;

export const OrderItemSplitDialog = ({
  order,
  item,
  open,
  onOpenChange,
}: {
  order: OrderDto;
  item: OrderItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const { supplies, isLoading: loadingSupplies } = useSupplyOptions();
  const fragranceOptions = supplies
    .filter((supply) => supply.isFragrance && supply.isActive)
    .map((supply) => ({ value: String(supply.id), label: supply.name }));

  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    if (!open || !item) return;
    const blank = { candleColor: item.candleColor ?? '', fragranceSupplyId: '' };
    setParts([{ quantity: item.quantity, ...blank }, { quantity: null, ...blank }]);
  }, [open, item]);

  const updatePart = (index: number, patch: Partial<Part>) =>
    setParts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const mutation = useMutation({
    mutationFn: () =>
      httpPost<OrderDto>(`/orders/${order.id}/items/${item!.id}/split`, {
        parts: parts.map(({ quantity, candleColor, fragranceSupplyId }) => ({
          quantity,
          candleColor,
          ...(fragranceSupplyId ? { fragranceSupplyId: Number(fragranceSupplyId) } : {}),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Renglón dividido');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!item) return null;

  const sum = parts.reduce((total, part) => total + (part.quantity ?? 0), 0);
  const valid = sum === item.quantity && parts.every((part) => part.quantity !== null && part.quantity >= 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dividir {item.productName}</DialogTitle>
          <DialogDescription>Cada parte queda como un renglón con su color y aroma. El precio unitario no cambia.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {parts.map((part, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              {/* NumberInput y Select no reenvian aria-label: se nombran con un label oculto. */}
              <label htmlFor={`split-qty-${index}`} className="sr-only">Cantidad parte {index + 1}</label>
              <NumberInput
                id={`split-qty-${index}`}
                className="w-24"
                min={1}
                step={1}
                precision={0}
                value={part.quantity}
                onChange={(quantity) => updatePart(index, { quantity })}
              />
              <Input
                className="min-w-32 flex-1"
                placeholder="Color"
                aria-label={`Color parte ${index + 1}`}
                value={part.candleColor}
                onChange={(e) => updatePart(index, { candleColor: e.target.value })}
              />
              {item.withFragrance && (
                <>
                  <label htmlFor={`split-fragrance-${index}`} className="sr-only">Aroma parte {index + 1}</label>
                  <Select
                    id={`split-fragrance-${index}`}
                    className="min-w-40 flex-1"
                    options={fragranceOptions}
                    loading={loadingSupplies}
                    value={part.fragranceSupplyId}
                    placeholder={item.fragranceName ?? 'Aroma...'}
                    onChange={(value) => updatePart(index, { fragranceSupplyId: value })}
                  />
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar parte"
                disabled={parts.length <= 2}
                onClick={() => setParts((rows) => rows.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={parts.length >= MAX_PARTS}
              onClick={() => setParts((rows) => [...rows, { quantity: null, candleColor: item.candleColor ?? '', fragranceSupplyId: '' }])}
            >
              <Plus className="size-3.5" /> Agregar parte
            </Button>
            <p className={cn('text-body-sm', sum === item.quantity ? 'text-text-muted' : 'text-danger-fg')}>
              Suman {sum} de {item.quantity}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" disabled={!valid} loading={mutation.isPending} onClick={() => mutation.mutate()}>Dividir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
