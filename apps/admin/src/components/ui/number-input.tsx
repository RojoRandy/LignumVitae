/*
 * Un <input type="number"> controlado es una trampa: `Number('')` es 0, asi
 * que en cuanto el usuario borra el campo el estado se vuelve 0, React
 * repinta "0", y ya no se puede escribir "10" sin que quede "010".
 *
 * Aqui el estado interno es un BORRADOR string -que SI puede estar vacio o
 * ser "1." a media captura- y hacia afuera solo salen `number | null`.
 * null = vacio, 0 = cero: son cosas distintas y antes eran indistinguibles.
 *
 * Se usa type="text" + inputMode="decimal" a proposito: con type="number"
 * el navegador sanea `.value` por su cuenta (devuelve '' mientras el
 * borrador es "1.") y el borrador se perderia sin darnos cuenta. De paso
 * se van las flechitas nativas y el scroll-cambia-el-valor.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { cn } from '@/lib/cn';
import { controlFocusWithinRing, controlInvalid, controlShell } from './input';

export interface NumberInputProps {
  /** Modo controlado. `null` = campo vacio (distinto de 0). */
  value?: number | null;
  /** Modo no controlado (FormData). */
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  /** Con `name` se emite ademas un input oculto con el valor canonico, para FormData. */
  name?: string;
  id?: string;
  step?: number;
  min?: number;
  max?: number;
  /** Decimales al normalizar. Por defecto se deduce de `step`. */
  precision?: number;
  /** Ajusta a [min, max] al salir del campo. Default true. */
  clamp?: boolean;
  /** Unidad visual: '$', 'g', 'cm', 'min', '%'. */
  unit?: string;
  unitPosition?: 'prefix' | 'suffix';
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  invalid?: boolean;
  /** Va a la ENVOLTURA (el chasis visual), no al <input>. */
  className?: string;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  'aria-describedby'?: string;
}

const isBlank = (draft: string): boolean => draft.trim() === '';

/** Acepta coma decimal: el teclado numerico latino manda ',' y nadie lo espera. */
const parseDraft = (draft: string): number | null => {
  const normalized = draft.replace(',', '.').trim();
  if (normalized === '' || normalized === '-' || normalized === '.' || normalized === '-.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const decimalsOf = (step: number): number => {
  const text = String(step);
  // step muy chico (1e-7) se serializa en notacion exponencial: 6 decimales
  // es la precision maxima que usa el backend (Supply.currentUnitCost).
  if (text.includes('e') || text.includes('E')) return 6;
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
};

/** Forma canonica: sin ceros a la izquierda, sin punto colgante, sin ceros de relleno. */
const toDraft = (input: number | null | undefined, precision: number): string =>
  input === null || input === undefined ? '' : String(Number(input.toFixed(precision)));

/** Solo lo que puede formar parte de un numero: asi no hay que limpiar nada despues. */
const DRAFT_PATTERN = /^-?\d*[.,]?\d*$/;

export const NumberInput = ({
  value,
  defaultValue,
  onChange,
  name,
  id,
  step = 1,
  min,
  max,
  precision,
  clamp = true,
  unit,
  unitPosition = 'suffix',
  required,
  disabled,
  readOnly,
  placeholder,
  invalid,
  className,
  onBlur,
  'aria-describedby': describedBy,
}: NumberInputProps) => {
  const decimals = precision ?? decimalsOf(step);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const isControlled = value !== undefined;
  const [draft, setDraft] = useState(() => toDraft(isControlled ? value : defaultValue, decimals));

  /*
   * Resincroniza cuando el valor cambia DESDE AFUERA (p.ej. el wizard carga
   * un producto existente). El guard del foco es imprescindible: sin el,
   * cada tecla del usuario dispararia onChange -> re-render -> este efecto
   * pisaria el borrador a media captura y volveriamos al bug original por
   * otra puerta.
   */
  useEffect(() => {
    if (!isControlled) return;
    if (document.activeElement === inputRef.current) return;
    setDraft(toDraft(value, decimals));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, value]);

  const validationMessage = (() => {
    if (isBlank(draft)) return required ? 'Captura un valor.' : '';
    const parsed = parseDraft(draft);
    if (parsed === null) return 'Escribe solo numeros.';
    if (min !== undefined && parsed < min) return `El minimo permitido es ${min}.`;
    if (max !== undefined && parsed > max) return `El maximo permitido es ${max}.`;
    return '';
  })();

  /*
   * El punto clave de "que no se registre ningun valor nulo": el mensaje
   * se cuelga del input VISIBLE, asi que el navegador bloquea el submit,
   * enfoca este campo y hace scroll hasta el -- igual que los <Input
   * required/> que conviven en el mismo dialogo. Sin mecanismo paralelo.
   */
  useEffect(() => {
    inputRef.current?.setCustomValidity(validationMessage);
  }, [validationMessage]);

  const commit = (raw: string) => {
    const parsed = parseDraft(raw);
    onChange?.(parsed);
  };

  const handleChange = (raw: string) => {
    if (raw !== '' && !DRAFT_PATTERN.test(raw)) return; // letras, espacios, etc: se ignoran
    setDraft(raw);
    if (!isControlled) return;
    commit(raw);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    let parsed = parseDraft(draft);
    if (parsed !== null) {
      if (clamp) {
        if (min !== undefined) parsed = Math.max(min, parsed);
        if (max !== undefined) parsed = Math.min(max, parsed);
      }
      parsed = Number(parsed.toFixed(decimals));
    }
    setDraft(toDraft(parsed, decimals));
    if (!isControlled) commit(draft);
    onBlur?.(event);
  };

  const canonical = (() => {
    const parsed = parseDraft(draft);
    return parsed === null ? '' : String(Number(parsed.toFixed(decimals)));
  })();

  return (
    <div
      className={cn(
        controlShell,
        controlFocusWithinRing,
        'gap-1.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
        invalid && controlInvalid,
        className,
      )}
    >
      {unit && unitPosition === 'prefix' && <span className="shrink-0 text-body-sm text-text-faint">{unit}</span>}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-describedby={describedBy}
        aria-invalid={invalid || Boolean(validationMessage) || undefined}
        className="w-full min-w-0 flex-1 bg-transparent text-right tabular-nums text-text outline-none placeholder:text-text-faint disabled:cursor-not-allowed"
      />
      {unit && unitPosition === 'suffix' && <span className="shrink-0 text-body-sm text-text-faint">{unit}</span>}
      {/* Input oculto con la forma canonica: FormData nunca recibe "0010"
          ni "1." a medio escribir, y Enter dentro del campo (que dispara
          el submit sin pasar por blur) tampoco manda el borrador crudo. */}
      {name && <input type="hidden" name={name} value={canonical} />}
    </div>
  );
};
