import { useState } from 'react';
import { useMutation, useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadFile, httpGet, errorMessage } from '@/lib/http';
import type { OrderDto, Paginated } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { BOARD_STATUSES } from './order-board';
import { STATUS_LABEL } from './order-detail';

// El estado vive aqui: DialogContent desmonta a sus hijos al cerrar y la seleccion se reinicia.
function PrintOrdersContent({ onClose }: { onClose: () => void }) {
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  // Mismo queryKey y queryFn que BoardColumn: comparten cache con el tablero.
  const results = useQueries({
    queries: BOARD_STATUSES.map((status) => ({
      queryKey: ['orders', 'board', status],
      queryFn: () => httpGet<Paginated<OrderDto>>('/orders', { status, limit: 500 }),
    })),
  });
  const isLoading = results.some((result) => result.isPending);
  const isError = results.some((result) => result.isError);
  const orders = results
    .flatMap((result) => result.data?.items ?? [])
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id);
  const ids = orders.filter((order) => !excluded.has(order.id)).map((order) => order.id);
  const allSelected = ids.length === orders.length;

  const printMutation = useMutation({
    mutationFn: () => downloadFile(`/orders/pdf?ids=${ids.join(',')}`, 'pedidos-seleccionados.pdf'),
    onSuccess: onClose,
    onError: (error) => toast.error(errorMessage(error)),
  });

  const toggle = (id: number, checked: boolean) =>
    setExcluded((previous) => {
      const next = new Set(previous);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Imprimir pedidos</DialogTitle>
        <DialogDescription>Elige los pedidos activos que quieres en el PDF.</DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <p className="text-body-sm text-text-muted">No se pudieron cargar los pedidos</p>
      ) : orders.length === 0 ? (
        <p className="text-body-sm text-text-muted">No hay pedidos activos</p>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 border-b border-border pb-2.5 text-body-sm font-medium text-text">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => setExcluded(allSelected ? new Set(orders.map((order) => order.id)) : new Set())}
            />
            Seleccionar todos
          </label>
          <div className="flex flex-col divide-y divide-border">
            {orders.map((order) => (
              <label key={order.id} className="flex items-center gap-3 py-2.5">
                <Checkbox checked={!excluded.has(order.id)} onCheckedChange={(checked) => toggle(order.id, checked === true)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-text">{order.folio}</span>
                  <span className="block text-caption text-text-muted">{order.customer?.fullName ?? '—'}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-caption text-text-muted">Entrega {formatDate(order.dueDate)}</span>
                  <span className="block text-caption text-text-muted">{STATUS_LABEL[order.status]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => printMutation.mutate()}
          loading={printMutation.isPending}
          disabled={isLoading || isError || ids.length === 0}
        >
          Imprimir ({ids.length})
        </Button>
      </DialogFooter>
    </>
  );
}

export function PrintOrdersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <PrintOrdersContent onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
