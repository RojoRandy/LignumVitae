// Editor de renglones de una cotizacion. Mismo patron add/remove/update de
// SupplyTemplateEditor (components/domain/supply-template-editor.tsx), pero
// con mas campos por renglon: color, campos por insumo (liston...), aroma, personalizacion, y dos
// overrides opcionales (minutos de diseno y precio manual).
import { Plus, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { RowField } from '@/components/ui/row-field';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReadonlyAmount } from '@/components/ui/page';
import { useProductOptions } from '@/hooks/use-product-options';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { formatMoney } from '@/lib/format';
import type { ItemExtraField } from '@/lib/types';

export interface QuotationLineItemRow {
  productId: number | null;
  quantity: number | null;
  candleColor: string;
  /** Legacy: solo se muestra si un renglon viejo lo trae. */
  ribbonColor: string;
  extraFields: ItemExtraField[];
  withFragrance: boolean;
  fragranceSupplyId: number | null;
  personalizationText: string;
  /** null = usa los minutos de diseno de la plantilla del producto; 0 = el
   *  cliente reutiliza el diseno, no se cobra. */
  setupMinutesOverride: number | null;
  /** null = usa el precio de lista sugerido. */
  unitPriceOverride: number | null;
}

export const emptyQuotationLineRow = (): QuotationLineItemRow => ({
  productId: null,
  quantity: 1,
  candleColor: '',
  ribbonColor: '',
  extraFields: [],
  withFragrance: false,
  fragranceSupplyId: null,
  personalizationText: '',
  setupMinutesOverride: null,
  unitPriceOverride: null,
});

interface RowPreview {
  unitPrice: number;
  lineTotal: number;
  lineMargin: number;
}

interface QuotationLineItemEditorProps {
  rows: QuotationLineItemRow[];
  onChange: (rows: QuotationLineItemRow[]) => void;
  previews?: (RowPreview | undefined)[];
}

