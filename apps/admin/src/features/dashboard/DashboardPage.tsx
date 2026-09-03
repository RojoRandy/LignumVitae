import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Boxes, CalendarClock, ClipboardList, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { httpGet } from '@/lib/http';
import type { LowStockSupplyRow, SalesStatsDto, SupplyCostDriftEntry } from '@/lib/types';
import { formatDate, formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { StatTile } from '@/components/ui/stat-tile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { CategoryDistributionChart } from './components/category-distribution-chart';
import { CostVsPriceChart } from './components/cost-vs-price-chart';
import { FeaturedProducts } from './components/featured-products';

// Stagger de entrada: cada seccion aparece 60ms despues de la anterior
// (Emil Kowalski: 30-80ms entre elementos). Se ve una vez, al cargar la
// pagina -- no en cada interaccion -- asi que el costo de animarlo es cero.
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const { data: salesStats } = useQuery({
    queryKey: ['dashboard', 'sales-stats'],
    queryFn: () => httpGet<SalesStatsDto>('/dashboard/sales-stats'),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['supplies', 'low-stock'],
    queryFn: () => httpGet<LowStockSupplyRow[]>('/supplies/low-stock'),
  });

  const { data: drift } = useQuery({
    queryKey: ['supplies', 'cost-drift'],
    queryFn: () => httpGet<SupplyCostDriftEntry[]>('/supplies/cost-drift'),
  });

  const Section = ({ index, className, children }: { index: number; className?: string; children: React.ReactNode }) => (
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

  return (
    <div className="flex flex-col gap-6">
      <Section index={0}>
        <h1 className="text-display-lg font-extrabold tracking-tight text-text">Dashboard</h1>
        <p className="mt-1 text-body text-text-muted">Cotizaciones, pedidos e insumos, todo lo que importa hoy.</p>
      </Section>

      <Section index={1} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Cotizaciones activas"
          value={String(salesStats?.activeQuotations ?? 0)}
          icon={<FileText className="size-5" />}
          tone="neutral"
          onClick={() => navigate('/cotizaciones')}
        />
        <StatTile
          label="Pedidos en curso"
          value={String(salesStats?.pendingOrders ?? 0)}
          icon={<ClipboardList className="size-5" />}
          tone="neutral"
          onClick={() => navigate('/pedidos')}
        />
        <StatTile
          label="Listos para entregar"
          value={String(salesStats?.readyOrders ?? 0)}
          icon={<CalendarClock className="size-5" />}
          tone={salesStats?.readyOrders ? 'success' : 'neutral'}
          onClick={() => navigate('/pedidos')}
        />
        <StatTile
          label="Ingresos del mes"
          value={formatMoney(salesStats?.revenueThisMonth ?? 0)}
          icon={<DollarSign className="size-5" />}
          tone="neutral"
        />
      </Section>

      <Section index={2} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Insumos bajos en stock"
          value={String(lowStock?.length ?? 0)}
          icon={<Boxes className="size-5" />}
          tone={lowStock?.length ? 'danger' : 'neutral'}
        />
        <StatTile
          label="Costos desfasados"
          value={String(drift?.length ?? 0)}
          hint="Insumos con costo sugerido distinto al actual"
          icon={<TrendingUp className="size-5" />}
          tone={drift?.length ? 'warning' : 'neutral'}
        />
      </Section>

      <Section index={3} className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <CategoryDistributionChart />
        </div>
        <div className="xl:col-span-3">
          <CostVsPriceChart />
        </div>
      </Section>

      <Section index={4}>
        <FeaturedProducts />
      </Section>

      <Section index={5} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Proximas entregas</CardTitle>
          </CardHeader>
          <CardContent>
            {!salesStats?.upcomingDeliveries.length ? (
              <EmptyState icon={<CalendarClock className="size-6" />} title="Nada en los proximos 14 dias" description="Ningun pedido confirmado tiene fecha de entrega cercana." />
            ) : (
              <ul className="flex flex-col gap-2">
                {salesStats.upcomingDeliveries.map((order) => (
                  <li key={order.id} className="flex cursor-pointer items-center justify-between rounded-input bg-surface-sunken px-3.5 py-2.5 hover:bg-surface-raised" onClick={() => navigate(`/pedidos/${order.id}`)}>
                    <div className="flex flex-col">
                      <span className="text-body-sm font-semibold text-text">{order.customer?.fullName ?? order.folio}</span>
                      <span className="text-caption text-text-muted">{order.folio}</span>
                    </div>
                    <span className="text-caption font-medium text-text">{formatDate(order.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section index={6} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Insumos bajos en stock</CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStock?.length ? (
              <EmptyState icon={<Boxes className="size-6" />} title="Todo en orden" description="Ningun insumo esta en su minimo o por debajo." />
            ) : (
              <ul className="flex flex-col gap-2">
                {lowStock.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-input bg-danger-bg px-3.5 py-2.5">
                    <span className="text-body-sm font-semibold text-danger-fg">{s.name}</span>
                    <span className="text-caption text-danger-fg">
                      {formatNumber(s.stock_qty, 2)} / {formatNumber(s.min_stock_qty, 2)} {s.unit.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Costos que valdria la pena revisar</CardTitle>
          </CardHeader>
          <CardContent>
            {!drift?.length ? (
              <EmptyState
                icon={<TrendingUp className="size-6" />}
                title="Sin desfases"
                description="El costo actual de los insumos coincide con lo que sugieren las compras recientes."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {drift.map((d) => (
                  <li key={d.supply.id} className="flex items-center justify-between rounded-input bg-warning-bg px-3.5 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-body-sm font-semibold text-warning-fg">{d.supply.name}</span>
                      <span className="text-caption text-warning-fg">
                        {formatMoney(d.supply.currentUnitCost)} actual vs {formatMoney(d.supply.suggestedUnitCost)} sugerido
                      </span>
                    </div>
                    <Badge variant="warning">
                      <AlertTriangle className="size-3" /> {formatPercent(d.driftPct)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
