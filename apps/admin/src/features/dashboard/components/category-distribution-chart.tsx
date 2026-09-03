// Distribucion real del catalogo por categoria, coloreada con el MISMO
// colorHex que la duena eligio para cada categoria en /categorias -- el
// grafico se siente propio del negocio, no una paleta generica de charts.
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { httpGet } from '@/lib/http';
import type { CandleCategoryDto, Paginated, ProductDto } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PieChartIcon } from 'lucide-react';

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: { fill: string };
}

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-input border border-border bg-surface-raised px-3 py-2 shadow-lift">
      <p className="flex items-center gap-2 text-body-sm font-semibold text-text">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.payload.fill }} />
        {entry.name}
      </p>
      <p className="text-caption text-text-muted">
        {entry.value} producto{entry.value === 1 ? '' : 's'}
      </p>
    </div>
  );
};

export const CategoryDistributionChart = () => {
  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { limit: 100 }),
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'all-for-chart'],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { limit: 500 }),
  });

  const chartData = (categories?.items ?? [])
    .map((category) => ({
      name: category.name,
      value: (products?.items ?? []).filter((p) => p.categoryId === category.id).length,
      fill: category.colorHex,
    }))
    .filter((entry) => entry.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogo por categoria</CardTitle>
        <CardDescription>{products?.total ?? 0} productos activos, agrupados como en el catalogo impreso</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState icon={<PieChartIcon className="size-6" />} title="Sin productos todavia" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} paddingAngle={2} strokeWidth={2} stroke="var(--color-surface-raised)">
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                iconSize={9}
                formatter={(value) => <span className="text-body-sm text-text">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
