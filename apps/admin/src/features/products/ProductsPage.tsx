import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, AlertTriangle, EyeOff, TrendingUp, SlidersHorizontal, Star, Image as ImageIcon, LayoutGrid, Sparkles, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useTableParams } from '@/hooks/use-table-params';
import { useSettings } from '@/hooks/use-settings';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { httpDelete, httpPatch, httpGet, httpPost } from '@/lib/http';
import { staticUrl } from '@/lib/api';
import type { Paginated, ProductDto, CandleCategoryDto, CandleDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, PageToolbar } from '@/components/ui/page';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { NumberInput } from '@/components/ui/number-input';
import { Tooltip } from '@/components/ui/tooltip';
import { Field } from '@/components/ui/field';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function ProductsPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [candleId, setCandleId] = useState<string | undefined>();
  const [highlight, setHighlight] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState('name');
  const [minMarginPct, setMinMarginPct] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [categoryId, candleId, highlight, sortBy !== 'name', minMarginPct !== null].filter(Boolean).length;
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, onlyActive, categoryId, candleId, highlight, sortBy, minMarginPct }],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', {
      page, search, onlyActive,
      categoryId: categoryId ? Number(categoryId) : undefined,
      candleId: candleId ? Number(candleId) : undefined,
      highlight: highlight || undefined,
      sortBy,
      minRetailMarginPct: minMarginPct !== null && sortBy !== 'wholesaleMargin' ? minMarginPct : undefined,
      minWholesaleMarginPct: minMarginPct !== null && sortBy === 'wholesaleMargin' ? minMarginPct : undefined,
      limit: 20,
    }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { limit: 100 }),
  });
  const { data: candles } = useQuery({
    queryKey: ['candles', 'all'],
    queryFn: () => httpGet<Paginated<CandleDto>>('/candles', { limit: 200 }),
  });
  const candleOptions = (candles?.items ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
    hint: `${c.grams} g · ${c.category?.name ?? ''}`,
  }));
  const categoryOptions = (categories?.items ?? []).map((c) => ({ value: String(c.id), label: c.name }));

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/products/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado permanentemente');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => httpPatch(`/products/${id}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto reactivado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const applyPriceMutation = useMutation({
    mutationFn: ({ id, field }: { id: number; field: 'retail' | 'wholesale' }) => {
      return httpPatch(`/products/${id}/price-override`, field === 'retail'
        ? { retailPriceOverride: null }
        : { wholesalePriceOverride: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Precio manual actualizado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const recalculateAllMutation = useMutation({
    mutationFn: () => httpPost('/products/recalculate-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Costos recalculados');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const applyAllMutation = useMutation({
    mutationFn: () => httpPost<{ applied: number }>('/products/apply-suggested-prices', {}),
    onSuccess: ({ applied }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(applied > 0
        ? `${applied} producto(s) actualizados al precio sugerido`
        : 'No hay precios manuales desfasados');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleRecalculateAll = async () => {
    const ok = await confirm({
      title: '¿Recalcular costo y precio sugerido de todo el catálogo?',
      description: 'Usa los insumos, empaques y configuración vigentes. Los precios manuales no se tocan.',
    });
    if (ok) recalculateAllMutation.mutate();
  };

  const handleApplyAll = async () => {
    const ok = await confirm({ title: '¿Aplicar el precio sugerido a todos los productos con precio manual desfasado?' });
    if (ok) applyAllMutation.mutate();
  };

  const handleRemove = async (product: ProductDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${product.name}"?` });
    if (ok) removeMutation.mutate(product.id);
  };

  const handleDeletePermanently = async (product: ProductDto) => {
    const ok = await confirm({
      title: `¿Eliminar permanentemente "${product.name}"?`,
      description: 'Esta acción no se puede deshacer. Se eliminarán el producto y sus imágenes.',
      variant: 'danger',
    });
    if (ok) deletePermanentlyMutation.mutate(product.id);
  };

  function marginVariant(value: string) {
    return settings ? (Number(value) < Number(settings.minMarginPct) ? 'danger' : 'success') : 'neutral';
  }

  const columns: ColumnDef<ProductDto, unknown>[] = [
    {
      header: 'Producto',
      cell: ({ row }) => {
        const p = row.original;
        const image = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
        return (
          <div className="flex items-center gap-3">
            {image ? (
              <img src={staticUrl(image.url)} alt="" className="size-9 shrink-0 rounded-input object-cover" />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-input bg-surface-sunken text-caption text-text-faint">
                —
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-medium text-text">{p.name}</span>
              <span className="text-caption text-text-muted">{p.sku}</span>
            </div>
          </div>
        );
      },
    },
    { header: 'Categoria', cell: ({ row }) => row.original.category?.name ?? '—' },
    { header: 'Tipo', cell: ({ row }) => <Badge variant={row.original.kind === 'BOUQUET' ? 'accent' : 'neutral'}>{row.original.kind === 'BOUQUET' ? 'Ramo' : 'Vela'}</Badge> },
    { header: 'Costo', cell: ({ row }) => formatMoney(row.original.unitTotalCost) },
    {
      header: 'Menudeo',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span>{formatMoney(row.original.retailPriceOverride ?? row.original.retailListPrice)}</span>
          {row.original.retailPriceOverride !== null && Number(row.original.retailPriceOverride) !== Number(row.original.retailListPrice) && (
            <Tooltip content={`Sugerido: ${formatMoney(row.original.retailListPrice)}`}>
              <button
                type="button"
                onClick={() => applyPriceMutation.mutate({ id: row.original.id, field: 'retail' })}
                className="flex items-center gap-0.5 rounded-full bg-warning-bg px-1.5 py-0.5 text-micro font-medium text-warning-fg hover:opacity-80"
              >
                <TrendingUp className="size-3" /> Aplicar
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      header: 'Mayoreo',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span>{formatMoney(row.original.wholesalePriceOverride ?? row.original.wholesaleListPrice)}</span>
          {row.original.wholesalePriceOverride !== null && Number(row.original.wholesalePriceOverride) !== Number(row.original.wholesaleListPrice) && (
            <Tooltip content={`Sugerido: ${formatMoney(row.original.wholesaleListPrice)}`}>
              <button
                type="button"
                onClick={() => applyPriceMutation.mutate({ id: row.original.id, field: 'wholesale' })}
                className="flex items-center gap-0.5 rounded-full bg-warning-bg px-1.5 py-0.5 text-micro font-medium text-warning-fg hover:opacity-80"
              >
                <TrendingUp className="size-3" /> Aplicar
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      header: 'Margen',
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-micro text-text-muted">Men.</span>
            <Badge variant={marginVariant(row.original.retailMarginPct)}>
              {Number(row.original.retailMarginPct).toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-micro text-text-muted">May.</span>
            <Badge variant={marginVariant(row.original.wholesaleMarginPct)}>
              {Number(row.original.wholesaleMarginPct).toFixed(1)}%
            </Badge>
          </div>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={row.original.isActive ? 'success' : 'neutral'}>{row.original.isActive ? 'Activo' : 'Baja'}</Badge>
          {row.original.needsReview && (
            <Badge variant="warning">
              <AlertTriangle className="size-3" /> Revisar
            </Badge>
          )}
          {!row.original.isVisibleOnLanding && (
            <Badge variant="neutral">
              <EyeOff className="size-3" /> Oculto
            </Badge>
          )}
          {row.original.isFeatured && (
            <Badge variant="accent">
              <Star className="size-3" /> Destacado
            </Badge>
          )}
          {row.original.images?.some((image) => image.showInHero) && (
            <Badge variant="neutral">
              <ImageIcon className="size-3" /> Portada
            </Badge>
          )}
          {row.original.images?.some((image) => image.showInGallery) && (
            <Badge variant="neutral">
              <LayoutGrid className="size-3" /> Galeria
            </Badge>
          )}
          {row.original.newUntil !== null && new Date(row.original.newUntil) > new Date() && (
            <Badge variant="success">
              <Sparkles className="size-3" /> Nuevo
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/productos/${row.original.id}/editar`)}>
            Editar
          </Button>
          {row.original.isActive ? (
            <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>
              Dar de baja
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => reactivateMutation.mutate(row.original.id)}>Reactivar</Button>
              <Button variant="ghost" size="sm" className="text-danger-fg" disabled={deletePermanentlyMutation.isPending} onClick={() => handleDeletePermanently(row.original)}>
                Eliminar
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Productos"
        description="La vela + su empaque + su tarjeta. Es lo que se cotiza."
        actions={
          <>
            <Button variant="secondary" loading={recalculateAllMutation.isPending} onClick={handleRecalculateAll}>
              <RefreshCw className="size-4" /> Recalcular costos
            </Button>
            <Button variant="secondary" loading={applyAllMutation.isPending} onClick={handleApplyAll}>
              <TrendingUp className="size-4" /> Aplicar precios sugeridos
            </Button>
            <Button onClick={() => navigate('/productos/nuevo')}>
              <Plus className="size-4" /> Nuevo producto
            </Button>
          </>
        }
      />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PageToolbar
          search={{ value: search, onChange: setSearch, placeholder: 'Buscar productos...' }}
          showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }}
          actions={
            <SheetTrigger asChild>
              <Button variant="secondary">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : 'Filtros'}
              </Button>
            </SheetTrigger>
          }
        />
        <SheetContent side="right" className="flex flex-col gap-4" aria-describedby={undefined}>
          <SheetTitle className="text-body font-semibold text-text">Filtros</SheetTitle>
          <Field label="Categoria" htmlFor="products-category">
            <Select
              id="products-category"
              options={categoryOptions}
              value={categoryId ?? ''}
              onChange={(value) => {
                setCategoryId(value);
                setPage(1);
              }}
              placeholder="Todas las categorias"
              clearable
            />
          </Field>
          <Field label="Vela / molde" htmlFor="products-candle">
            <Select
              id="products-candle"
              options={candleOptions}
              value={candleId ?? ''}
              onChange={(value) => {
                setCandleId(value);
                setPage(1);
              }}
              placeholder="Todas las velas/moldes"
              clearable
              searchable
            />
          </Field>
          <Field label="Mostrar" htmlFor="products-highlight">
            <Select
              id="products-highlight"
              options={[
                { value: 'featured', label: 'Destacados' },
                { value: 'hero', label: 'En portada' },
                { value: 'gallery', label: 'En galeria' },
                { value: 'new', label: 'Nuevos' },
              ]}
              value={highlight ?? ''}
              onChange={(value) => {
                setHighlight(value);
                setPage(1);
              }}
              placeholder="Todos"
              clearable
            />
          </Field>
          <Field label="Ordenar" htmlFor="products-sort">
            <Select
              id="products-sort"
              options={[
                { value: 'name', label: 'Ordenar por nombre' },
                { value: 'retailMargin', label: 'Mayor margen menudeo' },
                { value: 'wholesaleMargin', label: 'Mayor margen mayoreo' },
              ]}
              value={sortBy}
              onChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}
            />
          </Field>
          <Field
            label={sortBy === 'wholesaleMargin' ? 'Margen minimo mayoreo' : 'Margen minimo menudeo'}
            htmlFor="products-min-margin"
          >
            <NumberInput
              id="products-min-margin"
              value={minMarginPct}
              onChange={(value) => {
                setMinMarginPct(value);
                setPage(1);
              }}
              unit="%"
              min={0}
              step={1}
              placeholder="Margen min."
            />
          </Field>
          <Button
            variant="ghost"
            onClick={() => {
              setCategoryId(undefined);
              setCandleId(undefined);
              setHighlight(undefined);
              setSortBy('name');
              setMinMarginPct(null);
              setPage(1);
            }}
          >
            Limpiar filtros
          </Button>
        </SheetContent>
      </Sheet>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Sin productos"
        emptyDescription="Da de alta el primer producto combinando una vela con su empaque."
        page={data?.page}
        pages={data?.pages}
        total={data?.total}
        onPageChange={setPage}
      />
    </div>
  );
}
