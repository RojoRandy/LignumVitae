import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTableParams } from '@/hooks/use-table-params';
import { httpGet, httpPost } from '@/lib/http';
import type { Paginated, PurchaseDto, ExpenseCategoryDto, UnitOfMeasure } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { RowField } from '@/components/ui/row-field';
import { DatePicker } from '@/components/ui/date-picker';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { useSupplyOptions } from '@/hooks/use-supply-options';

interface LineItem {
  kind: 'SUPPLY' | 'ASSET' | 'EXPENSE';
  description: string;
  supplyId?: number;
  assetName?: string;
  assetKind: 'MOLD' | 'TOOL' | 'EQUIPMENT';
  expenseCategoryId?: number;
  // number | null (en vez de solo number) para que el renglon pueda quedar
  // vacio mientras se captura, sin rebotar a 0 -- el mismo motivo que
  // NumberInput usa borrador string por dentro.
  packsQty: number | null;
  baseQtyPerPack: number | null;
  pricePerPack: number | null;
}

const KIND_LABEL: Record<LineItem['kind'], string> = { SUPPLY: 'Insumo', ASSET: 'Activo (molde)', EXPENSE: 'Gasto' };

const ASSET_KIND_OPTIONS = [
  { value: 'MOLD', label: 'Molde' },
  { value: 'TOOL', label: 'Herramienta' },
  { value: 'EQUIPMENT', label: 'Equipo' },
];

const UNIT_ABBR: Record<UnitOfMeasure, string> = {
  GRAM: 'g', KILOGRAM: 'kg', MILLILITER: 'ml', LITER: 'l', CENTIMETER: 'cm', METER: 'm', PIECE: 'pz', SHEET: 'pliegos',
};

