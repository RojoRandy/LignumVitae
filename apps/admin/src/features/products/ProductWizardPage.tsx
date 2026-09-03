// Asistente de alta de producto: eliges la vela (o las velas del ramo),
// eliges empaque y tarjeta -lo que pre-llena el BOM desde las plantillas-,
// y ajustas minutos extra si hace falta. El panel de la derecha muestra el
// costo desglosandose en vivo contra /products/preview-cost, sin guardar
// nada hasta que se pulsa Guardar.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react';
import { ApiError, validateMinMargin } from '@lignumvitae/types';
import { errorMessage, httpGet, httpPatch, httpPost } from '@/lib/http';
import { useFieldErrors } from '@/hooks/use-field-errors';
import { useSettings } from '@/hooks/use-settings';
import type { CandleCategoryDto, CandleDto, CardTypeDto, Paginated, PackagingTypeDto, ProductDto } from '@/lib/types';
import { formatMoney, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { RowField } from '@/components/ui/row-field';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CostPreviewPanel } from './components/cost-preview-panel';
import type { PreviewCostInput } from './use-product-cost-preview';

export default function ProductWizardPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { fieldErrors, formError, handleError, clear } = useFieldErrors();

  const [kind, setKind] = useState<'SIMPLE' | 'BOUQUET'>('SIMPLE');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [candleId, setCandleId] = useState<string | undefined>();
  const [packagingTypeId, setPackagingTypeId] = useState<string | undefined>();
  const [cardTypeId, setCardTypeId] = useState<string | undefined>();
  const [components, setComponents] = useState<{ candleId: number | null; quantity: number | null }[]>([]);
  const [extraSetupMinutes, setExtraSetupMinutes] = useState(0);
  const [extraPackMinutes, setExtraPackMinutes] = useState(0);
  const [assemblyMinutes, setAssemblyMinutes] = useState(0);
  const [allowsFragrance, setAllowsFragrance] = useState(true);
  const [isVisibleOnLanding, setIsVisibleOnLanding] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ['products', id],
    queryFn: () => httpGet<ProductDto>(`/products/${id}`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (!existing) return;
    setKind(existing.kind);
    setName(existing.name);
    setCategoryId(String(existing.categoryId));
    setDescription(existing.description ?? '');
    setCandleId(existing.candleId ? String(existing.candleId) : undefined);
    setPackagingTypeId(existing.packagingTypeId ? String(existing.packagingTypeId) : undefined);
    setCardTypeId(existing.cardTypeId ? String(existing.cardTypeId) : undefined);
    setComponents((existing.components ?? []).map((c) => ({ candleId: c.candleId, quantity: c.quantity })));
    setExtraSetupMinutes(existing.extraSetupMinutes);
    setExtraPackMinutes(existing.extraPackMinutes);
    setAssemblyMinutes(existing.assemblyMinutes);
    setAllowsFragrance(existing.allowsFragrance);
    setIsVisibleOnLanding(existing.isVisibleOnLanding);
    setIsFeatured(existing.isFeatured);
  }, [existing]);

  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { limit: 100 }),
  });
  const { data: candles } = useQuery({
    queryKey: ['candles', 'all'],
    queryFn: () => httpGet<Paginated<CandleDto>>('/candles', { limit: 200 }),
  });
  const { data: packagingTypes } = useQuery({
    queryKey: ['packaging-types', 'all'],
    queryFn: () => httpGet<Paginated<PackagingTypeDto>>('/packaging-types', { limit: 100 }),
  });
  const { data: cardTypes } = useQuery({
    queryKey: ['card-types', 'all'],
    queryFn: () => httpGet<Paginated<CardTypeDto>>('/card-types', { limit: 100 }),
  });

  const candleOptions = (candles?.items ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
    hint: `${c.grams} g · ${c.category?.name ?? ''}`,
  }));
  const packagingOptions = (packagingTypes?.items ?? []).map((p) => ({ value: String(p.id), label: p.name }));
  const cardOptions = (cardTypes?.items ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  const categoryOptions = (categories?.items ?? []).map((c) => ({ value: String(c.id), label: c.name }));

  const previewInput: PreviewCostInput = useMemo(
    () => ({
      kind,
      candleId: candleId ? Number(candleId) : undefined,
      packagingTypeId: packagingTypeId ? Number(packagingTypeId) : undefined,
      cardTypeId: cardTypeId ? Number(cardTypeId) : undefined,
      extraSetupMinutes,
      extraPackMinutes,
      assemblyMinutes,
      components: components.filter((c) => c.candleId).map((c) => ({ candleId: c.candleId as number, quantity: c.quantity ?? 1 })),
    }),
    [kind, candleId, packagingTypeId, cardTypeId, extraSetupMinutes, extraPackMinutes, assemblyMinutes, components],
  );

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEditing ? httpPatch<ProductDto>(`/products/${id}`, body) : httpPost<ProductDto>('/products', body),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado');
      navigate(`/productos/${product.id}/editar`, { replace: true });
    },
    onError: handleError,
  });

  const duplicateMutation = useMutation({
    mutationFn: (newPackagingTypeId: number) =>
      httpPost<ProductDto>('/products', {
        name: `${name} (${packagingTypes?.items.find((p) => p.id === newPackagingTypeId)?.name ?? 'copia'})`,
        categoryId: Number(categoryId),
        kind: 'SIMPLE',
        candleId: Number(candleId),
        packagingTypeId: newPackagingTypeId,
        cardTypeId: cardTypeId ? Number(cardTypeId) : undefined,
      }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto duplicado con otro empaque');
      navigate(`/productos/${product.id}/editar`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clear();

    if (kind === 'SIMPLE' && !candleId) {
      handleError(new Error('Elige una vela'));
      return;
    }
    if (kind === 'BOUQUET' && components.filter((c) => c.candleId).length === 0) {
      handleError(new Error('Agrega al menos una vela al ramo'));
      return;
    }

    saveMutation.mutate({
      name,
      categoryId: Number(categoryId),
      kind,
      candleId: kind === 'SIMPLE' ? Number(candleId) : undefined,
      packagingTypeId: packagingTypeId ? Number(packagingTypeId) : undefined,
      cardTypeId: cardTypeId ? Number(cardTypeId) : undefined,
      description: description || undefined,
      extraSetupMinutes,
      extraPackMinutes,
      assemblyMinutes: kind === 'BOUQUET' ? assemblyMinutes : undefined,
      allowsFragrance,
      isVisibleOnLanding,
      isFeatured,
      components: kind === 'BOUQUET' ? components.filter((c) => c.candleId).map((c) => ({ candleId: c.candleId, quantity: c.quantity ?? 1 })) : undefined,
    });
  };

  const addComponent = () => setComponents((prev) => [...prev, { candleId: null, quantity: 1 }]);
  const updateComponent = (index: number, patch: Partial<{ candleId: number | null; quantity: number | null }>) =>
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const removeComponent = (index: number) => setComponents((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/productos')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-heading-lg font-semibold text-text">{isEditing ? 'Editar producto' : 'Nuevo producto'}</h1>
          <p className="text-body-sm text-text-muted">Combina una vela con su empaque para armar el modelo que se cotiza.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:col-span-2">
          <Card className="p-4">
            <Tabs value={kind} onValueChange={(v) => setKind(v as 'SIMPLE' | 'BOUQUET')}>
              <TabsList>
                <TabsTrigger value="SIMPLE">Vela individual</TabsTrigger>
                <TabsTrigger value="BOUQUET">Ramo</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre del producto" htmlFor="name" required error={fieldErrors.name} className="sm:col-span-2">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Osito Chico con Liston" required />
              </Field>
              <Field label="Categoria" required>
                <Select options={categoryOptions} value={categoryId} onChange={setCategoryId} placeholder="Elegir categoria..." />
              </Field>

              {kind === 'SIMPLE' ? (
                <Field label="Vela / molde" required error={fieldErrors.candleId}>
                  <Select options={candleOptions} value={candleId} onChange={setCandleId} placeholder="Elegir vela..." />
                </Field>
              ) : null}

              <Field label="Descripcion" className="sm:col-span-2">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </Field>
            </div>
          </Card>

          {kind === 'BOUQUET' && (
            <Card className="flex flex-col gap-3 p-4">
              <h3 className="text-body font-semibold text-text">Velas que arma el ramo</h3>
              {components.map((component, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      options={candleOptions}
                      value={component.candleId ? String(component.candleId) : undefined}
                      onChange={(v) => updateComponent(index, { candleId: Number(v) })}
                      placeholder="Elegir vela..."
                    />
                  </div>
                  <RowField label="Piezas" htmlFor={`bouquet-quantity-${index}`} className="w-20">
                    <NumberInput id={`bouquet-quantity-${index}`} min={1} step={1} required value={component.quantity} onChange={(v) => updateComponent(index, { quantity: v })} />
                  </RowField>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeComponent(index)}>
                    <Trash2 className="size-4 text-danger-fg" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addComponent} className="self-start">
                <Plus className="size-3.5" /> Agregar vela
              </Button>
              <Field
                label="Minutos de armar el ramo"
                htmlFor="assemblyMinutes"
                hint="Envolver y atar, por pieza de ramo"
                tooltip="A diferencia de los minutos de diseno/empaque (que se reparten entre TODAS las piezas del pedido), este tiempo se cobra completo en CADA ramo, porque armar un ramo es un trabajo por pieza, no por pedido."
              >
                <NumberInput
                  id="assemblyMinutes"
                  min={0}
                  step={1}
                  unit="min"
                  className="w-32"
                  value={assemblyMinutes}
                  onChange={(v) => setAssemblyMinutes(v ?? 0)}
                />
              </Field>
            </Card>
          )}

          <Card className="flex flex-col gap-4 p-4">
            <h3 className="text-body font-semibold text-text">Empaque y tarjeta</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Empaque" hint="Pre-llena los insumos desde su plantilla">
                <Select options={packagingOptions} value={packagingTypeId} onChange={setPackagingTypeId} placeholder="Sin empaque (sola)" />
              </Field>
              <Field label="Tarjeta">
                <Select options={cardOptions} value={cardTypeId} onChange={setCardTypeId} placeholder="Sin tarjeta" />
              </Field>
              <Field
                label="Minutos extra de diseno"
                htmlFor="extraSetupMinutes"
                hint="Por pedido, ademas del empaque/tarjeta"
                tooltip="Minutos adicionales a los que ya aporta la plantilla de empaque/tarjeta elegida arriba, para este producto en particular (ej. un montaje mas elaborado). Se reparte entre las piezas del pedido, igual que el resto de los minutos de diseno."
              >
                <NumberInput id="extraSetupMinutes" min={0} step={1} unit="min" value={extraSetupMinutes} onChange={(v) => setExtraSetupMinutes(v ?? 0)} />
              </Field>
              <Field
                label="Minutos extra de empaquetado"
                htmlFor="extraPackMinutes"
                hint="Por pieza, ademas del empaque"
                tooltip="Minutos adicionales a los que ya aporta la plantilla de empaque elegida arriba, para este producto en particular. Se multiplica por cada pieza del pedido, igual que el resto de los minutos de empaquetado."
              >
                <NumberInput id="extraPackMinutes" min={0} step={1} unit="min" value={extraPackMinutes} onChange={(v) => setExtraPackMinutes(v ?? 0)} />
              </Field>
            </div>
          </Card>

          {isEditing && existing && <PriceOverrideCard product={existing} />}

          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text">Permite aroma</p>
                <p className="text-caption text-text-muted">Se cobra y se elige en cada cotizacion</p>
              </div>
              <Switch checked={allowsFragrance} onCheckedChange={setAllowsFragrance} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text">Visible en la landing</p>
                <p className="text-caption text-text-muted">Sin precios, solo catalogo</p>
              </div>
              <Switch checked={isVisibleOnLanding} onCheckedChange={setIsVisibleOnLanding} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-text">Producto destacado</p>
                <p className="text-caption text-text-muted">Aparece en "Destacados" del dashboard y primero en la landing</p>
              </div>
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
            </div>
          </Card>

          {formError && <p className="text-body-sm text-danger-fg">{formError}</p>}

          <div className="flex items-center justify-between gap-2">
            {isEditing && kind === 'SIMPLE' && (
              <DuplicateWithPackaging
                packagingOptions={packagingOptions.filter((p) => p.value !== packagingTypeId)}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                loading={duplicateMutation.isPending}
              />
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/productos')}>
                Cancelar
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-1">
          <CostPreviewPanel input={previewInput} />
        </div>
      </div>
    </div>
  );
}

// Fija un precio de menudeo/mayoreo distinto al sugerido para ESTE producto
// (una promocion, un cliente frecuente...). Solo tiene sentido una vez que
// el producto ya existe: valida contra product.unitTotalCost, que solo se
// conoce despues del primer guardado. La API (setPriceOverride en
// products.service.ts) es la que de verdad manda: aqui el margen se
// recalcula en vivo con la misma formula (validateMinMargin) nada mas para
// que la persona vea el rechazo ANTES de intentar guardar, no en vez de
// validar del lado del servidor.
const PriceOverrideCard = ({ product }: { product: ProductDto }) => {
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

const DuplicateWithPackaging = ({
  packagingOptions,
  onDuplicate,
  loading,
}: {
  packagingOptions: { value: string; label: string }[];
  onDuplicate: (packagingTypeId: number) => void;
  loading: boolean;
}) => {
  const [value, setValue] = useState<string | undefined>();
  return (
    <div className="flex items-center gap-2">
      <div className="w-48">
        <Select options={packagingOptions} value={value} onChange={setValue} placeholder="Otro empaque..." />
      </div>
      <Button type="button" variant="secondary" disabled={!value} loading={loading} onClick={() => value && onDuplicate(Number(value))}>
        <Copy className="size-3.5" /> Duplicar
      </Button>
    </div>
  );
};
