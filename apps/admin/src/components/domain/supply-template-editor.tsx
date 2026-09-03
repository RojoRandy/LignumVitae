// Editor de lista de insumos, reutilizado por velas (mecha, colorante),
// empaques (celofan, liston...) y tarjetas (etiqueta, tarjeta impresa). Cada
// renglon es {supplyId, quantity, unit}; el unit se autocompleta con el del
// insumo elegido para no obligar a recapturarlo.
import { Plus, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { RowField } from '@/components/ui/row-field';
import { Button } from '@/components/ui/button';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { formatMoney } from '@/lib/format';
import type { UnitOfMeasure } from '@/lib/types';

export interface SupplyTemplateRow {
  supplyId: number | null;
  quantity: number | null;
  unit: UnitOfMeasure;
  note?: string;
}

const UNIT_ABBR: Record<UnitOfMeasure, string> = {
  GRAM: 'g', KILOGRAM: 'kg', MILLILITER: 'ml', LITER: 'l', CENTIMETER: 'cm', METER: 'm', PIECE: 'pz', SHEET: 'pliegos',
};

export const SupplyTemplateEditor = ({
  rows,
  onChange,
  label = 'Insumos',
}: {
  rows: SupplyTemplateRow[];
  onChange: (rows: SupplyTemplateRow[]) => void;
  label?: string;
}) => {
  const { supplies, options } = useSupplyOptions();

  const update = (index: number, patch: Partial<SupplyTemplateRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const add = () => onChange([...rows, { supplyId: null, quantity: 1, unit: 'PIECE' }]);

  const totalCost = rows.reduce((acc, r) => {
    const supply = supplies.find((s) => s.id === r.supplyId);
    return acc + (supply ? Number(supply.currentUnitCost) * (r.quantity ?? 0) : 0);
  }, 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-body-sm font-medium text-text">{label}</p>
        {rows.length > 0 && <span className="text-caption text-text-muted">Subtotal: {formatMoney(totalCost)}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                options={options}
                value={row.supplyId ? String(row.supplyId) : undefined}
                onChange={(value) => {
                  const supply = supplies.find((s) => s.id === Number(value));
                  update(index, { supplyId: Number(value), unit: supply?.unit ?? row.unit });
                }}
                placeholder="Elegir insumo..."
              />
            </div>
            <RowField
              label="Cantidad"
              htmlFor={`supply-template-quantity-${index}`}
              className="w-28"
              tooltip="Cuanto de este insumo lleva UNA pieza, en la unidad base del insumo (se autocompleta al elegirlo arriba)."
            >
              <NumberInput
                id={`supply-template-quantity-${index}`}
                step={0.0001}
                min={0.0001}
                unit={UNIT_ABBR[row.unit]}
                required
                value={row.quantity}
                onChange={(value) => update(index, { quantity: value })}
              />
            </RowField>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="size-4 text-danger-fg" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={add} className="self-start">
        <Plus className="size-3.5" /> Agregar insumo
      </Button>
    </div>
  );
};
