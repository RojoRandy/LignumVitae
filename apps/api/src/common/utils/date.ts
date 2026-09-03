// Toda fecha de negocio se formatea en Settings.timezone, nunca con
// `new Date()` a secas. El Excel se corrompio solo con un `=TODAY()` dentro
// de un registro historico (Ventas Enero!B22); esa clase de bug es la que
// esto evita.
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const nowInTimezone = (tz: string) => dayjs().tz(tz);

export const startOfMonth = (year: number, month: number, tz: string) =>
  dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, tz).startOf('month').toDate();

export const endOfMonth = (year: number, month: number, tz: string) =>
  dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, tz).endOf('month').toDate();

export const daysBetween = (from: Date, to: Date): number => dayjs(to).diff(dayjs(from), 'day');
