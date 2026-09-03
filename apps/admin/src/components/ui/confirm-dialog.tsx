// useConfirm(): reemplaza window.confirm con un dialogo consistente con el
// resto de la UI. Ninguna baja del admin se ejecuta sin pasar por aqui.
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/cn';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handle = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={open} onOpenChange={(v) => !v && handle(false)}>
        <DialogContent size="sm">
          <DialogHeader className="pr-0">
            <div
              className={cn(
                'mb-2 flex size-12 items-center justify-center rounded-full',
                options?.variant === 'primary' ? 'bg-accent-soft' : 'bg-danger-bg',
              )}
            >
              <AlertTriangle className={cn('size-6', options?.variant === 'primary' ? 'text-accent-hover' : 'text-danger-fg')} />
            </div>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => handle(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button variant={options?.variant === 'primary' ? 'primary' : 'danger'} onClick={() => handle(true)}>
              {options?.confirmLabel ?? 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
