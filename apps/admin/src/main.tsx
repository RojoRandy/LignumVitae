import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { AuthProvider } from '@/hooks/use-auth';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Sin transiciones: con startTransition (default del router) una pagina que aun no
          carga deja la pantalla anterior con el URL ya cambiado, sin loader. */}
      <BrowserRouter useTransitions={false}>
        <AuthProvider>
          <TooltipProvider>
            <ConfirmProvider>
              <App />
              <Toaster position="top-right" richColors closeButton />
            </ConfirmProvider>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
