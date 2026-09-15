import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Undo2 } from 'lucide-react';
import { httpGet, httpPost } from '@/lib/http';
import type { OverheadPeriodDto } from '@/lib/types';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useState } from 'react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

const SOURCE_LABEL: Record<string, string> = { DERIVED: 'Derivada', FALLBACK: 'Respaldo', CLAMPED: 'Acotada' };
const SOURCE_TONE: Record<string, 'success' | 'warning' | 'info'> = { DERIVED: 'success', FALLBACK: 'info', CLAMPED: 'warning' };

export default function OverheadPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  const { data: periods, isLoading } = useQuery({
    queryKey: ['overhead-periods'],
    queryFn: () => httpGet<OverheadPeriodDto[]>('/overhead-periods'),
  });

  const closeMutation = useMutation({
    mutationFn: () => httpPost('/overhead-periods/close', { year, month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overhead-periods'] });
      toast.success(`${MONTHS[month - 1]} ${year} cerrado`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const reopenMutation = useMutation({
    mutationFn: (period: OverheadPeriodDto) => httpPost('/overhead-periods/reopen', { year: period.year, month: period.month }),
    onSuccess: (_data, period) => {
      queryClient.invalidateQueries({ queryKey: ['overhead-periods'] });
      toast.success(`${MONTHS[period.month - 1]} ${period.year} reabierto`);
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const handleReopen = async (period: OverheadPeriodDto) => {
    const ok = await confirm({
      title: `¿Reabrir ${MONTHS[period.month - 1]} ${period.year}?`,
      description:
        'La tasa de gastos indirectos de todo el catalogo vuelve de inmediato al respaldo de Configuracion (o al ultimo mes cerrado anterior a este), y se desactiva la depreciacion de activos que genero este cierre. Puedes volver a cerrarlo despues sin problema.',
      confirmLabel: 'Reabrir',
      variant: 'primary',
    });
    if (ok) reopenMutation.mutate(period);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-col items-end gap-3 sm:flex-row">
          <Field label="Mes">
            <Select
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              className="w-40"
            />
          </Field>
          <Field label="Ano">
            <Select
              options={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              className="w-28"
            />
          </Field>
          <Button onClick={() => closeMutation.mutate()} loading={closeMutation.isPending}>
            <CalendarClock className="size-4" /> Cerrar mes
          </Button>
        </div>
        <p className="mt-3 text-caption text-text-muted">
          Al cerrar: suma los gastos indirectos del mes (incluida la depreciacion de moldes y equipo vigentes) y los
          divide entre los minutos de mano de obra de los pedidos entregados en ese mes, para fijar la tasa por minuto
          que usa el costeo de todo el catalogo hasta el proximo cierre. Como los pedidos todavia no se registran en el
          sistema (llega en una fase posterior), los minutos productivos siempre dan 0 y por eso cada mes cerrado
          aparece con la tasa de <span className="font-medium text-text">Respaldo</span> (el valor fijo de
          Configuracion), no una tasa <span className="font-medium text-text">Derivada</span> real.
        </p>
      </Card>

      <div className="flex flex-col gap-3">
        {isLoading ? null : !periods?.length ? (
          <EmptyState
            icon={<CalendarClock className="size-8" />}
            title="Sin meses cerrados"
            description="Al cerrar el primer mes, la tasa de gastos indirectos deja de ser el respaldo fijo de Configuracion."
          />
        ) : (
          periods.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{MONTHS[p.month - 1]} {p.year}</CardTitle>
                  <CardDescription>{p.closedAt ? `Cerrado ${formatDateTime(p.closedAt)}` : 'Sin cerrar'}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SOURCE_TONE[p.rateSource]}>{SOURCE_LABEL[p.rateSource]}</Badge>
                  {p.closedAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReopen(p)}
                      loading={reopenMutation.isPending && reopenMutation.variables?.id === p.id}
                    >
                      <Undo2 className="size-4" /> Reabrir
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-caption text-text-muted">Gastos indirectos</p>
                  <p className="text-body font-medium text-text">{formatMoney(p.expenseTotal)}</p>
                </div>
                <div>
                  <p className="text-caption text-text-muted">Minutos productivos</p>
                  <p className="text-body font-medium text-text">{formatNumber(p.producedMinutes, 0)}</p>
                </div>
                <div>
                  <p className="text-caption text-text-muted">Piezas producidas</p>
                  <p className="text-body font-medium text-text">{formatNumber(p.producedUnits, 0)}</p>
                </div>
                <div>
                  <p className="text-caption text-text-muted">Tasa por minuto</p>
                  <p className="text-body font-medium text-text">{formatMoney(p.ratePerMinute)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
