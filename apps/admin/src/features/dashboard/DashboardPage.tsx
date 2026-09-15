import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Boxes, CalendarClock, ClipboardList, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { httpGet } from '@/lib/http';
import type { LowStockSupplyRow, SalesStatsDto, SupplyCostDriftEntry } from '@/lib/types';
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { StatTile } from '@/components/ui/stat-tile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader, PageState } from '@/components/ui/page';
import { FeaturedProducts } from './components/featured-products';

/*
 * Las dos graficas cargan aparte: recharts pesa ~415 kB sin comprimir y el
 * dashboard es la ruta indice, asi que antes TODO el mundo lo pagaba al
 * entrar para ver dos graficas que quedan bajo el pliegue.
 */
const CategoryDistributionChart = lazy(() =>
  import('./components/category-distribution-chart').then((m) => ({ default: m.CategoryDistributionChart })),
);
const CostVsPriceChart = lazy(() =>
  import('./components/cost-vs-price-chart').then((m) => ({ default: m.CostVsPriceChart })),
);

/** Altura real de la tarjeta de grafica: reservarla evita que la pagina
 *  salte cuando el chunk termina de bajar. */
const ChartFallback = () => <Skeleton className="h-[378px] w-full rounded-card" />;

// Stagger de entrada: cada seccion aparece 60ms despues de la anterior
// (Emil Kowalski: 30-80ms entre elementos). Se ve una vez, al cargar la
// pagina -- no en cada interaccion -- asi que el costo de animarlo es cero.
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

/*
 * A nivel de modulo, NO dentro de DashboardPage: definido adentro, cada
 * render creaba un tipo de componente nuevo y React desmontaba y volvia a
 * montar el dashboard entero. Con tres queries resolviendo en momentos
 * distintos eso pasaba varias veces al entrar, y por eso la animacion de
 * entrada se repetia sola.
 */
