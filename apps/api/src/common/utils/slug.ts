// Slugs deterministas para candles, productos y categorias: minusculas, sin
// acentos, espacios a guiones. Se usa en el importador del catalogo y en los
// DTOs de alta para no depender de que la duena teclee el slug a mano.
export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
