/*
 * Layout compartido de /catalogo y /finanzas: un PageHeader unico para la
 * seccion + una barra de pestanas que navega por URL (no por estado local
 * como el Tabs de Radix que usa ProductWizardPage). Cada pestana es su
 * propia ruta con su propio PageToolbar y DataTable -- este layout solo
 * pone el marco.
 *
 * Reusa el lenguaje visual de components/ui/tabs.tsx (el mismo contenedor
 * bg-surface-sunken p-1.5 y el mismo trigger rounded-[7px] con estado
 * activo bg-white + shadow-sm) pero con NavLink en vez de Radix.Trigger,
 * porque aqui la pestana activa la decide la URL, no un estado en memoria.
 */
import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page';

export interface TabsPageLayoutProps {
  title: string;
  description?: string;
  tabs: { label: string; to: string }[];
}

export const TabsPageLayout = ({ title, description, tabs }: TabsPageLayoutProps) => (
  <div className="flex flex-col gap-4">
    <PageHeader title={title} description={description} />

    <nav className="flex w-full items-center gap-1 overflow-x-auto rounded-input bg-surface-sunken p-1.5 sm:w-fit">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'shrink-0 whitespace-nowrap rounded-[7px] px-4 py-2 text-body-sm font-semibold text-text-muted transition-all duration-150 hover:text-text',
              isActive && 'bg-white text-accent-hover shadow-sm',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>

    <Outlet />
  </div>
);
