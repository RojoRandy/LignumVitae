import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, AlertTriangle, EyeOff, TrendingUp } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { httpDelete, httpPatch, httpGet } from '@/lib/http';
import { staticUrl } from '@/lib/api';
import type { Paginated, ProductDto, CandleCategoryDto, CandleDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, PageToolbar } from '@/components/ui/page';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';

export default function ProductsPage() {
  const { page, search, setSearch, onlyActive, setOnlyActive, setPage } = useTableParams();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [candleId, setCandleId] = useState<string | undefined>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search, onlyActive, categoryId, candleId }],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { page, search, onlyActive, categoryId: categoryId ? Number(categoryId) : undefined, candleId: candleId ? Number(candleId) : undefined, limit: 20 }),
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
      const product = data?.items.find((p) => p.id === id);
      if (!product) throw new Error('Producto no encontrado');
      return httpPatch(`/products/${id}/price-override`, field === 'retail'
        ? { retailPriceOverride: Number(product.retailListPrice) }
        : { wholesalePriceOverride: Number(product.wholesaleListPrice) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Precio manual actualizado');
    },
    onError: (error) => toast.error((error as Error).message),
  });

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
          <Button onClick={() => navigate('/productos/nuevo')}>
            <Plus className="size-4" /> Nuevo producto
          </Button>
        }
      />

      <PageToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Buscar productos...' }}
        filters={
          <>
            <div className="w-full sm:w-64">
              <Select
                options={categoryOptions}
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setPage(1);
                }}
                placeholder="Todas las categorias"
                clearable
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                options={candleOptions}
                value={candleId}
                onChange={(value) => {
                  setCandleId(value);
                  setPage(1);
                }}
                placeholder="Todas las velas/moldes"
                clearable
                searchable
              />
            </div>
          </>
        }
        showInactive={{ value: !onlyActive, onChange: (v) => setOnlyActive(!v) }}
      />

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
