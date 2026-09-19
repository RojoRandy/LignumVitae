// Carrusel scroll-snap compartido por el detalle de producto y el hero de la
// home: scroll nativo + snap, botones, puntos y flechas de teclado. Sin
// libreria (DESIGN.md prohibe agregar una de carrusel). `autoplay` (ms) lo
// usa solo el hero: se pausa con hover/foco/pestana oculta y no arranca con
// prefers-reduced-motion.
export function initCarousel(root: ParentNode & EventTarget, options: { autoplay?: number } = {}): void {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]'));
  if (!track || dots.length < 2) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentIndex = () => Math.round(track.scrollLeft / track.clientWidth);
  const show = (index: number) => {
    const next = (index + dots.length) % dots.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  root.querySelector('[data-carousel-prev]')?.addEventListener('click', () => show(currentIndex() - 1));
  root.querySelector('[data-carousel-next]')?.addEventListener('click', () => show(currentIndex() + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => show(index)));
  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(currentIndex() + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  track.addEventListener('scroll', () => {
    const index = currentIndex();
    dots.forEach((dot, position) => dot.setAttribute('aria-current', String(position === index)));
  }, { passive: true });

  if (!options.autoplay || reducedMotion) return;
  let hovered = false;
  let focused = false;
  root.addEventListener('mouseenter', () => { hovered = true; });
  root.addEventListener('mouseleave', () => { hovered = false; });
  root.addEventListener('focusin', () => { focused = true; });
  root.addEventListener('focusout', () => { focused = false; });
  setInterval(() => {
    if (!hovered && !focused && !document.hidden) show(currentIndex() + 1);
  }, options.autoplay);
}
