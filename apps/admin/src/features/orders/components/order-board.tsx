import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { httpGet, httpPatch, errorMessage } from '@/lib/http';
import type { OrderDto, OrderStatus, Paginated } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentProgress } from '@/components/domain/payment-progress';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { STATUS_LABEL, orderItemDetail } from './order-detail';

export const BOARD_STATUSES = ['PENDING_DEPOSIT', 'CONFIRMED', 'IN_PRODUCTION', 'READY'] as const satisfies readonly OrderStatus[];
type BoardStatus = (typeof BOARD_STATUSES)[number];

// Mismo tono que la tabla de pedidos (STATUS_TONE), salvo En produccion:
// ahi era info igual que Confirmado y las dos columnas se veian iguales.
const BOARD_TONE: Record<BoardStatus, { column: string; card: string }> = {
  PENDING_DEPOSIT: { column: 'bg-warning-bg border-warning-solid/20', card: 'border-l-warning-solid' },
  CONFIRMED: { column: 'bg-info-bg border-info-solid/20', card: 'border-l-info-solid' },
  IN_PRODUCTION: { column: 'bg-accent-soft border-accent/20', card: 'border-l-accent' },
  READY: { column: 'bg-success-bg border-success-solid/20', card: 'border-l-success-solid' },
};

function OrderCardBody({ order }: { order: OrderDto }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm font-semibold">{order.folio}</span>
        <span className="text-caption text-text-muted">{formatDate(order.dueDate)}</span>
      </div>
      <p className="text-caption text-text-muted">{order.customer?.fullName ?? '—'}</p>
      <ul className="flex flex-col gap-1">
        {(order.items ?? []).map((item) => {
          const detail = orderItemDetail(item);
          return (
            <li key={item.id}>
              <p className="text-body-sm">{`${item.quantity} × ${item.productName}`}</p>
              {detail && <p className="text-caption text-text-muted line-clamp-2">{detail}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-2">
        <span className="text-body-sm">Total {formatMoney(order.total)}</span>
        <div className="flex items-center gap-2">
          <PaymentProgress paid={order.paidAmount} total={order.total} size="sm" />
          <span className="text-caption text-text-muted">{formatMoney(order.paidAmount)}</span>
        </div>
      </div>
    </>
  );
}

function OrderCard({ order, tone, onOpen }: { order: OrderDto; tone: string; onOpen: (order: OrderDto) => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: order.id, data: { order } });

  return (
    // Card no reenvia ref (su tipo es HTMLAttributes): el nodo draggable es este wrapper.
    <div ref={setNodeRef} className={cn(isDragging && 'opacity-40')}>
      <Card
        className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-3', tone)}
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(order)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(order);
          }
        }}
      >
        <OrderCardBody order={order} />
      </Card>
    </div>
  );
}

// ponytail: 500 por columna (max de la API); paginar si una columna pasa de eso.
function BoardColumn({ status, onOpen }: { status: BoardStatus; onOpen: (order: OrderDto) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'board', status],
    queryFn: () => httpGet<Paginated<OrderDto>>('/orders', { status, limit: 500 }),
  });
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn('flex min-h-40 w-[85vw] sm:w-80 shrink-0 snap-start flex-col gap-2 rounded-card border p-2 lg:w-auto', BOARD_TONE[status].column, isOver && 'ring-2 ring-accent/40')}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-body-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="text-caption text-text-muted">{data?.total ?? 0}</span>
      </div>
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </>
        ) : data && data.items.length > 0 ? (
          data.items.map((order) => <OrderCard key={order.id} order={order} tone={BOARD_TONE[status].card} onOpen={onOpen} />)
        ) : (
          <p className="py-6 text-center text-caption text-text-muted">Sin pedidos</p>
        )}
      </div>
    </div>
  );
}

export function OrderBoard({ onOpen }: { onOpen: (order: OrderDto) => void }) {
  const queryClient = useQueryClient();
  const [activeOrder, setActiveOrder] = useState<OrderDto | null>(null);

  // Sin KeyboardSensor: Enter/Espacio abren el modal; con teclado el estado se cambia desde ahi.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const confirm = useConfirm();

  type Move = { order: OrderDto; status: BoardStatus };
  const statusMutation = useMutation({
    mutationFn: ({ order, status }: Move) => httpPatch<OrderDto>(`/orders/${order.id}/status`, { status }),
    // Optimista: la tarjeta queda en la columna destino mientras llega el PATCH,
    // en vez de regresar a la de origen hasta el refetch.
    onMutate: async ({ order, status }: Move) => {
      await queryClient.cancelQueries({ queryKey: ['orders', 'board'] });
      queryClient.setQueryData<Paginated<OrderDto>>(['orders', 'board', order.status], (d) =>
        d && { ...d, items: d.items.filter((o) => o.id !== order.id), total: d.total - 1 });
      queryClient.setQueryData<Paginated<OrderDto>>(['orders', 'board', status], (d) =>
        d && { ...d, items: [...d.items, { ...order, status }].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), total: d.total + 1 });
    },
    onSuccess: () => toast.success('Estado actualizado'),
    onError: (error) => toast.error(errorMessage(error)),
    // Tambien en error: el refetch deshace el movimiento optimista.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveOrder((event.active.data.current?.order as OrderDto | undefined) ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveOrder(null);
    const order = active.data.current?.order as OrderDto | undefined;
    if (!order || !over || over.id === order.status) return;
    const status = over.id as BoardStatus;
    // Regresar de etapa (p. ej. En produccion -> Pendiente anticipo) casi
    // siempre es un arrastre que se solto donde no era: se confirma.
    const backwards = BOARD_STATUSES.indexOf(status) < BOARD_STATUSES.indexOf(order.status as BoardStatus);
    if (backwards && !(await confirm({ title: `¿Regresar ${order.folio} a ${STATUS_LABEL[status]}?`, description: 'El pedido vuelve a una etapa anterior.' }))) return;
    statusMutation.mutate({ order, status });
  };

  return (
    <DndContext
      sensors={sensors}
      // Sin KeyboardSensor las instrucciones por defecto ("presiona espacio
      // para levantar") serian falsas: Enter/Espacio abren el pedido.
      accessibility={{ screenReaderInstructions: { draggable: 'Enter o Espacio abre el pedido. Para cambiar su estado, arrastralo con el mouse o mantenlo presionado en pantallas tactiles.' } }}
      onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveOrder(null)}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {BOARD_STATUSES.map((status) => (
          <BoardColumn key={status} status={status} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <Card
            className={cn(
              'flex cursor-grabbing flex-col gap-2 border-l-4 p-3 shadow-lift',
              BOARD_TONE[activeOrder.status as BoardStatus].card,
            )}
          >
            <OrderCardBody order={activeOrder} />
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
