import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MoneyRow } from '@/components/domain/money-row';
import { formatMoney, formatPercent } from '@/lib/format';
import { useProductCostPreview, type PreviewCostInput } from '../use-product-cost-preview';


export const CostPreviewPanel = ({ input }: { input: PreviewCostInput }) => {
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
            <MoneyRow label="Insumos" value={formatMoney(data.breakdown.unitSupplyCost)} muted />
            <MoneyRow label="Mano de obra" value={formatMoney(data.breakdown.unitLaborCost)} muted />
            <MoneyRow label="Gastos indirectos" value={formatMoney(data.breakdown.unitOverheadCost)} muted />
            <Separator />
            <MoneyRow label="Costo total" value={formatMoney(data.breakdown.unitTotalCost)} />
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <div className="rounded-input bg-surface-sunken p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-text-muted">Menudeo</span>
                <Badge variant="accent">Markup {data.prices.retail.markupPct}%</Badge>
              </div>
              <p className="text-heading font-semibold text-text">{formatMoney(data.prices.retail.suggestedPrice)}</p>
              <p className="text-caption text-text-muted">Margen {formatPercent(data.prices.retail.marginPct)}</p>
            </div>
            <div className="rounded-input bg-surface-sunken p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-text-muted">Mayoreo</span>
                <Badge variant="accent">Markup {data.prices.wholesale.markupPct}%</Badge>
              </div>
              <p className="text-heading font-semibold text-text">{formatMoney(data.prices.wholesale.suggestedPrice)}</p>
              <p className="text-caption text-text-muted">Margen {formatPercent(data.prices.wholesale.marginPct)}</p>
            </div>
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
