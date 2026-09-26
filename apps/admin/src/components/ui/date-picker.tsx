// Nav anclado al calendario para recibir clicks en toda el area visible;
// dropdowns nativos permiten saltar directamente de mes y de año.
// Selector de fecha con calendario visual, para reemplazar el <input
// type="date"> nativo (inconsistente entre navegadores, dificil de leer,
// sin la localizacion "1 sep 2026" que usa el resto del portal). Solo
// fecha, sin hora: ningun campo del negocio necesita hora exacta todavia
// (compras, activos y gastos son eventos de "que dia", no "que hora").
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const formatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

const currentYear = new Date().getFullYear();
const startMonth = new Date(currentYear - 10, 0);
const endMonth = new Date(currentYear + 5, 11);

export const DatePicker = ({ value, onChange, placeholder = 'Elegir fecha...', disabled, className }: DatePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 rounded-input border border-border-strong bg-white px-3.5 text-body text-text transition-colors',
            'hover:border-text-faint',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-text-faint',
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-text-faint" />
          <span className="truncate">{value ? formatter.format(value) : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-3" align="start">
        <DayPicker
          mode="single"
          locale={es}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          showOutsideDays
          weekStartsOn={1}
          components={{
            Chevron: ({ orientation }) =>
              orientation === 'left' ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
          }}
          classNames={{
            months: 'relative flex flex-col',
            month: 'flex flex-col gap-3',
            month_caption: 'flex items-center justify-center h-9 relative px-9',
            dropdowns: 'flex items-center gap-1',
            dropdown_root: 'relative inline-flex',
            dropdown:
              'h-9 rounded-input border border-border-strong bg-surface px-1 text-body-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
            months_dropdown: 'w-28 capitalize',
            years_dropdown: 'w-16',
            caption_label: 'hidden',
            nav: 'pointer-events-none flex items-center justify-between absolute inset-x-0 top-0 z-10 h-9 px-1',
            button_previous:
              'pointer-events-auto flex size-7 items-center justify-center rounded-[7px] text-text-muted hover:bg-surface-sunken hover:text-text disabled:opacity-30 transition-colors',
            button_next:
              'pointer-events-auto flex size-7 items-center justify-center rounded-[7px] text-text-muted hover:bg-surface-sunken hover:text-text disabled:opacity-30 transition-colors',
            month_grid: 'w-full border-collapse',
            weekdays: 'flex',
            weekday: 'w-9 text-center text-micro font-semibold uppercase text-text-faint pb-1',
            weeks: 'flex flex-col gap-0.5',
            week: 'flex',
            day: 'p-0 text-center',
            day_button:
              'size-9 rounded-[8px] text-body-sm text-text transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
            today: '[&>button]:font-bold [&>button]:text-accent-hover',
            selected: '[&>button]:bg-accent [&>button]:text-white [&>button]:hover:bg-accent-hover',
            outside: '[&>button]:text-text-faint/50',
            disabled: '[&>button]:opacity-30 [&>button]:pointer-events-none',
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
