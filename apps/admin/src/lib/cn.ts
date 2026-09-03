// twMerge simple no sabe que `text-body` es un tamano y no un color, ni que
// `shadow-card` es una sombra con nombre propio: los clasifica mal y se
// come clases legitimas. extendTailwindMerge les ensena los grupos nuevos.
// No lo reviertas a twMerge pelado sin volver a probar Button/Badge/Input.
import { extendTailwindMerge } from 'tailwind-merge';
import { type ClassValue, clsx } from 'clsx';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'micro',
            'caption',
            'body-sm',
            'body',
            'body-lg',
            'heading-sm',
            'heading',
            'heading-lg',
            'display-lg',
          ],
        },
      ],
      shadow: [{ shadow: ['card', 'lift', 'panel'] }],
      rounded: [{ rounded: ['card', 'input'] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
