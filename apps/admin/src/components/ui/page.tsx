/*
 * El esqueleto compartido de toda pagina del portal.
 *
 * Antes cada una de las 21 paginas armaba su encabezado, su toolbar y sus
 * estados a mano, y por eso se fueron separando en silencio: cuatro
 * variantes de <h1>, un buscador con lupa y otro sin ella, el mismo spinner
 * copiado cinco veces. Mismo razonamiento que controlShell en input.tsx --
 * un solo origen de verdad es la unica forma de que la consistencia se
 * sostenga sin que alguien tenga que acordarse de copiar bien.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowLeft, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/http';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Switch } from './switch';
import { EmptyState } from './empty-state';
import { Spinner } from './spinner';

export interface PageHeaderProps {
  title: string;
  /** ReactNode y no string: algunos detalles llevan un enlace dentro. */
  description?: ReactNode;
  /** Ruta del boton de volver. Genera un <Link> real (no navigate()) para
   *  que abrir en pestana nueva y el teclado funcionen como se espera. */
  backTo?: string;
  badge?: ReactNode;
  /** Accion primaria de la pagina. Vive AQUI, nunca en PageToolbar. */
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, backTo, badge, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      {backTo && (
        <Button variant="ghost" size="icon" asChild>
          <Link to={backTo} aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-heading-lg font-semibold text-text">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-body-sm text-text-muted">{description}</p>}
      </div>
    </div>
    {/* En movil las acciones ocupan el ancho completo y se envuelven; en
        escritorio se alinean a la derecha sin encogerse. */}
    {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
  </div>
);

export interface PageToolbarProps {
  /** Buscador de texto. El debounce de 300ms vive en SearchInput. */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  /** Selects de filtro. Se apilan en movil. */
  filters?: ReactNode;
  showInactive?: { value: boolean; onChange: (v: boolean) => void };
  /** Acciones SECUNDARIAS (exportar, importar...). La primaria va en PageHeader. */
  actions?: ReactNode;
  className?: string;
}

const SearchInput = ({ value, onChange, placeholder }: NonNullable<PageToolbarProps['search']>) => {
  const [localValue, setLocalValue] = useState(value);
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    // La confirmacion de nuestro propio cambio no debe pisar texto nuevo.
    if (value === lastEmittedValue.current) return;
    lastEmittedValue.current = value;
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === lastEmittedValue.current) return;
    const timeout = setTimeout(() => {
      lastEmittedValue.current = localValue;
      onChange(localValue);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localValue, onChange, value]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
      <Input
        type="search"
        className="pl-9"
        placeholder={placeholder ?? 'Buscar...'}
        aria-label={placeholder ?? 'Buscar'}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
    </div>
  );
};

export const PageToolbar = ({ search, filters, showInactive, actions, className }: PageToolbarProps) => {
  const showInactiveId = useId();
  if (!search && !filters && !showInactive && !actions) return null;
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {search && <SearchInput {...search} />}
      {(filters || showInactive) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {filters}
          {showInactive && (
            <div className="flex items-center gap-2">
              <Switch id={showInactiveId} checked={showInactive.value} onCheckedChange={showInactive.onChange} />
              <Label htmlFor={showInactiveId}>Mostrar dados de baja</Label>
            </div>
          )}
        </div>
      )}
      {actions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>}
    </div>
  );
};

export interface PageStateProps {
  isLoading?: boolean;
  /** Error de la query. Hoy ninguna pagina lo muestra: fallan en silencio. */
  error?: unknown;
  isEmpty?: boolean;
  empty?: { title: string; description?: string; icon?: ReactNode; action?: ReactNode };
  /** Opcional: PageState tambien se usa como puro indicador de carga. */
  children?: ReactNode;
}

/**
 * Para paginas de detalle, formularios y el dashboard. Las LISTAS no lo
 * usan: DataTable ya trae su propio loading y su propio vacio dentro de la
 * tabla, que es donde deben verse.
 */
export const PageState = ({ isLoading, error, isEmpty, empty, children }: PageStateProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Cargando">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-6 text-danger-fg" />}
        title="No se pudo cargar"
        description={errorMessage(error)}
      />
    );
  }
  if (isEmpty && empty) {
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />;
  }
  return <>{children}</>;
};

/**
 * El error de formulario existe como componente por el role="alert" (un <p>
 * suelto no se anuncia al enviar), no por ahorrar la repeticion.
 */
export const FormError = ({ children }: { children?: ReactNode }) => {
  if (!children) return null;
  return (
    <p role="alert" className="text-body-sm text-danger-fg">
      {children}
    </p>
  );
};

/**
 * Importe calculado que se muestra en linea con campos editables. h-11 para
 * coincidir con controlShell: los cinco usos hechos a mano usaban h-9 y
 * quedaban 8px arriba del NumberInput de al lado.
 */
export const ReadonlyAmount = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex h-11 items-center px-1 text-body-sm font-medium text-text', className)}>{children}</div>
);
