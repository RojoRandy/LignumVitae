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

  Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
  Handlebars.registerHelper('inc', (value: number) => value + 1);
};
