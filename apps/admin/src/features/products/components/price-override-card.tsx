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

// Fija precios manuales y calcula el margen con el costo en vivo cuando se recibe.
// El servidor sigue validando contra el costo guardado del producto.
export const PriceOverrideCard = ({ product, liveUnitTotalCost, onPricesChange }: {
  product: ProductDto;
  liveUnitTotalCost?: number;
  onPricesChange?: (prices: { retail: number | null; wholesale: number | null }) => void;
}) => {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const [retail, setRetail] = useState<number | null>(product.retailPriceOverride ? Number(product.retailPriceOverride) : null);
  const [wholesale, setWholesale] = useState<number | null>(product.wholesalePriceOverride ? Number(product.wholesalePriceOverride) : null);
  const [fieldErrors, setFieldErrors] = useState<{ retailPriceOverride?: string; wholesalePriceOverride?: string }>({});

  const unitTotalCost = liveUnitTotalCost ?? Number(product.unitTotalCost);
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
          <NumberInput id="retailPriceOverride" step={0.01} min={0} unit="$" unitPosition="prefix" value={retail} onChange={(value) => {
            setRetail(value);
            onPricesChange?.({ retail: value, wholesale });
          }} />
        </Field>
        <Field label="Mayoreo" htmlFor="wholesalePriceOverride" error={fieldErrors.wholesalePriceOverride} hint={`Sugerido: ${formatMoney(product.wholesaleListPrice)}`}>
          <NumberInput id="wholesalePriceOverride" step={0.01} min={0} unit="$" unitPosition="prefix" value={wholesale} onChange={(value) => {
            setWholesale(value);
            onPricesChange?.({ retail, wholesale: value });
          }} />
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
      {liveUnitTotalCost !== undefined && Math.round(liveUnitTotalCost * 100) !== Math.round(Number(product.unitTotalCost) * 100) && (
        <p className="text-caption text-warning-fg">El costo cambió y aún no se guarda. Guarda el producto antes del precio manual.</p>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="self-start">
        Guardar precio manual
      </Button>
    </Card>
  );
};
