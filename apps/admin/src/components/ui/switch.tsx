import { Switch as RadixSwitch } from 'radix-ui';
import { cn } from '@/lib/cn';

export const Switch = ({ className, ...props }: React.ComponentProps<typeof RadixSwitch.Root>) => (
  /*
   * Radix mete un <input> oculto (position:absolute, sin top/left) como
   * HERMANO del boton, no como hijo -- necesita un ancestro posicionado
   * pegado ahi mismo para no escaparse. Sin este wrapper, ese input caia
   * en el flujo sin recortar de toda la pagina (el contenedor de la fila,
   * un simple flex, no cuenta como posicionado) y su "posicion estatica"
   * terminaba a cientos de px de donde estaba el switch, inflando el
   * scroll del documento con una franja en blanco al final de la pagina.
   */
  <span className="relative inline-flex shrink-0">
    <RadixSwitch.Root
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full bg-border-strong transition-colors duration-200 ease-out data-[state=checked]:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-out data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  </span>
);