export const QuotationLineItemEditor = ({ rows, onChange, previews }: QuotationLineItemEditorProps) => {
  const { options: productOptions, products } = useProductOptions();
  const { supplies } = useSupplyOptions();
  const fragranceOptions = supplies
    .filter((supply) => supply.isFragrance)
    .map((supply) => ({ value: String(supply.id), label: supply.name }));

  // Insumos del BOM marcados "Indicar en cotizacion": un campo libre por cada uno.
  const quoteFieldsOf = (productId: number | null) => {
    const fields = new Map<number, string>();
    for (const { supply } of products.find((p) => p.id === productId)?.supplies ?? []) {
      if (supply.askInQuote && supply.quoteFieldLabel) fields.set(supply.id, supply.quoteFieldLabel);
    }
    return [...fields].map(([supplyId, label]) => ({ supplyId, label }));
  };
  const setExtraField = (index: number, supplyId: number, label: string, value: string) => {
    const others = rows[index].extraFields.filter((field) => field.supplyId !== supplyId);
    update(index, { extraFields: value ? [...others, { supplyId, label, value }] : others });
  };

  const update = (index: number, patch: Partial<QuotationLineItemRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, emptyQuotationLineRow()]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium text-text">Renglones</p>
      </div>

      {rows.map((row, index) => {
        const preview = previews?.[index];
        return (
          <div key={index} className="flex flex-col gap-3 rounded-input border border-border p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  options={productOptions}
                  value={row.productId ? String(row.productId) : undefined}
                  onChange={(v) => update(index, { productId: Number(v), extraFields: [] })}
                  placeholder="Elegir producto..."
                  searchable
                />
              </div>
              {preview && (
                <Badge variant={preview.lineMargin >= 0 ? 'success' : 'danger'} className="shrink-0">
                  Margen {formatMoney(preview.lineMargin)}
                </Badge>
              )}
              <Button type="button" variant="ghost" size="icon" aria-label="Quitar renglon" onClick={() => remove(index)}>
                <Trash2 className="size-4 text-danger-fg" />
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <RowField label="Cantidad" htmlFor={`qty-${index}`} className="col-span-6 sm:col-span-2">
                <NumberInput id={`qty-${index}`} min={1} step={1} required value={row.quantity} onChange={(v) => update(index, { quantity: v })} />
              </RowField>
              <RowField label="Color de vela" htmlFor={`color-${index}`} className="col-span-6 sm:col-span-3">
                <Input id={`color-${index}`} value={row.candleColor} onChange={(e) => update(index, { candleColor: e.target.value })} />
              </RowField>
              {row.ribbonColor && (
                <RowField label="Liston (anterior)" htmlFor={`ribbon-${index}`} className="col-span-6 sm:col-span-3">
                  <Input id={`ribbon-${index}`} value={row.ribbonColor} onChange={(e) => update(index, { ribbonColor: e.target.value })} />
                </RowField>
              )}
              {quoteFieldsOf(row.productId).map(({ supplyId, label }) => (
                <RowField key={supplyId} label={label} htmlFor={`extra-${index}-${supplyId}`} className="col-span-6 sm:col-span-3">
                  <Input
                    id={`extra-${index}-${supplyId}`}
                    maxLength={60}
                    value={row.extraFields.find((field) => field.supplyId === supplyId)?.value ?? ''}
                    onChange={(e) => setExtraField(index, supplyId, label, e.target.value)}
                  />
                </RowField>
              ))}
              <div className="col-span-6 sm:col-span-4 flex items-end gap-2 pb-0.5">
                <label className="flex items-center gap-2 text-body-sm text-text">
                  <Switch checked={row.withFragrance} onCheckedChange={(v) => update(index, { withFragrance: v, fragranceSupplyId: v ? row.fragranceSupplyId : null })} />
                  Con aroma
                </label>
              </div>
              {row.withFragrance && (
                <RowField label="Aroma" htmlFor={`fragrance-${index}`} className="col-span-12 sm:col-span-6">
                  <Select
                    id={`fragrance-${index}`}
                    options={fragranceOptions}
                    value={row.fragranceSupplyId ? String(row.fragranceSupplyId) : undefined}
                    onChange={(v) => update(index, { fragranceSupplyId: v ? Number(v) : null })}
                    placeholder="Elegir aroma..."
                    searchable
                    required
                  />
                  {fragranceOptions.length === 0 && (
                    <p className="text-caption text-text-muted">No hay insumos marcados como aroma en Inventario.</p>
                  )}
                </RowField>
              )}
              <RowField label="Personalizacion" htmlFor={`personalization-${index}`} className="col-span-12 sm:col-span-6">
                <Input id={`personalization-${index}`} placeholder="Nombre y fecha del evento..." value={row.personalizationText} onChange={(e) => update(index, { personalizationText: e.target.value })} />
              </RowField>
              <RowField
                label="Minutos de diseno"
                htmlFor={`setup-${index}`}
                className="col-span-6 sm:col-span-3"
                tooltip="Vacio: usa los minutos de diseno de la plantilla del producto. 0: el cliente reutiliza un diseno ya pagado, no se cobra diseno en este renglon."
              >
                <NumberInput id={`setup-${index}`} min={0} step={1} unit="min" value={row.setupMinutesOverride} onChange={(v) => update(index, { setupMinutesOverride: v })} />
              </RowField>
              <RowField
                label="Precio manual"
                htmlFor={`price-${index}`}
                className="col-span-6 sm:col-span-3"
                tooltip="Vacio: usa el precio de lista sugerido. Un precio manual se valida contra el piso de margen de Configuracion."
              >
                <NumberInput id={`price-${index}`} min={0} step={0.01} unit="$" unitPosition="prefix" value={row.unitPriceOverride} onChange={(v) => update(index, { unitPriceOverride: v })} />
              </RowField>
              <RowField label="Precio final" className="col-span-6 sm:col-span-3">
                <ReadonlyAmount>{preview ? formatMoney(preview.unitPrice) : '—'}</ReadonlyAmount>
              </RowField>
              <RowField label="Importe" className="col-span-6 sm:col-span-3">
                <ReadonlyAmount>{preview ? formatMoney(preview.lineTotal) : '—'}</ReadonlyAmount>
              </RowField>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" size="sm" onClick={add} className="self-start">
        <Plus className="size-3.5" /> Agregar renglon
      </Button>
    </div>
  );
};