export default function PurchasesPage() {
  const { page, setPage } = useTableParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [purchasedAt, setPurchasedAt] = useState<Date>(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', { page }],
    queryFn: () => httpGet<Paginated<PurchaseDto>>('/purchases', { page, limit: 20 }),
  });

  const { options: supplyOptions, supplies } = useSupplyOptions({ includeWax: true });
  const { data: expenseCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => httpGet<ExpenseCategoryDto[]>('/expenses/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => httpPost('/purchases', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      toast.success('Compra registrada');
      setDialogOpen(false);
      setItems([]);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const addItem = (kind: LineItem['kind']) =>
    setItems((prev) => [...prev, { kind, description: '', assetKind: 'MOLD', packsQty: 1, baseQtyPerPack: 1, pricePerPack: null }]);
  const updateItem = (index: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const total = items.reduce((acc, it) => acc + (it.packsQty ?? 0) * (it.pricePerPack ?? 0), 0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (items.length === 0) {
      toast.error('Agrega al menos un renglon');
      return;
    }
    createMutation.mutate({
      purchasedAt: purchasedAt.toISOString().slice(0, 10),
      platform: form.get('platform') || undefined,
      supplierName: form.get('supplierName') || undefined,
      shippingCost: form.get('shippingCost') ? Number(form.get('shippingCost')) : 0,
      notes: form.get('notes') || undefined,
      items: items.map((it) => ({
        kind: it.kind,
        description: it.description,
        supplyId: it.kind === 'SUPPLY' ? it.supplyId : undefined,
        assetName: it.kind === 'ASSET' ? it.assetName || it.description : undefined,
        assetKind: it.kind === 'ASSET' ? it.assetKind : undefined,
        expenseCategoryId: it.kind === 'EXPENSE' ? it.expenseCategoryId : undefined,
        packsQty: it.packsQty ?? 0,
        // Solo el insumo tiene un empaque real con contenido variable; molde
        // y gasto siempre son "1 pieza = 1 pieza", por eso se fuerza aqui en
        // vez de mostrar un campo que no significa nada para esos dos tipos.
        baseQtyPerPack: it.kind === 'SUPPLY' ? (it.baseQtyPerPack ?? 1) : 1,
        pricePerPack: it.pricePerPack ?? 0,
      })),
    });
  };

  const columns: ColumnDef<PurchaseDto, unknown>[] = [
    { header: 'Folio', accessorKey: 'folio' },
    { header: 'Fecha', cell: ({ row }) => formatDate(row.original.purchasedAt) },
    { header: 'Plataforma', cell: ({ row }) => row.original.platform ?? '—' },
    { header: 'Renglones', cell: ({ row }) => row.original.items.length },
    { header: 'Total', cell: ({ row }) => formatMoney(row.original.total) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-heading-lg font-semibold text-text">Compras</h1>
          <p className="text-body-sm text-text-muted">Insumos, moldes y gastos. El costo por unidad y el flete se calculan solos.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Nueva compra
        </Button>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} emptyTitle="Sin compras registradas" page={data?.page} pages={data?.pages} total={data?.total} onPageChange={setPage} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Fecha" required>
                <DatePicker value={purchasedAt} onChange={(d) => d && setPurchasedAt(d)} />
              </Field>
              <Field label="Plataforma" htmlFor="platform" hint="Shein, Mercado Libre, local...">
                <Input id="platform" name="platform" />
              </Field>
              <Field
                label="Flete"
                htmlFor="shippingCost"
                hint="Se prorratea entre los insumos"
                tooltip="Costo de envio de toda la compra. Se reparte proporcionalmente entre los renglones de insumo segun su importe, para que el costo por unidad base de cada insumo ya incluya su parte del flete."
              >
                <NumberInput id="shippingCost" name="shippingCost" step={0.01} min={0} unit="$" unitPosition="prefix" defaultValue={0} />
              </Field>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-medium text-text">Renglones</p>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => addItem('SUPPLY')}>+ Insumo</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addItem('ASSET')}>+ Molde</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => addItem('EXPENSE')}>+ Gasto</Button>
                </div>
              </div>

              {items.map((item, index) => {
                const lineTotal = (item.packsQty ?? 0) * (item.pricePerPack ?? 0);
                const supplyUnit = supplies.find((s) => s.id === item.supplyId)?.unit;
                return (
                  <div key={index} className="flex flex-col gap-3 rounded-input border border-border p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="accent">{KIND_LABEL[item.kind]}</Badge>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                        <Trash2 className="size-4 text-danger-fg" />
                      </Button>
                    </div>

                    {/* Renglon superior: que es -- el selector/nombre siempre va primero,
                        arriba, a todo lo ancho que le corresponde; la descripcion libre
                        lo acompana. Abajo del todo, arriba de los numeros, nunca al reves:
                        eso es justo lo que dejaba "descuadrado" el renglon de molde. */}
                    {item.kind === 'SUPPLY' && (
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 sm:col-span-5">
                          <Select
                            options={supplyOptions}
                            value={item.supplyId ? String(item.supplyId) : undefined}
                            onChange={(v) => updateItem(index, { supplyId: Number(v) })}
                            placeholder="Insumo que se abastece..."
                          />
                        </div>
                        <Input
                          placeholder="Descripcion (ej. 20 kilos de cera)"
                          className="col-span-12 sm:col-span-7"
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </div>
                    )}
                    {item.kind === 'EXPENSE' && (
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 sm:col-span-5">
                          <Select
                            options={(expenseCategories ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                            value={item.expenseCategoryId ? String(item.expenseCategoryId) : undefined}
                            onChange={(v) => updateItem(index, { expenseCategoryId: Number(v) })}
                            placeholder="Categoria de gasto..."
                          />
                        </div>
                        <Input
                          placeholder="Descripcion (ej. gasolina del reparto)"
                          className="col-span-12 sm:col-span-7"
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </div>
                    )}
                    {item.kind === 'ASSET' && (
                      <Input
                        placeholder="Nombre del molde/activo (ej. Molde vela redonda 8cm)"
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value, assetName: e.target.value })}
                      />
                    )}

                    {/* Renglon inferior: los numeros, siempre etiquetados -- antes solo
                        tenian placeholder, que desaparece justo al empezar a escribir. */}
                    <div className="grid grid-cols-12 gap-2">
                      {item.kind === 'SUPPLY' && (
                        <>
                          <RowField label="Paquetes" htmlFor={`packsQty-${index}`} className="col-span-4 sm:col-span-3">
                            <NumberInput id={`packsQty-${index}`} step={0.001} min={0.001} required value={item.packsQty} onChange={(v) => updateItem(index, { packsQty: v })} />
                          </RowField>
                          <RowField
                            label={`Contenido / paquete${supplyUnit ? ` (${UNIT_ABBR[supplyUnit]})` : ''}`}
                            htmlFor={`baseQtyPerPack-${index}`}
                            className="col-span-8 sm:col-span-3"
                            tooltip="Cuantas unidades base (gramos, piezas, metros...) trae CADA paquete que compraste. Con esto el sistema calcula el costo por unidad base del insumo, no solo el costo del paquete completo."
                          >
                            <NumberInput id={`baseQtyPerPack-${index}`} step={0.001} min={0.001} unit={supplyUnit ? UNIT_ABBR[supplyUnit] : undefined} required value={item.baseQtyPerPack} onChange={(v) => updateItem(index, { baseQtyPerPack: v })} />
                          </RowField>
                          <RowField label="Precio / paquete" htmlFor={`pricePerPack-${index}`} className="col-span-6 sm:col-span-3">
                            <NumberInput id={`pricePerPack-${index}`} step={0.01} min={0} unit="$" unitPosition="prefix" required value={item.pricePerPack} onChange={(v) => updateItem(index, { pricePerPack: v })} />
                          </RowField>
                          <RowField label="Importe" className="col-span-6 sm:col-span-3">
                            <div className="flex h-9 items-center px-1 text-body-sm font-medium text-text">{formatMoney(lineTotal)}</div>
                          </RowField>
                        </>
                      )}
                      {item.kind === 'ASSET' && (
                        <>
                          <RowField label="Tipo" htmlFor={`assetKind-${index}`} className="col-span-6 sm:col-span-3">
                            <Select id={`assetKind-${index}`} options={ASSET_KIND_OPTIONS} value={item.assetKind} onChange={(v) => updateItem(index, { assetKind: v as LineItem['assetKind'] })} />
                          </RowField>
                          <RowField label="Piezas" htmlFor={`packsQty-${index}`} className="col-span-6 sm:col-span-3">
                            <NumberInput id={`packsQty-${index}`} step={1} min={1} required value={item.packsQty} onChange={(v) => updateItem(index, { packsQty: v })} />
                          </RowField>
                          <RowField label="Costo / pieza" htmlFor={`pricePerPack-${index}`} className="col-span-6 sm:col-span-3">
                            <NumberInput id={`pricePerPack-${index}`} step={0.01} min={0} unit="$" unitPosition="prefix" required value={item.pricePerPack} onChange={(v) => updateItem(index, { pricePerPack: v })} />
                          </RowField>
                          <RowField label="Importe" className="col-span-6 sm:col-span-3">
                            <div className="flex h-9 items-center px-1 text-body-sm font-medium text-text">{formatMoney(lineTotal)}</div>
                          </RowField>
                        </>
                      )}
                      {item.kind === 'EXPENSE' && (
                        <>
                          <RowField label="Cantidad" htmlFor={`packsQty-${index}`} className="col-span-4">
                            <NumberInput id={`packsQty-${index}`} step={1} min={1} required value={item.packsQty} onChange={(v) => updateItem(index, { packsQty: v })} />
                          </RowField>
                          <RowField label="Importe unitario" htmlFor={`pricePerPack-${index}`} className="col-span-4">
                            <NumberInput id={`pricePerPack-${index}`} step={0.01} min={0} unit="$" unitPosition="prefix" required value={item.pricePerPack} onChange={(v) => updateItem(index, { pricePerPack: v })} />
                          </RowField>
                          <RowField label="Importe" className="col-span-4">
                            <div className="flex h-9 items-center px-1 text-body-sm font-medium text-text">{formatMoney(lineTotal)}</div>
                          </RowField>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {items.length > 0 && (
                <div className="flex justify-end text-body-sm font-medium text-text">Subtotal: {formatMoney(total)}</div>
              )}
            </div>

            <Field label="Notas" htmlFor="notes">
              <Input id="notes" name="notes" />
            </Field>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={createMutation.isPending}>Registrar compra</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
