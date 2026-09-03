// Formateadores compartidos por toda la UI del admin. Los importes llegan
// de la API como string (Decimal serializado): SIEMPRE pasan por aqui antes
// de mostrarse, nunca se hace aritmetica con ellos en el cliente.
const moneyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const numberFormatter = new Intl.NumberFormat('es-MX');
// timeZone: 'UTC' es obligatorio aqui: los campos @db.Date de Prisma
// (fecha de compra, de adquisicion de un activo...) llegan como
// "2026-09-01T00:00:00.000Z" -- una fecha de calendario pura, sin hora real.
// Sin fijar UTC, un navegador al oeste de Greenwich la formatea como el
// dia anterior (31 ago en vez de 1 sep). formatDateTime, que si representa
// un instante real, se queda en la zona horaria local a proposito.
const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatMoney = (value: string | number | null | undefined): string =>
  moneyFormatter.format(Number(value ?? 0));

export const formatNumber = (value: string | number | null | undefined, decimals = 0): string =>
  numberFormatter.format(Number(Number(value ?? 0).toFixed(decimals)));

export const formatPercent = (value: string | number | null | undefined): string => `${formatNumber(value, 1)}%`;

export const formatDate = (value: string | null | undefined): string => (value ? dateFormatter.format(new Date(value)) : '—');

export const formatDateTime = (value: string | null | undefined): string =>
  value ? dateTimeFormatter.format(new Date(value)) : '—';

export const formatGrams = (value: string | number | null | undefined): string => `${formatNumber(value, 1)} g`;
