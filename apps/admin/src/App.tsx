import { lazy } from 'react';
import { Routes, Route } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
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
        <Route path="velas" element={<CandlesPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="empaques" element={<PackagingTypesPage />} />
        <Route path="tarjetas" element={<CardTypesPage />} />
        <Route path="insumos" element={<SuppliesPage />} />
        <Route path="compras" element={<PurchasesPage />} />
        <Route path="activos" element={<AssetsPage />} />
        <Route path="gastos" element={<ExpensesPage />} />
        <Route path="cierre-mensual" element={<OverheadPage />} />
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
