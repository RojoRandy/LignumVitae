// Cuanto se ha cobrado de un pedido. Vivia en dos versiones distintas:
// OrdersPage la tenia h-1.5 sin transicion y OrderDetailPage h-2 con ella.
import { cn } from '@/lib/cn';

export const PaymentProgress = ({
  paid,
  total,
  /** 'sm' para la celda de una tabla, 'md' para el panel de detalle. */
  size = 'md',
  className,
}: {
  paid: number | string;
  total: number | string;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  const paidNum = Number(paid);
  const totalNum = Number(total);
  const pct = totalNum > 0 ? Math.min(100, Math.max(0, (paidNum / totalNum) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Cobrado del pedido"
      className={cn('overflow-hidden rounded-full bg-surface-sunken', size === 'sm' ? 'h-1.5 w-16' : 'h-2 w-full', className)}
    >
      {/* Se anima solo width (no transition-all): el ancho es lo unico que
          cambia y animar el resto provoca repintados que no aportan nada. */}
      <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
};
