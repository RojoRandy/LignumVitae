import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpPatch, errorMessage } from '@/lib/http';
import type { ItemExtraField, OrderDto, OrderItemDto } from '@/lib/types';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const OrderItemEditDialog = ({
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

  const [candleColor, setCandleColor] = useState('');
  const [ribbonColor, setRibbonColor] = useState('');
  const [personalizationText, setPersonalizationText] = useState('');
  const [extraFields, setExtraFields] = useState<ItemExtraField[]>([]);
  const [fragranceSupplyId, setFragranceSupplyId] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setCandleColor(item.candleColor ?? '');
    setRibbonColor(item.ribbonColor ?? '');
    setPersonalizationText(item.personalizationText ?? '');
    setExtraFields(item.extraFields ?? []);
    setFragranceSupplyId('');
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: () =>
      httpPatch<OrderDto>(`/orders/${order.id}/items/${item!.id}`, {
        candleColor,
        ...(item!.ribbonColor !== null ? { ribbonColor } : {}),
        personalizationText,
        ...(item!.extraFields?.length ? { extraFields } : {}),
        ...(fragranceSupplyId ? { fragranceSupplyId: Number(fragranceSupplyId) } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Renglón actualizado');
      onOpenChange(false);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Editar {item.productName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Color de vela" htmlFor="item-candle-color">
            <Input id="item-candle-color" value={candleColor} onChange={(e) => setCandleColor(e.target.value)} />
          </Field>
          {item.ribbonColor !== null && (
            <Field label="Color de listón" htmlFor="item-ribbon-color">
              <Input id="item-ribbon-color" value={ribbonColor} onChange={(e) => setRibbonColor(e.target.value)} />
            </Field>
          )}
          {extraFields.map((field, index) => (
            <Field key={field.supplyId} label={field.label} htmlFor={`item-extra-${field.supplyId}`}>
              <Input
                id={`item-extra-${field.supplyId}`}
                maxLength={60}
                value={field.value}
                onChange={(e) => setExtraFields((rows) => rows.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))}
              />
            </Field>
          ))}
          {item.withFragrance && (
            <Field label="Aroma">
              <Select
                options={fragranceOptions}
                loading={loadingSupplies}
                value={fragranceSupplyId}
                placeholder={item.fragranceName ?? 'Definir aroma...'}
                onChange={(value) => setFragranceSupplyId(value)}
              />
            </Field>
          )}
          <Field label="Personalización" htmlFor="item-personalization">
            <Input id="item-personalization" value={personalizationText} onChange={(e) => setPersonalizationText(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
