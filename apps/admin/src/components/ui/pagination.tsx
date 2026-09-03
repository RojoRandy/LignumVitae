import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export const Pagination = ({
  page,
  pages,
  total,
  onPageChange,
}: {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3">
      <p className="text-body-sm text-text-muted">
        {total} registro{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Pagina anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 text-body-sm font-medium text-text">
          {page} / {pages}
        </span>
        <Button variant="secondary" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Pagina siguiente">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};
