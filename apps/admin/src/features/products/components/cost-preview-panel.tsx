import { Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { validateMinMargin } from '@lignumvitae/types';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MoneyRow } from '@/components/domain/money-row';
import { formatMoney, formatPercent } from '@/lib/format';
import { useProductCostPreview, type PreviewCostInput } from '../use-product-cost-preview';


export const CostPreviewPanel = ({ input, overrides }: {
  input: PreviewCostInput;
  overrides?: { retail: number | null; wholesale: number | null };
}) => {
  const { data, isFetching, isLoading } = useProductCostPreview(input);

  const ready = input.kind === 'SIMPLE' ? Boolean(input.candleId) : Boolean(input.components?.length);

  return (
    <Card className="sticky top-4 flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <h3 className="text-body font-semibold text-text">Costo y precio</h3>
        {isFetching && <Spinner className="size-3.5" />}
      </div>

      {!ready ? (
        <p className="text-body-sm text-text-muted">
          {input.kind === 'SIMPLE' ? 'Elige una vela para ver el costo.' : 'Agrega al menos una vela al ramo.'}
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      ) : data ? (
        <>
          <div className="flex flex-col gap-1.5">
            <MoneyRow label="Cera" value={formatMoney(data.breakdown.unitWaxCost)} muted />
            {data.breakdown.unitWaxCost === 0 && data.breakdown.waxGramsPerUnit > 0 && (
              // Un "$0.00" mudo con gramos de cera de por medio no es un costo:
              // es que nadie ha dicho DE QUE insumo sale el precio del gramo.
              // Sin este aviso el producto se guarda con el costo incompleto y
              // el precio sale mas bajo de lo que cuesta producirlo.
              <p className="rounded-input bg-warning-bg p-2 text-caption text-warning-fg">
                Esta vela lleva {data.breakdown.waxGramsPerUnit} g de cera pero su costo es $0: falta elegir el insumo de
                cera en <Link to="/configuracion" className="underline">Configuracion</Link>, o darle una cera propia a la
                vela.
              </p>
            )}
            <MoneyRow label="Insumos" value={formatMoney(data.breakdown.unitSupplyCost)} muted />
            <MoneyRow label="Mano de obra" value={formatMoney(data.breakdown.unitLaborCost)} muted />
            <MoneyRow label="Gastos indirectos" value={formatMoney(data.breakdown.unitOverheadCost)} muted />
            <Separator />
            <MoneyRow label="Costo total" value={formatMoney(data.breakdown.unitTotalCost)} />
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            {(['retail', 'wholesale'] as const).map((level) => {
              const price = data.prices[level];
              const override = overrides?.[level];
              const isManual = typeof override === 'number';
              const marginPct = isManual
                ? validateMinMargin(override, data.breakdown.unitTotalCost, 0).marginPct
                : price.marginPct;
              const markupBadge = <Badge variant="accent" className="whitespace-nowrap">Markup {price.markupPct}%</Badge>;

              return (
                <div key={level} className="rounded-input bg-surface-sunken p-3">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-caption font-semibold uppercase text-text-muted">
                      {level === 'retail' ? 'Menudeo' : 'Mayoreo'}
                    </span>
                    {isManual ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {markupBadge}
                        <Badge variant="neutral">Manual</Badge>
                      </div>
                    ) : markupBadge}
                  </div>
                  <p className="text-heading font-semibold text-text">
                    {formatMoney(isManual ? override : price.suggestedPrice)}
                  </p>
                  <p className="text-caption text-text-muted">Margen {formatPercent(marginPct)}</p>
                  {isManual && (
                    <p className="text-caption text-text-faint">Sugerido {formatMoney(price.suggestedPrice)}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-caption text-text-faint">
            Precio sugerido a partir de {ready ? 'la politica de precios vigente' : ''}, redondeado hacia arriba. El color de
            vela, liston y aroma se cotizan aparte, en cada pedido.
          </p>
        </>
      ) : null}
    </Card>
  );
};
