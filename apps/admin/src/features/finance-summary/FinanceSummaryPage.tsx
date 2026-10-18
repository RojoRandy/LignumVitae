import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Hammer, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import { httpGet } from '@/lib/http';
import type { FinancePartDto, MonthlyFinanceDto, OrderStatus } from '@/lib/types';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatTile } from '@/components/ui/stat-tile';
import { PageState } from '@/components/ui/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_DEPOSIT: 'Pendiente anticipo', CONFIRMED: 'Confirmado', IN_PRODUCTION: 'En produccion',
  READY: 'Listo', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

type PartKey = 'materials' | 'labor' | 'overhead' | 'shipping' | 'profit';

/** Las cinco rebanadas que suman el ingreso, en el orden en que se "pagan". */
const PARTS: { key: PartKey; label: string; hint: string; swatch: string }[] = [
  { key: 'materials', label: 'Materiales', hint: 'Cera, aroma, empaque, tarjeta e insumos', swatch: 'bg-accent' },
  { key: 'labor', label: 'Mano de obra', hint: 'Minutos de trabajo por pieza', swatch: 'bg-info-solid' },
  { key: 'overhead', label: 'Gastos indirectos', hint: 'Luz, gas, renta y depreciacion repartidos por pieza', swatch: 'bg-warning-solid' },
  { key: 'shipping', label: 'Envio', hint: 'Lo que se cobro de envio en los pedidos', swatch: 'bg-border-strong' },
  { key: 'profit', label: 'Ganancia', hint: 'Lo que queda despues de costos y gastos', swatch: 'bg-success-solid' },
];

const GROUPS: { title: string; total: 'productionCost' | 'expenses' | 'profit'; parts: PartKey[] }[] = [
  { title: 'Costos de produccion', total: 'productionCost', parts: ['materials', 'labor'] },
  { title: 'Gastos', total: 'expenses', parts: ['overhead', 'shipping'] },
  { title: 'Ganancia', total: 'profit', parts: [] },
];

const isNegative = (value: string) => value.startsWith('-');

const PartLine = ({ label, hint, swatch, part, strong }: { label: string; hint?: string; swatch?: string; part: FinancePartDto; strong?: boolean }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-2">
      {swatch && <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', swatch)} aria-hidden />}
      <div className="min-w-0">
        <p className={cn('text-body-sm text-text', strong && 'font-semibold')}>{label}</p>
        {hint && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    </div>
    <div className="shrink-0 text-right tabular-nums">
      <p className={cn('text-body-sm', strong ? 'font-semibold' : 'font-medium', isNegative(part.amount) ? 'text-danger-fg' : 'text-text')}>
        {formatMoney(part.amount)}
      </p>
      <p className="text-caption text-text-muted">{formatPercent(part.pct)}</p>
    </div>
  </div>
);

export default function FinanceSummaryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthly-finance', { year, month }],
    queryFn: () => httpGet<MonthlyFinanceDto>('/dashboard/monthly-finance', { year, month }),
  });

  const b = data?.breakdown;
  const profitNegative = b ? isNegative(b.profit.amount) : false;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Mes">
            <Select options={MONTH_OPTIONS} value={String(month)} onChange={(v) => setMonth(Number(v))} className="w-40" />
          </Field>
          <Field label="Ano">
            <Select options={yearOptions} value={String(year)} onChange={(v) => setYear(Number(v))} className="w-28" />
          </Field>
        </div>
        <p className="mt-3 text-caption text-text-muted">
          Suma los pedidos levantados en el mes (sin cancelados) con el costeo que cada uno guardo al crearse. Materiales,
          mano de obra, gastos indirectos, envio y ganancia suman exactamente el ingreso del mes.
        </p>
      </Card>

      {/* 2x2 y no 4 en fila: los importes en display-lg no caben en un cuarto del ancho. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Ingresos del mes"
          value={formatMoney(data?.income)}
          hint={data ? `${data.orderCount} ${data.orderCount === 1 ? 'pedido' : 'pedidos'}` : undefined}
          icon={<TrendingUp className="size-5" />}
          isLoading={isLoading}
        />
        <StatTile
          label="Costos de produccion"
          value={formatMoney(b?.productionCost.amount)}
          hint={b ? `${formatPercent(b.productionCost.pct)} del ingreso` : undefined}
          icon={<Hammer className="size-5" />}
          isLoading={isLoading}
        />
        <StatTile
          label="Gastos"
          value={formatMoney(b?.expenses.amount)}
          hint={b ? `${formatPercent(b.expenses.pct)} del ingreso` : undefined}
          icon={<Receipt className="size-5" />}
          tone="warning"
          isLoading={isLoading}
        />
        <StatTile
          label="Ganancia"
          value={formatMoney(b?.profit.amount)}
          hint={b ? `${formatPercent(b.profit.pct)} del ingreso` : undefined}
          icon={<PiggyBank className="size-5" />}
          tone={profitNegative ? 'danger' : 'success'}
          isLoading={isLoading}
        />
      </div>

      <PageState
        isLoading={isLoading}
        error={error}
        isEmpty={data?.orderCount === 0}
        empty={{
          icon: <Receipt className="size-8" />,
          title: `Sin pedidos en ${MONTHS[month - 1]} ${year}`,
          description: 'Cuando se levante un pedido en este mes, aqui aparece como se reparte su ingreso.',
        }}
      >
        {data && b && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>A donde se va cada peso</CardTitle>
                <CardDescription>
                  De {formatMoney(data.income)} vendidos: {formatMoney(data.collected)} cobrados y{' '}
                  {formatMoney(data.outstanding)} por cobrar. Pagos recibidos en el mes (de cualquier pedido):{' '}
                  {formatMoney(data.paymentsReceived)}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label="Reparto del ingreso del mes">
                  {PARTS.map((p) => (
                    <div
                      key={p.key}
                      className={p.swatch}
                      style={{ width: `${Math.max(0, Number(b[p.key].pct))}%` }}
                      title={`${p.label}: ${formatPercent(b[p.key].pct)}`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {GROUPS.map((g) => (
                    <div key={g.title} className="flex flex-col gap-3">
                      <PartLine
                        label={g.title}
                        part={b[g.total]}
                        strong
                        swatch={g.parts.length ? undefined : 'bg-success-solid'}
                        hint={g.parts.length ? undefined : PARTS.find((p) => p.key === 'profit')?.hint}
                      />
                      {g.parts.length > 0 && (
                        <div className="flex flex-col gap-3 border-l border-border pl-3">
                          {g.parts.map((key) => {
                            const p = PARTS.find((x) => x.key === key)!;
                            return <PartLine key={key} label={p.label} hint={p.hint} swatch={p.swatch} part={b[key]} />;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Produccion</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link to={`/pedidos/${o.id}`} className="font-medium text-accent-hover hover:underline">
                        {o.folio}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell>{formatDate(o.orderDate)}</TableCell>
                    <TableCell><Badge>{STATUS_LABEL[o.status]}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(o.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(o.productionCost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(o.expenses)}</TableCell>
                    <TableCell className={cn('text-right font-medium tabular-nums', isNegative(o.profit) ? 'text-danger-fg' : 'text-success-fg')}>
                      {formatMoney(o.profit)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-surface-sunken/60 font-semibold">
                  <TableCell colSpan={4}>Total del mes</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(data.income)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(b.productionCost.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(b.expenses.amount)}</TableCell>
                  <TableCell className={cn('text-right tabular-nums', profitNegative ? 'text-danger-fg' : 'text-success-fg')}>
                    {formatMoney(b.profit.amount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </PageState>
    </div>
  );
}
