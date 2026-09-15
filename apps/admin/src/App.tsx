import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { TabsPageLayout } from '@/components/layout/TabsPageLayout';
import { ProtectedRoute, AdminRoute } from '@/components/layout/RouteGuards';
import { LoginPage } from '@/pages/LoginPage';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'));
const QuotationsPage = lazy(() => import('@/features/quotations/QuotationsPage'));
const QuotationFormPage = lazy(() => import('@/features/quotations/QuotationFormPage'));
const QuotationDetailPage = lazy(() => import('@/features/quotations/QuotationDetailPage'));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'));
const ProductWizardPage = lazy(() => import('@/features/products/ProductWizardPage'));
const CandlesPage = lazy(() => import('@/features/candles/CandlesPage'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const PackagingTypesPage = lazy(() => import('@/features/packaging-types/PackagingTypesPage'));
const CardTypesPage = lazy(() => import('@/features/card-types/CardTypesPage'));
const SuppliesPage = lazy(() => import('@/features/supplies/SuppliesPage'));
const PurchasesPage = lazy(() => import('@/features/purchases/PurchasesPage'));
const AssetsPage = lazy(() => import('@/features/assets/AssetsPage'));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'));
const OverheadPage = lazy(() => import('@/features/overhead/OverheadPage'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/features/not-found/NotFoundPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="cotizaciones" element={<QuotationsPage />} />
        <Route path="cotizaciones/nueva" element={<QuotationFormPage />} />
        <Route path="cotizaciones/:id/editar" element={<QuotationFormPage />} />
        <Route path="cotizaciones/:id" element={<QuotationDetailPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/:id" element={<OrderDetailPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="productos/nuevo" element={<ProductWizardPage />} />
        <Route path="productos/:id/editar" element={<ProductWizardPage />} />
        <Route path="insumos" element={<SuppliesPage />} />
        <Route path="compras" element={<PurchasesPage />} />

        <Route
          path="catalogo"
          element={
            <TabsPageLayout
              title="Catalogo"
              description="Velas, categorias, empaques y tarjetas: las piezas que arman un producto."
              tabs={[
                { label: 'Velas / Moldes', to: '/catalogo/velas' },
                { label: 'Categorias', to: '/catalogo/categorias' },
                { label: 'Empaques', to: '/catalogo/empaques' },
                { label: 'Tarjetas', to: '/catalogo/tarjetas' },
              ]}
            />
          }
        >
          <Route index element={<Navigate to="velas" replace />} />
          <Route path="velas" element={<CandlesPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="empaques" element={<PackagingTypesPage />} />
          <Route path="tarjetas" element={<CardTypesPage />} />
        </Route>

        <Route
          path="finanzas"
          element={
            <TabsPageLayout
              title="Finanzas"
              description="Gastos, activos y el cierre mensual: todo lo que se revisa a fin de mes."
              tabs={[
                { label: 'Gastos', to: '/finanzas/gastos' },
                { label: 'Activos', to: '/finanzas/activos' },
                { label: 'Cierre mensual', to: '/finanzas/cierre-mensual' },
              ]}
            />
          }
        >
          <Route index element={<Navigate to="gastos" replace />} />
          <Route path="gastos" element={<ExpensesPage />} />
          <Route path="activos" element={<AssetsPage />} />
          <Route path="cierre-mensual" element={<OverheadPage />} />
        </Route>

        {/* Rutas viejas: bookmarks y links guardados siguen funcionando. */}
        <Route path="velas" element={<Navigate to="/catalogo/velas" replace />} />
        <Route path="categorias" element={<Navigate to="/catalogo/categorias" replace />} />
        <Route path="empaques" element={<Navigate to="/catalogo/empaques" replace />} />
        <Route path="tarjetas" element={<Navigate to="/catalogo/tarjetas" replace />} />
        <Route path="activos" element={<Navigate to="/finanzas/activos" replace />} />
        <Route path="gastos" element={<Navigate to="/finanzas/gastos" replace />} />
        <Route path="cierre-mensual" element={<Navigate to="/finanzas/cierre-mensual" replace />} />
        <Route
          path="usuarios"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
