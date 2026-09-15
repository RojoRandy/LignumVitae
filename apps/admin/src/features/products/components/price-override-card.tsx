import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, validateMinMargin } from '@lignumvitae/types';
import { errorMessage, httpPatch } from '@/lib/http';
import { useSettings } from '@/hooks/use-settings';
import { formatMoney, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProductDto } from '@/lib/types';

// Fija un precio de menudeo/mayoreo distinto al sugerido para ESTE producto
// (una promocion, un cliente frecuente...). Solo tiene sentido una vez que
// el producto ya existe: valida contra product.unitTotalCost, que solo se
// conoce despues del primer guardado. La API (setPriceOverride en
// products.service.ts) es la que de verdad manda: aqui el margen se
// recalcula en vivo con la misma formula (validateMinMargin) nada mas para
// que la persona vea el rechazo ANTES de intentar guardar, no en vez de
// validar del lado del servidor.
export const PriceOverrideCard = ({ product }: { product: ProductDto }) => {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const [retail, setRetail] = useState<number | null>(product.retailPriceOverride ? Number(product.retailPriceOverride) : null);
  const [wholesale, setWholesale] = useState<number | null>(product.wholesalePriceOverride ? Number(product.wholesalePriceOverride) : null);
  const [fieldErrors, setFieldErrors] = useState<{ retailPriceOverride?: string; wholesalePriceOverride?: string }>({});

  const unitTotalCost = Number(product.unitTotalCost);
  const minMarginPct = settings ? Number(settings.minMarginPct) : 0;

  const saveMutation = useMutation({
    mutationFn: () =>
      httpPatch(`/products/${product.id}/price-override`, {
        retailPriceOverride: retail,
        wholesalePriceOverride: wholesale,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', String(product.id)] });
      setFieldErrors({});
      toast.success('Precio manual guardado');
    },
    onError: (error) => {
      const details = error instanceof ApiError ? (error.details as { field?: 'retailPriceOverride' | 'wholesalePriceOverride'; minPrice?: number } | undefined) : undefined;
      if (details?.field) {
        setFieldErrors({ [details.field]: `Deja menos del ${minMarginPct}% de margen minimo. El precio mas bajo permitido es ${formatMoney(details.minPrice ?? 0)}.` });
      } else {
        setFieldErrors({});
        toast.error(errorMessage(error));
      }
    },
  });

  const retailCheck = retail !== null ? validateMinMargin(retail, unitTotalCost, minMarginPct) : null;
  const wholesaleCheck = wholesale !== null ? validateMinMargin(wholesale, unitTotalCost, minMarginPct) : null;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-body font-semibold text-text">Precio manual</h3>
        <p className="text-caption text-text-muted">
          Opcional, para este producto en particular (una promocion, un cliente frecuente...). Debe dejar al menos el{' '}
          {minMarginPct}% de margen configurado en Precios. Deja el campo vacio para volver a usar el precio sugerido.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Menudeo" htmlFor="retailPriceOverride" error={fieldErrors.retailPriceOverride} hint={`Sugerido: ${formatMoney(product.retailListPrice)}`}>
          <NumberInput id="retailPriceOverride" step={0.01} min={0} unit="$" unitPosition="prefix" value={retail} onChange={setRetail} />
        </Field>
        <Field label="Mayoreo" htmlFor="wholesalePriceOverride" error={fieldErrors.wholesalePriceOverride} hint={`Sugerido: ${formatMoney(product.wholesaleListPrice)}`}>
          <NumberInput id="wholesalePriceOverride" step={0.01} min={0} unit="$" unitPosition="prefix" value={wholesale} onChange={setWholesale} />
        </Field>
      </div>
      {(retailCheck || wholesaleCheck) && (
        <div className="flex flex-wrap gap-2">
          {retailCheck && (
            <Badge variant={retailCheck.ok ? 'success' : 'danger'}>Margen menudeo: {formatPercent(retailCheck.marginPct)}</Badge>
          )}
          {wholesaleCheck && (
            <Badge variant={wholesaleCheck.ok ? 'success' : 'danger'}>Margen mayoreo: {formatPercent(wholesaleCheck.marginPct)}</Badge>
          )}
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="self-start">
        Guardar precio manual
      </Button>
    </Card>
  );
};
