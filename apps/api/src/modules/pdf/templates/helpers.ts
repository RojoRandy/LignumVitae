// Helpers de Handlebars para las plantillas de PDF. Registrados una sola
// vez al arrancar PdfService, no por cada render.
import Handlebars from 'handlebars';
import { formatMoney } from '@lignumvitae/types';

export const registerHelpers = () => {
  Handlebars.registerHelper('money', (value: unknown) => formatMoney(Number(value)));

  Handlebars.registerHelper('date', (value: unknown) => {
    if (!value) return '';
    return new Date(String(value)).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  // Para columnas @db.Date (llegan a medianoche UTC): formatear en hora local las recorre un dia.
  Handlebars.registerHelper('day', (value: unknown) => {
    if (!value) return '';
    return new Date(String(value)).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  });

  Handlebars.registerHelper('grams', (value: unknown) => `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(Number(value))} g`);
  Handlebars.registerHelper('fixed2', (value: unknown) => Number(value).toFixed(2));

  Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('inc', (value: number) => value + 1);
};
