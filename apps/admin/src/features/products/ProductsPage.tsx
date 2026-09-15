import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, AlertTriangle, EyeOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router';
import { useTableParams } from '@/hooks/use-table-params';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { httpDelete, httpGet } from '@/lib/http';
import type { Paginated, ProductDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { PageHeader, PageToolbar } from '@/components/ui/page';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';

export default function ProductsPage() {
  const { page, search, setSearch, setPage } = useTableParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search }],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { page, search, limit: 20 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => httpDelete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto dado de baja');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleRemove = async (product: ProductDto) => {
    const ok = await confirm({ title: `¿Dar de baja "${product.name}"?` });
    if (ok) removeMutation.mutate(product.id);
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
              <img src={image.url} alt="" className="size-9 shrink-0 rounded-input object-cover" />
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
    { header: 'Menudeo', cell: ({ row }) => formatMoney(row.original.retailPriceOverride ?? row.original.retailListPrice) },
    { header: 'Mayoreo', cell: ({ row }) => formatMoney(row.original.wholesalePriceOverride ?? row.original.wholesaleListPrice) },
    {
      header: 'Estado',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
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
          <Button variant="ghost" size="sm" className="text-danger-fg" onClick={() => handleRemove(row.original)}>
            Dar de baja
          </Button>
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

      <PageToolbar search={{ value: search, onChange: setSearch, placeholder: 'Buscar productos...' }} />

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
