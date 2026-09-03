import { Link } from 'react-router';
import { CompassIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<CompassIcon className="size-10" />}
        title="Pagina no encontrada"
        description="Revisa la liga o vuelve al dashboard."
        action={
          <Button asChild>
            <Link to="/">Ir al dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
