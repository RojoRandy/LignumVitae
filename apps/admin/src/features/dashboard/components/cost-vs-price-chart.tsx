// Costo vs precio de menudeo promedio por categoria: la vista que en el
// Excel no existia -- ahi el precio se capturaba a mano sin ver el costo
// al lado. Datos reales del costeo calculado, nada inventado.
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { httpGet } from '@/lib/http';
import type { CandleCategoryDto, Paginated, ProductDto } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-input border border-border bg-surface-raised px-3 py-2 shadow-lift">
      <p className="mb-1 text-body-sm font-semibold text-text">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-caption text-text-muted">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatMoney(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const CostVsPriceChart = () => {
  const { data: categories } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => httpGet<Paginated<CandleCategoryDto>>('/categories', { limit: 100 }),
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'all-for-chart'],
    queryFn: () => httpGet<Paginated<ProductDto>>('/products', { limit: 500 }),
  });

  const chartData = (categories?.items ?? [])
    .map((category) => {
      const items = (products?.items ?? []).filter((p) => p.categoryId === category.id);
      if (items.length === 0) return null;
      const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
      return {
        name: category.name,
        costo: Math.round(avg(items.map((p) => Number(p.unitTotalCost))) * 100) / 100,
        precio: Math.round(avg(items.map((p) => Number(p.retailPriceOverride ?? p.retailListPrice))) * 100) / 100,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Costo vs precio de menudeo</CardTitle>
        <CardDescription>Promedio por categoria, calculado por el motor de costeo</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState icon={<BarChart3 className="size-6" />} title="Sin datos todavia" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-sunken)' }} />
              <Legend
                iconType="circle"
                iconSize={9}
                formatter={(value) => <span className="text-body-sm text-text">{value === 'costo' ? 'Costo' : 'Precio menudeo'}</span>}
              />
              <Bar dataKey="costo" fill="var(--color-sage-300)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="precio" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
