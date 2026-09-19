// Calendario propio para la fecha del evento: imita el DatePicker del admin
// (apps/admin/src/components/ui/date-picker.tsx) sin React ni librerias
// (DESIGN.md prohibe agregar librerias de UI). Guarda YYYY-MM-DD en un
// <input type="hidden"> para que FormData lo mande igual que el campo nativo.
// Todo se calcula en UTC: son fechas puras, no instantes.
const labelFormat = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const fromIso = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function initDatePicker(root: HTMLElement, { min }: { min: string }): void {
  const input = root.querySelector<HTMLInputElement>('input[type=hidden]')!;
  const trigger = root.querySelector<HTMLButtonElement>('[data-date-trigger]')!;
  const label = root.querySelector<HTMLElement>('[data-date-label]')!;
  const popover = root.querySelector<HTMLElement>('[data-date-popover]')!;
  const placeholder = label.textContent ?? '';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  let view = fromIso(input.value || min);
  view.setUTCDate(1);

  const render = () => {
    const first = new Date(view);
    const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
    const cursor = new Date(first);
    cursor.setUTCDate(1 - offset);
    const prevDisabled = toIso(new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), 0))) < min;

    const days: string[] = [];
    for (let i = 0; i < 42; i += 1) {
      const iso = toIso(cursor);
      const outside = cursor.getUTCMonth() !== view.getUTCMonth();
      const disabled = iso < min;
      const selected = iso === input.value;
      days.push(`<button type="button" data-day="${iso}" aria-label="${dayFormat.format(cursor)}"${selected ? ' aria-pressed="true"' : ''}${disabled ? ' disabled' : ''} class="dp-day${outside ? ' dp-outside' : ''}${iso === today ? ' dp-today' : ''}">${cursor.getUTCDate()}</button>`);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const month = monthFormat.format(view);
    const caption = month.charAt(0).toUpperCase() + month.slice(1);
    popover.innerHTML = `
      <div class="flex h-9 items-center justify-between">
        <button type="button" data-nav="-1" aria-label="Mes anterior" class="dp-nav"${prevDisabled ? ' disabled' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
        <p class="text-body-sm font-semibold text-text" aria-live="polite">${caption}</p>
        <button type="button" data-nav="1" aria-label="Mes siguiente" class="dp-nav"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
      </div>
      <div class="mt-2 grid grid-cols-7 gap-0.5" aria-hidden="true">${WEEKDAYS.map((day) => `<span class="dp-weekday">${day}</span>`).join('')}</div>
      <div class="grid grid-cols-7 gap-0.5">${days.join('')}</div>`;
  };

  const sync = () => {
    label.textContent = input.value ? labelFormat.format(fromIso(input.value)) : placeholder;
    label.classList.toggle('text-text-muted', !input.value);
  };

  const open = (isOpen: boolean) => {
    popover.hidden = !isOpen;
    trigger.setAttribute('aria-expanded', String(isOpen));
    if (!isOpen) return;
    view = fromIso(input.value || min);
    view.setUTCDate(1);
    render();
    popover.querySelector<HTMLButtonElement>('[aria-pressed="true"], .dp-day:not([disabled]):not(.dp-outside)')?.focus();
  };

  trigger.addEventListener('click', () => open(popover.hidden));
  popover.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!target || target.disabled) return;
    if (target.dataset.nav) {
      view.setUTCMonth(view.getUTCMonth() + Number(target.dataset.nav));
      render();
      popover.querySelector<HTMLButtonElement>(`[data-nav="${target.dataset.nav}"]`)?.focus();
      return;
    }
    input.value = target.dataset.day!;
    trigger.removeAttribute('aria-invalid');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    sync();
    open(false);
    trigger.focus();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || popover.hidden) return;
    event.preventDefault();
    open(false);
    trigger.focus();
  });
  document.addEventListener('click', (event) => {
    // composedPath y no contains(): el clic en ‹ › re-renderiza y saca el boton del DOM.
    if (!popover.hidden && !event.composedPath().includes(root)) open(false);
  });
  // En un hidden, .value ES el atributo: form.reset() no lo limpia solo.
  input.form?.addEventListener('reset', () => {
    input.value = '';
    sync();
  });
  sync();
}