const Section = ({
  index,
  reduceMotion,
  className,
  children,
}: {
  index: number;
  reduceMotion: boolean | null;
  className?: string;
  children: React.ReactNode;
}) => (
  <motion.div
    className={className}
    initial={reduceMotion ? false : 'hidden'}
    animate="show"
    variants={sectionVariants}
    transition={{ duration: 0.35, delay: index * 0.06, ease: [0.23, 1, 0.32, 1] }}
  >
    {children}
  </motion.div>
);

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const { data: salesStats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'sales-stats'],
    queryFn: () => httpGet<SalesStatsDto>('/dashboard/sales-stats'),
  });

  const { data: lowStock, isLoading: loadingLowStock } = useQuery({
    queryKey: ['supplies', 'low-stock'],
    queryFn: () => httpGet<LowStockSupplyRow[]>('/supplies/low-stock'),
  });

  const { data: drift, isLoading: loadingDrift } = useQuery({
    queryKey: ['supplies', 'cost-drift'],
    queryFn: () => httpGet<SupplyCostDriftEntry[]>('/supplies/cost-drift'),
  });

  return (
    <div className="flex flex-col gap-6">
      <Section index={0} reduceMotion={reduceMotion}>
        <PageHeader title="Dashboard" description="Cotizaciones, pedidos e insumos, todo lo que importa hoy." />
      </Section>

      <Section index={1} reduceMotion={reduceMotion} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Cotizaciones activas"
          value={String(salesStats?.activeQuotations ?? 0)}
          isLoading={loadingStats}
          icon={<FileText className="size-5" />}
          tone="neutral"
          onClick={() => navigate('/cotizaciones')}
        />
        <StatTile
          label="Pedidos en curso"
          value={String(salesStats?.pendingOrders ?? 0)}
          isLoading={loadingStats}
          icon={<ClipboardList className="size-5" />}
          tone="neutral"
          onClick={() => navigate('/pedidos')}
        />
        <StatTile
          label="Listos para entregar"
          value={String(salesStats?.readyOrders ?? 0)}
          isLoading={loadingStats}
          icon={<CalendarClock className="size-5" />}
          tone={salesStats?.readyOrders ? 'success' : 'neutral'}
          onClick={() => navigate('/pedidos')}
        />
        <StatTile
          label="Ingresos del mes"
          value={formatMoney(salesStats?.revenueThisMonth ?? 0)}
          isLoading={loadingStats}
          icon={<DollarSign className="size-5" />}
          tone="neutral"
        />
      </Section>

      <Section index={2} reduceMotion={reduceMotion} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Insumos bajos en stock"
          value={String(lowStock?.length ?? 0)}
          isLoading={loadingLowStock}
          icon={<Boxes className="size-5" />}
          tone={lowStock?.length ? 'danger' : 'neutral'}
        />
        <StatTile
          label="Costos desfasados"
          value={String(drift?.length ?? 0)}
          isLoading={loadingDrift}
          hint="Insumos con costo sugerido distinto al actual"
          icon={<TrendingUp className="size-5" />}
          tone={drift?.length ? 'warning' : 'neutral'}
        />
      </Section>

      <Section index={3} reduceMotion={reduceMotion} className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Suspense fallback={<ChartFallback />}>
            <CategoryDistributionChart />
          </Suspense>
        </div>
        <div className="xl:col-span-3">
          <Suspense fallback={<ChartFallback />}>
            <CostVsPriceChart />
          </Suspense>
        </div>
      </Section>

      <Section index={4} reduceMotion={reduceMotion}>
        <FeaturedProducts />
      </Section>

      <Section index={5} reduceMotion={reduceMotion} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proximas entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <PageState
              isLoading={loadingStats}
              isEmpty={!salesStats?.upcomingDeliveries.length}
              empty={{
                icon: <CalendarClock className="size-6" />,
                title: 'Nada en los proximos 14 dias',
                description: 'Ningun pedido confirmado tiene fecha de entrega cercana.',
              }}
            >
              <ul className="flex flex-col gap-2">
                {salesStats?.upcomingDeliveries.map((order) => (
                  <li key={order.id}>
                    {/* <button>, no <li onClick>: antes no se podia alcanzar
                        ni activar con el teclado. */}
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-input bg-surface-sunken px-3.5 py-2.5 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                    >
                      <span className="flex flex-col">
                        <span className="text-body-sm font-semibold text-text">{order.customer?.fullName ?? order.folio}</span>
                        <span className="text-caption text-text-muted">{order.folio}</span>
                      </span>
                      <span className="text-caption font-medium text-text">{formatDate(order.dueDate)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PageState>
          </CardContent>
        </Card>
      </Section>

      <Section index={6} reduceMotion={reduceMotion} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Insumos bajos en stock</CardTitle>
          </CardHeader>
          <CardContent>
            <PageState
              isLoading={loadingLowStock}
              isEmpty={!lowStock?.length}
              empty={{
                icon: <Boxes className="size-6" />,
                title: 'Todo en orden',
                description: 'Ningun insumo esta en su minimo o por debajo.',
              }}
            >
              <ul className="flex flex-col gap-2">
                {lowStock?.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-input bg-danger-bg px-3.5 py-2.5">
                    <span className="text-body-sm font-semibold text-danger-fg">{s.name}</span>
                    <span className="text-caption tabular-nums text-danger-fg">
                      {formatNumber(s.stock_qty, 2)} / {formatNumber(s.min_stock_qty, 2)} {s.unit.abbr}
                    </span>
                  </li>
                ))}
              </ul>
            </PageState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costos que valdria la pena revisar</CardTitle>
          </CardHeader>
          <CardContent>
            <PageState
              isLoading={loadingDrift}
              isEmpty={!drift?.length}
              empty={{
                icon: <TrendingUp className="size-6" />,
                title: 'Sin desfases',
                description: 'El costo actual de los insumos coincide con lo que sugieren las compras recientes.',
              }}
            >
              <ul className="flex flex-col gap-2">
                {drift?.map((d) => (
                  <li key={d.supply.id} className="flex items-center justify-between gap-3 rounded-input bg-warning-bg px-3.5 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-body-sm font-semibold text-warning-fg">{d.supply.name}</span>
                      <span className="text-caption tabular-nums text-warning-fg">
                        {formatMoney(d.supply.currentUnitCost)} actual vs {formatMoney(d.supply.suggestedUnitCost)} sugerido
                      </span>
                    </div>
                    <Badge variant="warning" className="shrink-0">
                      <AlertTriangle className="size-3" /> {formatPercent(d.driftPct)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </PageState>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
