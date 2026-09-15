// Sustituye "paquetes y promociones activos" (concepto que no existe en
// este negocio: es de la agencia de viajes de referencia). El analogo real
// aqui son los productos que la duena marca como destacados desde el
// asistente de alta -- laten primero en la landing y se resumen aqui.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Sparkles, ImageOff } from 'lucide-react';
import { httpGet } from '@/lib/http';
import type { Paginated, ProductDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageState } from '@/components/ui/page';

export const FeaturedProducts = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { limit: 500 }),
  });

  const featured = (data?.items ?? []).filter((p) => p.isFeatured);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-accent" />
          Productos destacados
        </CardTitle>
        <CardDescription>Marcados desde el editor de producto — son los primeros que ve un cliente en el catalogo</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <PageState
          isLoading={isLoading}
          isEmpty={featured.length === 0}
          empty={{
            icon: <Sparkles className="size-6" />,
            title: 'Sin productos destacados',
            description: 'Marca "Producto destacado" al editar un producto para que aparezca aqui.',
          }}
        >
          {(
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featured.slice(0, 10).map((product) => {
              const image = product.images?.find((i) => i.isPrimary) ?? product.images?.[0];
              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/productos/${product.id}/editar`)}
                  className="group flex flex-col overflow-hidden rounded-input border border-border text-left transition-all hover:border-accent/40 hover:shadow-lift"
                >
                  <div className="flex aspect-square items-center justify-center bg-surface-sunken">
                    {image ? (
                      <img src={image.url} alt={product.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <ImageOff className="size-6 text-text-faint" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-2.5">
                    <p className="truncate text-caption font-semibold text-text">{product.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-bold text-accent-hover">{formatMoney(product.retailPriceOverride ?? product.retailListPrice)}</span>
                      {product.needsReview && (
                        <Badge variant="warning" className="px-1.5 py-0.5 text-micro">
                          Revisar
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          )}
        </PageState>
      </CardContent>
    </Card>
  );
};
