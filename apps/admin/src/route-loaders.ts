// Un solo lugar para los import() de las paginas: App.tsx los usa en lazy() y el
// menu lateral los dispara al pasar el mouse o enfocar un enlace (precarga), asi
// el chunk ya viene cuando se hace clic. Vive aparte de App.tsx para no crear un
// ciclo de imports (App importa AppLayout, que importa esto).
export const routeLoaders = {
  dashboard: () => import('@/features/dashboard/DashboardPage'),
  customers: () => import('@/features/customers/CustomersPage'),
  quoteRequests: () => import('@/features/quote-requests/QuoteRequestsPage'),
  quotations: () => import('@/features/quotations/QuotationsPage'),
  quotationForm: () => import('@/features/quotations/QuotationFormPage'),
  quotationDetail: () => import('@/features/quotations/QuotationDetailPage'),
  orders: () => import('@/features/orders/OrdersPage'),
  orderDetail: () => import('@/features/orders/OrderDetailPage'),
  products: () => import('@/features/products/ProductsPage'),
  productWizard: () => import('@/features/products/ProductWizardPage'),
  candles: () => import('@/features/candles/CandlesPage'),
  categories: () => import('@/features/categories/CategoriesPage'),
  packagingTypes: () => import('@/features/packaging-types/PackagingTypesPage'),
  cardTypes: () => import('@/features/card-types/CardTypesPage'),
  supplyTypes: () => import('@/features/supply-types/SupplyTypesPage'),
  units: () => import('@/features/units/UnitsPage'),
  supplies: () => import('@/features/supplies/SuppliesPage'),
  purchases: () => import('@/features/purchases/PurchasesPage'),
  assets: () => import('@/features/assets/AssetsPage'),
  expenses: () => import('@/features/expenses/ExpensesPage'),
  overhead: () => import('@/features/overhead/OverheadPage'),
  testimonials: () => import('@/features/testimonials/TestimonialsPage'),
  users: () => import('@/features/users/UsersPage'),
  settings: () => import('@/features/settings/SettingsPage'),
  notFound: () => import('@/features/not-found/NotFoundPage'),
} as const;

const l = routeLoaders;

/** Paginas que carga cada entrada del menu (las secciones con pestanas precargan todas). */
const MENU_ROUTES: Record<string, (() => Promise<unknown>)[]> = {
  '/': [l.dashboard],
  '/solicitudes': [l.quoteRequests],
  '/cotizaciones': [l.quotations],
  '/pedidos': [l.orders],
  '/clientes': [l.customers],
  '/productos': [l.products],
  '/catalogo': [l.candles, l.categories, l.packagingTypes, l.cardTypes, l.supplyTypes, l.units],
  '/insumos': [l.supplies],
  '/compras': [l.purchases],
  '/finanzas': [l.expenses, l.assets, l.overhead],
  '/testimoniales': [l.testimonials],
  '/usuarios': [l.users],
  '/configuracion': [l.settings],
};

/** Descarga en segundo plano el codigo de la pagina a la que lleva `to`; nunca falla ni bloquea. */
export const preloadRoute = (to: string) => {
  MENU_ROUTES[to]?.forEach((load) => void load().catch(() => {}));
};
