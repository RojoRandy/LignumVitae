// Estructura del sidebar.
import {
  LayoutDashboard,
  Package,
  Layers,
  Boxes,
  ShoppingCart,
  Wallet,
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
  /** Vacio = sin encabezado de grupo (un solo item no necesita titulo). */
  group: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    group: '',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }],
  },
  {
    // Orden por frecuencia real: el flujo empieza en cotizar, no en el alta
    // de cliente.
    group: 'Operacion',
    items: [
      { label: 'Cotizaciones', to: '/cotizaciones', icon: FileText },
      { label: 'Pedidos', to: '/pedidos', icon: ClipboardList },
      { label: 'Clientes', to: '/clientes', icon: Users2 },
    ],
  },
  {
    // Velas/Categorias/Empaques/Tarjetas eran 4 entradas de primer nivel;
    // ahora son pestanas de /catalogo, junto con tipos de insumo y unidades
    // de medida -- se tocan al dar de alta un modelo,
    // no a diario.
    group: 'Taller',
    items: [
      { label: 'Productos', to: '/productos', icon: Package },
      { label: 'Catalogo', to: '/catalogo', icon: Layers },
      { label: 'Insumos', to: '/insumos', icon: Boxes },
      { label: 'Compras', to: '/compras', icon: ShoppingCart },
    ],
  },
  {
    // Activos/Gastos/Cierre mensual eran 3 entradas sueltas; los tres son
    // de cierre de mes, ninguno es navegacion diaria -- ahora /finanzas.
    group: 'Administracion',
    items: [
      { label: 'Finanzas', to: '/finanzas', icon: Wallet },
      { label: 'Usuarios', to: '/usuarios', icon: Users, adminOnly: true },
      { label: 'Configuracion', to: '/configuracion', icon: Settings, adminOnly: true },
    ],
  },
];
