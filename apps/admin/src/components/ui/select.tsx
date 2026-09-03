/*
 * UN SOLO control de "elegir de una lista" para todo el portal. Reemplaza
 * al <select> nativo del navegador, que convivia con este componente en
 * distintas vistas -- esa mezcla era la queja: unas pantallas usaban el
 * dropdown propio y otras el del sistema operativo, dos apariencias
 * distintas para la misma accion.
 *
 * El buscador aparece SOLO si la lista es larga (mas de `searchThreshold`
 * opciones), pero el disparador es identico siempre: misma caja, misma
 * altura, misma flecha. La diferencia queda dentro del popover, donde
 * ayuda, no en la pagina, donde chocaria.
 *
 * Funciona en los dos patrones de formulario del proyecto:
 *   - controlado:     value + onChange
 *   - no controlado:  defaultValue + name (entra a FormData por un input
 *                      oculto que siempre lleva la forma canonica)
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Check, ChevronDown, SearchX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { controlDisabled, controlFocusRing, controlInvalid, controlShell } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface SelectOption {
  value: string;
  label: string;
  /** Segunda linea de la opcion; tambien se busca por aqui. */
  hint?: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  /** Modo controlado. Si se omite, el componente lleva su propio estado. */
  value?: string;
  /** Modo no controlado (formularios con FormData). */
  defaultValue?: string;
  /** Al limpiar emite '' (nunca undefined): sigue sirviendo el patron
   *  `x ? Number(x) : undefined` que ya usan los submits existentes. */
  onChange?: (value: string) => void;
  /** Con `name` el valor entra a FormData via un input oculto. */
  name?: string;
  /** Va al boton disparador, para que <Label htmlFor> lo enfoque. */
  id?: string;
  /** Bloquea el submit nativo con mensaje propio si no hay seleccion. */
  required?: boolean;
  /** Muestra una "x" para deshacer la seleccion. */
  clearable?: boolean;
  /** Por defecto: se muestra si hay mas de `searchThreshold` opciones. */
  searchable?: boolean;
  searchThreshold?: number;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  /**
   * Va al CONTENEDOR, no al boton interno. El <select> nativo que
   * reemplaza este componente tenia el bug contrario: el className caia en
   * el <select> de adentro y clases del padre (col-span-2, w-40) no hacian
   * nada porque el hijo real del grid era el div envolvente.
   */
  className?: string;
}

const DEFAULT_SEARCH_THRESHOLD = 8;

/** "Celofán" debe encontrarse escribiendo "celofan". */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const Select = ({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  required,
  clearable,
  searchable,
  searchThreshold = DEFAULT_SEARCH_THRESHOLD,
  placeholder = 'Selecciona...',
  emptyText = 'Sin resultados',
  disabled,
  invalid,
  className,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const [highlight, setHighlight] = useState('');
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;
  const selected = options.find((option) => option.value === current);
  const showSearch = searchable ?? options.length > searchThreshold;
  const canClear = Boolean(clearable) && Boolean(selected) && !disabled;

  const commit = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  };

  /*
   * cmdk puntua contra el `value` del item. Si ese value fuera el id
   * ("17"), escribir "1" haria match contra ids en vez de nombres. Con un
   * filtro propio el value queda libre para ser el id (asi el highlight se
   * puede sincronizar con la seleccion actual) y la busqueda solo mira
   * label + hint, sin distinguir acentos.
   */
  const filter = useMemo(() => {
    const byValue = new Map(options.map((option) => [option.value, option]));
    return (itemValue: string, search: string): number => {
      const option = byValue.get(itemValue);
      if (!option) return 0;
      const haystack = fold(`${option.label} ${option.hint ?? ''}`);
      return haystack.includes(fold(search.trim())) ? 1 : 0;
    };
  }, [options]);

  return (
    <div className={cn('relative', className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setHighlight(current || (options[0]?.value ?? ''));
          else setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            id={triggerId}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              controlShell,
              controlFocusRing,
              controlDisabled,
              'justify-between gap-2 text-left hover:border-text-faint',
              !selected && 'text-text-faint',
              invalid && controlInvalid,
            )}
          >
            <span className="min-w-0 truncate">{selected ? selected.label : placeholder}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              {canClear && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    commit('');
                  }}
                  className="rounded-full p-0.5 text-text-faint hover:bg-surface-sunken hover:text-text"
                  aria-label="Quitar seleccion"
                >
                  <X className="size-3.5" />
                </span>
              )}
              <ChevronDown className="size-4 text-text-faint" />
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="flex flex-col" filter={filter} value={highlight} onValueChange={setHighlight} loop>
            {/*
              El input se monta SIEMPRE, aunque quede oculto: es lo que le
              da a cmdk el foco para que flechas/Enter/Escape funcionen. Con
              la lista corta queda sr-only, lo que ademas revive el
              type-ahead del <select> nativo (teclear "ce" salta a "Cera").
            */}
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar..."
              className={cn(
                'border-b border-border px-3.5 py-3 text-body outline-none placeholder:text-text-faint',
                !showSearch && 'sr-only',
              )}
            />
            <Command.List className="max-h-72 overflow-y-auto p-1.5">
              <Command.Empty className="flex flex-col items-center gap-2 px-3 py-8 text-center text-body-sm text-text-muted">
                <SearchX className="size-6 text-text-faint" />
                {emptyText}
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    commit(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-body-sm transition-colors',
                    'data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-hover',
                    'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
                  )}
                >
                  <span className="flex flex-col">
                    <span>{option.label}</span>
                    {option.hint && <span className="text-caption text-text-muted">{option.hint}</span>}
                  </span>
                  {option.value === current && <Check className="size-4 shrink-0 text-accent" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Puente hacia FormData / validacion nativa del <form>: los
          formularios no controlados (`new FormData(e.currentTarget)`)
          siguen funcionando exactamente igual que con un <select>. */}
      {(name || required) && (
        <SelectValidityMirror name={name} value={current} required={required} triggerId={triggerId} />
      )}
    </div>
  );
};

/**
 * Input de texto oculto (no type="hidden": esos no participan en la
 * validacion nativa del formulario) que carga el valor para FormData y el
 * mensaje de "campo requerido" en espanol. Aislado en su propio componente
 * para que el useEffect de validacion no se re-ejecute en cada tecla del
 * buscador del popover.
 */
const SelectValidityMirror = ({
  name,
  value,
  required,
  triggerId,
}: {
  name?: string;
  value: string;
  required?: boolean;
  triggerId: string;
}) => {
  useEffect(() => {
    const mirror = document.getElementById(`${triggerId}-mirror`) as HTMLInputElement | null;
    mirror?.setCustomValidity(required && !value ? 'Selecciona una opcion de la lista.' : '');
  }, [required, value, triggerId]);

  return (
    <input
      id={`${triggerId}-mirror`}
      name={name}
      value={value}
      required={required}
      readOnly
      // Fuera de la vista pero presente en el layout: un input realmente
      // display:none no dispara la burbuja de validacion nativa en algunos
      // navegadores. 1px es invisible y sigue siendo focuseable por el
      // navegador para mostrar el mensaje.
      className="absolute h-px w-px overflow-hidden opacity-0"
      tabIndex={-1}
      aria-hidden="true"
      onChange={() => {}}
    />
  );
};
