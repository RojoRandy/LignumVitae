import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-card border border-border bg-surface-raised shadow-card">
    <table className={cn('w-full caption-bottom text-body-sm', className)} {...props} />
  </div>
);

export const TableHeader = (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="border-b border-border bg-surface-sunken/60" {...props} />
);

export const TableBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />;

// motion.tr en vez de <tr>: DataTable le pasa initial/animate con un delay
// escalonado por fila (stagger, 30-80ms entre filas per Emil Kowalski) al
// cargar datos. Sin esas props se comporta como un <tr> normal, asi que
// TableHeader y cualquier otro uso estatico no se ven afectados.
export const TableRow = ({ className, ...props }: React.ComponentProps<typeof motion.tr>) => (
  <motion.tr className={cn('border-b border-border transition-colors last:border-0 hover:bg-accent-soft/40', className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-12 px-4 text-left align-middle text-caption font-bold uppercase tracking-wide text-text-muted', className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3.5 align-middle text-body-sm text-text', className)} {...props} />
);
