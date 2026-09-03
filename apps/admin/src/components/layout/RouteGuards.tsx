// Ocultar una ruta aqui no es seguridad — la validacion real es @Auth(...)
// en la API. Esto solo evita que la UI muestre pantallas que de todos
// modos la API va a rechazar.
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { Spinner } from '@/components/ui/spinner';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
