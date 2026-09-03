// Input de color hex, para CandleCategory.colorHex. No esta en el repo de
// referencia (Agencia no tiene categorias con color); es propio de este
// proyecto.
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(({ value, onChange, className }, ref) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-input border border-border-strong transition-colors hover:border-text-faint">
      <input
        ref={ref}
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#7A5C3E'}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="absolute inset-0 size-full cursor-pointer border-0 p-0"
      />
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder="#7A5C3E"
      maxLength={7}
      className="h-11 w-32 rounded-input border border-border-strong bg-white px-3.5 text-body uppercase text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent"
    />
  </div>
));
ColorInput.displayName = 'ColorInput';
