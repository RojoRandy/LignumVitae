import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Menu, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/hooks/use-auth';
import { NAV } from './nav';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageState } from '@/components/ui/page';

const SIDEBAR_COLLAPSED_KEY = 'lignumvitae.sidebar-collapsed';

const SidebarNav = ({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-5">
      {NAV.map((group) => (
        <div key={group.group || group.items[0].to} className="flex flex-col gap-1">
          {!collapsed && group.group && (
            <p className="px-2.5 pb-1 text-micro font-bold uppercase tracking-wider text-text-faint">{group.group}</p>
          )}
          {group.items
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={cn(
                    'relative flex items-center gap-3 rounded-input px-2.5 py-2.5 text-body-sm font-semibold transition-colors',
                    isActive ? 'text-accent-hover' : 'text-text-muted hover:bg-surface-sunken hover:text-text',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-input bg-accent-soft"
                      transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                    />
                  )}
                  <item.icon className="relative z-10 size-[18px] shrink-0" />
                  {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </NavLink>
              );
            })}
        </div>
      ))}
    </nav>
  );
};

const UserMenu = ({ collapsed }: { collapsed?: boolean }) => {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-input p-2 text-left transition-colors hover:bg-surface-sunken">
        <Avatar name={user.fullName} />
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-semibold text-text">{user.fullName}</span>
            <span className="truncate text-micro text-text-muted">
              {user.role === 'super_user' ? 'Administradora' : user.role === 'admin' ? 'Admin' : 'Empleada'}
            </span>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} className="text-danger-fg">
          <LogOut className="size-3.5" />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Wordmark = () => (
  <span className="text-heading-sm font-extrabold tracking-tight text-accent-hover">Lignum Vitae</span>
);

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className="flex h-dvh bg-surface-sunken">
      {/* Sidebar de escritorio */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-surface-raised transition-[width] duration-200 ease-out md:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className={cn('flex h-16 items-center border-b border-border px-4', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <Wordmark />}
          <button
            onClick={toggleCollapsed}
            className="rounded-input p-2 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
            aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="border-t border-border p-2.5">
          <UserMenu collapsed={collapsed} />
        </div>
      </aside>

      {/* Menu movil */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex flex-col p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center border-b border-border px-4">
            <Wordmark />
          </div>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
          <div className="border-t border-border p-2.5">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface-raised px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex size-11 items-center justify-center rounded-input text-text-muted transition-colors hover:bg-surface-sunken"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <Wordmark />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-7">
          <Suspense
            fallback={
              <PageState isLoading />
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};
