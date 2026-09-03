// Nombres de los 5 schemas de Postgres, para referenciarlos en migraciones
// crudas o en consultas $queryRaw sin repetir el literal en todo el codigo.
export const DbSchema = {
  AUTH: 'auth',
  CATALOG: 'catalog',
  INVENTORY: 'inventory',
  SALES: 'sales',
  CONFIG: 'config',
} as const;
