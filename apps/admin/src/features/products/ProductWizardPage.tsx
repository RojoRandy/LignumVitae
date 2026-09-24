// Asistente de alta de producto: eliges la vela (o las velas del ramo),
// eliges empaque y tarjeta -lo que pre-llena el BOM desde las plantillas-,
// y ajustas minutos extra si hace falta. El panel de la derecha muestra el
// costo desglosandose en vivo contra /products/preview-cost, sin guardar
// nada hasta que se pulsa Guardar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { httpGet, httpPatch, httpPost } from '@/lib/http';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { useFieldErrors } from '@/hooks/use-field-errors';
import type { CandleCategoryDto, CandleDto, CardTypeDto, Paginated, PackagingTypeDto, ProductDto, SupplyTemplateItemDto } from '@/lib/types';
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
import { FormError, PageHeader, PageState } from '@/components/ui/page';
import { CostPreviewPanel } from './components/cost-preview-panel';
import { PriceOverrideCard } from './components/price-override-card';
import { ProductImagesCard } from './components/product-images-card';
import { DuplicateWithPackaging } from './components/duplicate-with-packaging';
import { useProductCostPreview, type PreviewCostInput } from './use-product-cost-preview';
import { SupplyTemplateEditor, type SupplyTemplateRow } from '@/components/domain/supply-template-editor';

type FormValues = {
  kind: 'SIMPLE' | 'BOUQUET';
  name: string;
  categoryId?: string;
  description: string;
  candleId?: string;
  packagingTypeId?: string;
  cardTypeId?: string;
  components: { candleId: number | null; quantity: number | null }[];
  extraSetupMinutes: number;
  extraPackMinutes: number;
  assemblyMinutes: number;
  allowsFragrance: boolean;
  isVisibleOnLanding: boolean;
  isFeatured: boolean;
  newUntil: string | null;
  excludedSupplyIds: number[];
  additionalSupplies: SupplyTemplateRow[];
};

function getFormValues(product?: ProductDto): FormValues {
  return {
    kind: product?.kind ?? 'SIMPLE',
    name: product?.name ?? '',
    categoryId: product ? String(product.categoryId) : undefined,
    description: product?.description ?? '',
    candleId: product?.candleId ? String(product.candleId) : undefined,
    packagingTypeId: product?.packagingTypeId ? String(product.packagingTypeId) : undefined,
    cardTypeId: product?.cardTypeId ? String(product.cardTypeId) : undefined,
    components: (product?.components ?? []).map((c) => ({ candleId: c.candleId, quantity: c.quantity })),
    extraSetupMinutes: product?.extraSetupMinutes ?? 0,
    extraPackMinutes: product?.extraPackMinutes ?? 0,
    assemblyMinutes: product?.assemblyMinutes ?? 0,
    allowsFragrance: product?.allowsFragrance ?? true,
    isVisibleOnLanding: product?.isVisibleOnLanding ?? true,
    isFeatured: product?.isFeatured ?? false,
    newUntil: product?.newUntil ?? null,
    excludedSupplyIds: product?.excludedSupplyIds ?? [],
    additionalSupplies: (product?.supplies ?? [])
      .filter((sup) => sup.source === 'MANUAL')
      .map((sup) => ({ supplyId: sup.supplyId, quantity: Number(sup.quantity), unitId: sup.unitId })),
  };
}

function removeDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // El almacenamiento puede no estar disponible en modo privado.
  }
}

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
  const [newUntil, setNewUntil] = useState<string | null>(null);
  const [newDays, setNewDays] = useState<number | null>(null);
  const isNew = newUntil !== null && new Date(newUntil) > new Date();
  const { supplies } = useSupplyOptions();
  const [excludedSupplyIds, setExcludedSupplyIds] = useState<number[]>([]);
  const [additionalSupplies, setAdditionalSupplies] = useState<SupplyTemplateRow[]>([]);
  // Etiquetado con el id: al duplicar se navega a otro producto sin desmontar
  // la pagina, y el precio tecleado del anterior no debe pasar al nuevo.
  const [overrideDraft, setOverrideDraft] = useState<{ productId: string; retail: number | null; wholesale: number | null } | null>(null);

  const { data: existing, isLoading, error } = useQuery({
    queryKey: ['products', id],
    queryFn: () => httpGet<ProductDto>(`/products/${id}`),
    enabled: isEditing,
  });

  const draftKey = `product-draft:${id ?? 'nuevo'}`;
  const hydratedId = useRef<string | null>(null);
  const baseline = useRef('');
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const serializedForm = JSON.stringify({
    kind, name, categoryId, description, candleId, packagingTypeId, cardTypeId, components, extraSetupMinutes, extraPackMinutes, assemblyMinutes, allowsFragrance, isVisibleOnLanding, isFeatured, newUntil, excludedSupplyIds, additionalSupplies,
  });

  const applyForm = useCallback((values: FormValues) => {
    setKind(values.kind);
    setName(values.name);
    setCategoryId(values.categoryId);
    setDescription(values.description);
    setCandleId(values.candleId);
    setPackagingTypeId(values.packagingTypeId);
    setCardTypeId(values.cardTypeId);
    setComponents(values.components);
    setExtraSetupMinutes(values.extraSetupMinutes);
    setExtraPackMinutes(values.extraPackMinutes);
    setAssemblyMinutes(values.assemblyMinutes);
    setAllowsFragrance(values.allowsFragrance);
    setIsVisibleOnLanding(values.isVisibleOnLanding);
    setIsFeatured(values.isFeatured);
    setNewUntil(values.newUntil);
    const remainingDays = values.newUntil === null ? 0 : (new Date(values.newUntil).getTime() - Date.now()) / 86_400_000;
    setNewDays(remainingDays > 0 ? Math.ceil(remainingDays) : null);
    setExcludedSupplyIds(values.excludedSupplyIds);
    setAdditionalSupplies(values.additionalSupplies);
  }, []);

  useEffect(() => {
    if (hydratedId.current === draftKey || (id && !existing)) return;
    const values = getFormValues(id ? existing : undefined);
    baseline.current = JSON.stringify(values);
    let draft: FormValues | null = null;
    try {
      const stored = sessionStorage.getItem(draftKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ignora borradores incompletos o con tipos incompatibles.
        if (parsed && Object.entries(values).every(([key, value]) => {
          const candidate = parsed[key];
          if (key === 'newUntil') return candidate === null || typeof candidate === 'string';
          if (Array.isArray(value)) return Array.isArray(candidate);
          if (value === undefined) return candidate === undefined || typeof candidate === 'string';
          return typeof candidate === typeof value;
        }) && (parsed.kind === 'SIMPLE' || parsed.kind === 'BOUQUET')
          && parsed.components.every((row: FormValues['components'][number]) => row
            && (row.candleId === null || typeof row.candleId === 'number')
            && (row.quantity === null || typeof row.quantity === 'number'))
          && parsed.excludedSupplyIds.every((supplyId: number) => typeof supplyId === 'number')
          && parsed.additionalSupplies.every((row: SupplyTemplateRow) => row
            && (row.supplyId === null || typeof row.supplyId === 'number')
            && (row.quantity === null || typeof row.quantity === 'number')
            && (row.unitId === null || typeof row.unitId === 'number'))) {
          draft = parsed;
        }
      }
    } catch {
      // Un borrador ilegible no debe impedir abrir el formulario.
    }
    applyForm(draft ?? values);
    setRecoveredDraft(draft !== null && JSON.stringify(draft) !== baseline.current);
    hydratedId.current = draftKey;
    setHydratedKey(draftKey);
  }, [id, existing, draftKey, applyForm]);

  useEffect(() => {
    // Espera al render que ya contiene los valores hidratados de este producto.
    if (hydratedKey !== draftKey) return;
    if (serializedForm === baseline.current) {
      removeDraft(draftKey);
      return;
    }
    try {
      sessionStorage.setItem(draftKey, serializedForm);
    } catch {
      // El formulario sigue funcionando aunque no se pueda guardar el borrador.
    }
  }, [draftKey, hydratedKey, serializedForm]);

  const discardDraft = () => {
    removeDraft(draftKey);
    const values = getFormValues(id ? existing : undefined);
    baseline.current = JSON.stringify(values);
    applyForm(values);
    setRecoveredDraft(false);
  };

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

  const validAdditionalSupplies = useMemo(
    () =>
      additionalSupplies
        .filter((row) => row.supplyId && row.unitId)
        .map((row) => ({ supplyId: row.supplyId as number, quantity: row.quantity ?? 0, unitId: row.unitId as number })),
    [additionalSupplies],
  );

  /*
   * Los insumos heredados NO se piden aparte: las tres listas que el asistente
   * ya tiene en memoria (velas, empaques, tarjetas) vienen con su
   * supplyTemplate incluido, asi que esto se deriva durante el render. El
   * servidor calcula exactamente lo mismo al guardar; aqui solo se ENSENA,
   * que es lo que faltaba: se heredaban en silencio y el usuario volvia a
   * capturar a mano el celofan que ya venia del empaque.
   */
  const inheritedSupplies = useMemo(() => {
    const rows: { supplyId: number; name: string; quantity: number; abbr: string; origin: string; excluded: boolean }[] = [];
    const pushTemplate = (template: SupplyTemplateItemDto[] | undefined, origin: string, times = 1) =>
      (template ?? []).forEach((t) =>
        rows.push({
          supplyId: t.supplyId,
          excluded: excludedSupplyIds.includes(t.supplyId),
          name: t.supply.name,
          quantity: Number(t.quantity) * times,
          abbr: t.unit.abbr,
          origin,
        }),
      );

    if (kind === 'BOUQUET') {
      components.forEach((c) => {
        const candle = candles?.items.find((x) => x.id === c.candleId);
        pushTemplate(candle?.supplyTemplate, 'Vela', c.quantity ?? 1);
      });
    } else {
      pushTemplate(candles?.items.find((c) => String(c.id) === candleId)?.supplyTemplate, 'Vela');
    }
    pushTemplate(packagingTypes?.items.find((p) => String(p.id) === packagingTypeId)?.supplyTemplate, 'Empaque');
    pushTemplate(cardTypes?.items.find((c) => String(c.id) === cardTypeId)?.supplyTemplate, 'Tarjeta');

    // Un mismo insumo repetido entre fuentes se suma en un solo renglon.
    // Todas sus apariciones comparten excluded porque se calcula por supplyId.
    const merged = new Map<number, (typeof rows)[number]>();
    rows.forEach((row) => {
      const previous = merged.get(row.supplyId);
      merged.set(row.supplyId, previous ? { ...previous, quantity: previous.quantity + row.quantity } : row);
    });
    return [...merged.values()];
  }, [kind, components, candles, candleId, packagingTypes, packagingTypeId, cardTypes, cardTypeId, excludedSupplyIds]);

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
      additionalSupplies: validAdditionalSupplies,
      excludedSupplyIds,
    }),
    [kind, candleId, packagingTypeId, cardTypeId, extraSetupMinutes, extraPackMinutes, assemblyMinutes, components, validAdditionalSupplies, excludedSupplyIds],
  );
  const { data: costPreview } = useProductCostPreview(previewInput);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEditing ? httpPatch<ProductDto>(`/products/${id}`, body) : httpPost<ProductDto>('/products', body),
    onSuccess: (product) => {
      removeDraft(draftKey);
      baseline.current = serializedForm;
      setRecoveredDraft(false);
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
      packagingTypeId: packagingTypeId ? Number(packagingTypeId) : isEditing ? null : undefined,
      cardTypeId: cardTypeId ? Number(cardTypeId) : isEditing ? null : undefined,
      description: description || undefined,
      extraSetupMinutes,
      extraPackMinutes,
      assemblyMinutes: kind === 'BOUQUET' ? assemblyMinutes : undefined,
      allowsFragrance,
      isVisibleOnLanding,
      isFeatured,
      newUntil,
      components: kind === 'BOUQUET' ? components.filter((c) => c.candleId).map((c) => ({ candleId: c.candleId, quantity: c.quantity ?? 1 })) : undefined,
      additionalSupplies: validAdditionalSupplies,
      excludedSupplyIds,
    });
  };

  const addComponent = () => setComponents((prev) => [...prev, { candleId: null, quantity: 1 }]);
  const updateComponent = (index: number, patch: Partial<{ candleId: number | null; quantity: number | null }>) =>
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const removeComponent = (index: number) => setComponents((prev) => prev.filter((_, i) => i !== index));

  if (isEditing && (isLoading || (error && !existing))) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          backTo="/productos"
          title={isEditing ? 'Editar producto' : 'Nuevo producto'}
          description="Combina una vela con su empaque para armar el modelo que se cotiza."
        />
        {isLoading ? <PageState isLoading /> : <PageState error={error} />}
      </div>
    );
  }

  const overrides = (overrideDraft?.productId === id ? overrideDraft : null) ?? (existing ? {
    retail: existing.retailPriceOverride != null ? Number(existing.retailPriceOverride) : null,
    wholesale: existing.wholesalePriceOverride != null ? Number(existing.wholesalePriceOverride) : null,
  } : undefined);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo="/productos"
        title={isEditing ? 'Editar producto' : 'Nuevo producto'}
        description="Combina una vela con su empaque para armar el modelo que se cotiza."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:col-span-2">
          {recoveredDraft && hydratedKey === draftKey && (
            <div role="status" className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken p-3 text-body-sm text-text-muted">
              <span>Recuperamos cambios sin guardar</span>
              <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
                Descartar
              </Button>
            </div>
          )}
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
                  <Button type="button" variant="ghost" size="icon" aria-label="Quitar vela del ramo" onClick={() => removeComponent(index)}>
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
                <Select options={packagingOptions} value={packagingTypeId} onChange={setPackagingTypeId} placeholder="Sin empaque (sola)" clearable />
              </Field>
              <Field label="Tarjeta">
                <Select options={cardOptions} value={cardTypeId} onChange={setCardTypeId} placeholder="Sin tarjeta" clearable />
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

          <Card className="flex flex-col gap-4 p-4">
            <h3 className="text-body font-semibold text-text">Insumos</h3>

            {inheritedSupplies.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-body-sm font-medium text-text">Vienen incluidos</p>
                <ul className="flex flex-col gap-1">
                  {inheritedSupplies.map((row) => {
                    const supply = supplies.find((s) => s.id === row.supplyId);
                    return (
                      <li key={row.supplyId} className="flex flex-wrap items-center justify-between gap-2 text-body-sm">
                        <span className={row.excluded ? 'min-w-0 text-text-faint line-through' : 'min-w-0 text-text-muted'}>
                          {row.name} · {row.quantity} {row.abbr} · {supply ? formatMoney(row.quantity * Number(supply.currentUnitCost)) : '—'}
                        </span>
                        <span className="ml-auto flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">{row.origin}</Badge>
                          {row.excluded ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExcludedSupplyIds((prev) => prev.filter((id) => id !== row.supplyId))}
                            >
                              Volver a incluir
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Quitar insumo heredado"
                              onClick={() => setExcludedSupplyIds((prev) => prev.includes(row.supplyId) ? prev : [...prev, row.supplyId])}
                            >
                              <Trash2 className="size-4 text-danger-fg" aria-hidden="true" />
                            </Button>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-caption text-text-faint">
                  Se cambian cambiando la vela, el empaque o la tarjeta.
                </p>
              </div>
            )}

            <SupplyTemplateEditor
              rows={additionalSupplies}
              onChange={setAdditionalSupplies}
              label="Insumos adicionales"
            />
            {additionalSupplies.some((row) => row.supplyId && inheritedSupplies.some((i) => i.supplyId === row.supplyId)) && (
              <p className="text-caption text-text-muted">
                Un insumo adicional que ya viene incluido reemplaza a la cantidad heredada, no se suma.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4">
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-medium text-text">Producto nuevo</p>
                  <p className="text-caption text-text-muted">Sale en Novedades de la landing por los dias que elijas</p>
                </div>
                <Switch
                  aria-label="Producto nuevo"
                  checked={isNew}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setNewUntil(new Date(Date.now() + 30 * 86_400_000).toISOString());
                      setNewDays(30);
                    } else {
                      setNewUntil(null);
                    }
                  }}
                />
              </div>
              {isNew && (
                <Field label="Dias" htmlFor="newDays">
                  <div className="flex flex-wrap items-center gap-2">
                    <NumberInput
                      id="newDays"
                      min={1}
                      step={1}
                      unit="dias"
                      className="w-32"
                      value={newDays}
                      onChange={(days) => {
                        setNewDays(days);
                        if (days !== null && days >= 1) {
                          setNewUntil(new Date(Date.now() + days * 86_400_000).toISOString());
                        }
                      }}
                    />
                    <span className="text-caption text-text-muted">Hasta {formatDateTime(newUntil)}</span>
                  </div>
                </Field>
              )}
            </div>
          </Card>

          {isEditing && existing && (
            <PriceOverrideCard
              key={existing.id}
              product={existing}
              liveUnitTotalCost={costPreview?.breakdown.unitTotalCost}
              onPricesChange={(prices) => setOverrideDraft({ productId: existing.id.toString(), ...prices })}
            />
          )}
          {isEditing && existing && <ProductImagesCard product={existing} />}

          <FormError>{formError}</FormError>

          <div className="flex items-center justify-between gap-2">
            {isEditing && kind === 'SIMPLE' && (
              <DuplicateWithPackaging
                packagingOptions={packagingOptions.filter((p) => p.value !== packagingTypeId)}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                loading={duplicateMutation.isPending}
              />
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="secondary" onClick={() => {
                removeDraft(draftKey);
                navigate('/productos');
              }}>
                Cancelar
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        </form>

        <div className="lg:col-span-1">
          <CostPreviewPanel input={previewInput} overrides={overrides} />
        </div>
      </div>
    </div>
  );
}
