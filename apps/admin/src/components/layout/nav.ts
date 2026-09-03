// Estructura del sidebar.
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  Palette,
  CreditCard,
  Boxes,
  ShoppingCart,
  Wrench,
  Receipt,
  CalendarClock,
  Users,
  Users2,
  FileText,
  ClipboardList,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    group: 'Panel',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    group: 'Operacion',
    items: [
      { label: 'Clientes', to: '/clientes', icon: Users2 },
      { label: 'Cotizaciones', to: '/cotizaciones', icon: FileText },
      { label: 'Pedidos', to: '/pedidos', icon: ClipboardList },
    ],
  },
  {
    group: 'Catalogo',
    items: [
      { label: 'Productos', to: '/productos', icon: Package },
      { label: 'Velas / Moldes', to: '/velas', icon: FlaskConical },
      { label: 'Categorias', to: '/categorias', icon: Palette },
      { label: 'Empaques', to: '/empaques', icon: CreditCard },
      { label: 'Tarjetas', to: '/tarjetas', icon: CreditCard },
    ],
  },
  {
    group: 'Inventario',
    items: [
      { label: 'Insumos', to: '/insumos', icon: Boxes },
      { label: 'Compras', to: '/compras', icon: ShoppingCart },
      { label: 'Activos', to: '/activos', icon: Wrench },
      { label: 'Gastos', to: '/gastos', icon: Receipt },
      { label: 'Cierre mensual', to: '/cierre-mensual', icon: CalendarClock },
    ],
  },
  {
    group: 'Administracion',
    items: [
      { label: 'Usuarios', to: '/usuarios', icon: Users, adminOnly: true },
      { label: 'Configuracion', to: '/configuracion', icon: Settings, adminOnly: true },
    ],
  },
];
