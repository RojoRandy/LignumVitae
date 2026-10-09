// Barra fina fija arriba que indica que hay peticiones en curso (cualquier pantalla,
// incluidos los refrescos tras guardar). Completa a los skeletons de las tablas y al
// spinner de ruta: cubre lo que esos no ven, como una API lenta.
//
// Anti-parpadeo: aparece solo si la carga dura mas de SHOW_DELAY_MS y, una vez visible,
// se queda al menos MIN_VISIBLE_MS. Con prefers-reduced-motion queda estatica.
import { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

const SHOW_DELAY_MS = 200;
const MIN_VISIBLE_MS = 300;

export const TopProgressBar = () => {
  const fetching = useIsFetching() > 0;
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (fetching && !visible) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!fetching && visible) {
      const timer = setTimeout(() => setVisible(false), Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current)));
      return () => clearTimeout(timer);
    }
  }, [fetching, visible]);

  if (!visible) return null;
  return (
    <div
      role="progressbar"
      aria-label="Cargando datos"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-accent-soft"
    >
      <div className="h-full w-1/4 bg-accent animate-progress-slide motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
};
