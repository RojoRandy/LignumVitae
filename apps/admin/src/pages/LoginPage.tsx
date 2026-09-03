// Unica pagina fuera de features/, estatica a proposito: no depende de
// datos ni de la sesion, asi que no tiene sentido dividirla en lazy().
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/http';

export const LoginPage = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await signIn(String(form.get('username')), String(form.get('password')));
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      toast.error('No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-sunken px-4">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md rounded-card border border-border bg-surface-raised p-9 shadow-panel"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="font-accent text-5xl text-accent">Lignum Vitae</span>
          <p className="mt-1.5 text-body text-text-muted">Portal administrativo</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Usuario" htmlFor="username" required>
            <Input id="username" name="username" autoComplete="username" autoFocus required />
          </Field>
          <Field label="Contrasena" htmlFor="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error && <p className="text-body-sm text-danger-fg">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Entrar
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
