import { flexRender, getCoreRowModel, useReactTable, type Cell, type ColumnDef, type Row, type RowData } from '@tanstack/react-table';
import { useReducedMotion } from 'motion/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { EmptyState } from './empty-state';
import { Pagination } from './pagination';
import { Skeleton } from './skeleton';
import { Card } from './card';
import { Inbox } from 'lucide-react';

/*
 * Debajo de md la tabla se convierte en tarjetas. Es UNA decision para las
 * 14 listas del portal en vez de una por pagina: con siete columnas,
 * overflow-x-auto dejaba fuera de pantalla el costo, los precios y las
 * acciones, y nadie va a descubrir que hay que arrastrar la tabla de lado.
 *
 * Cada columna dice donde cae en la tarjeta con `meta.mobile`. El default
 * (primera columna = titulo, 'actions' = derecha, el resto = pares
 * etiqueta/valor) no esconde NADA: una lista sin declarar nada se lee
 * completa, solo mas alta. 'hidden' es para recortar el ruido a proposito.
 */
declare module '@tanstack/react-table' {
  // Los nombres de los parametros deben coincidir con los de la libreria o
  // TypeScript no fusiona la declaracion; aqui no se usan.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    mobile?: 'title' | 'subtitle' | 'trailing' | 'meta' | 'hidden';
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  pages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
}

const slotOf = <T,>(cell: Cell<T, unknown>, index: number) =>
  cell.column.columnDef.meta?.mobile ?? (index === 0 ? 'title' : cell.column.id === 'actions' ? 'trailing' : 'meta');

/** La etiqueta del par solo se muestra si el header es texto plano. */
const labelOf = <T,>(cell: Cell<T, unknown>) => {
  const header = cell.column.columnDef.header;
  return typeof header === 'string' && header.length > 0 ? header : undefined;
};

function MobileCard<T>({ row, onRowClick }: { row: Row<T>; onRowClick?: (data: T) => void }) {
  const cells = row.getVisibleCells();
  const pick = (slot: string) => cells.filter((cell, i) => slotOf(cell, i) === slot);

  const [title] = pick('title');
  const trailing = pick('trailing');
  const subtitle = pick('subtitle');
  const meta = pick('meta');

  const clickable = Boolean(onRowClick);

  return (
    <Card
      className="flex flex-col gap-2 p-3.5"
      // Fila clicable: tambien por teclado, no solo por mouse.
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onRowClick?.(row.original) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick?.(row.original);
              }
            }
          : undefined
      }
    >
      <div className="min-w-0">
        {title && (
          <div className="text-body-sm font-semibold text-text">
            {flexRender(title.column.columnDef.cell, title.getContext())}
          </div>
        )}
        {subtitle.map((cell) => (
          <div key={cell.id} className="text-caption text-text-muted">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      </div>

      {meta.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {meta.map((cell) => {
            const label = labelOf(cell);
            return (
              <div key={cell.id} className="flex min-w-0 flex-col">
                {label && <dt className="text-micro uppercase tracking-wide text-text-faint">{label}</dt>}
                <dd className="text-body-sm text-text">{flexRender(cell.column.columnDef.cell, cell.getContext())}</dd>
              </div>
            );
          })}
        </dl>
      )}

      {/* Las acciones van al pie, no junto al titulo: con botones de texto
          ("Editar", "Dar de baja") competian por el ancho y partian el
          nombre del producto en tres renglones. 44px de alto solo aqui, que
          es la mano en el celular: no se toca la densidad de escritorio. */}
      {trailing.length > 0 && (
        <div className="-mb-1 flex flex-wrap items-center justify-end gap-1 border-t border-border pt-1 [&_button]:min-h-11">
          {trailing.map((cell) => (
            <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyTitle = 'Sin registros',
  emptyDescription,
  page,
  pages,
  total,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const reduceMotion = useReducedMotion();
  const rows = table.getRowModel().rows;

  const empty = <EmptyState icon={<Inbox className="size-8" />} title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="flex flex-col">
      {/* Tarjetas: movil */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-card" />)
        ) : rows.length === 0 ? (
          <Card>{empty}</Card>
        ) : (
          rows.map((row) => <MobileCard key={row.id} row={row} onRowClick={onRowClick} />)
        )}
      </div>

      {/* Tabla: md en adelante */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>{empty}</TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(index, 12) * 0.025, ease: [0.23, 1, 0.32, 1] }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {page !== undefined && pages !== undefined && total !== undefined && onPageChange && (
        <Pagination page={page} pages={pages} total={total} onPageChange={onPageChange} />
      )}
    </div>
  );
}
