import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Truck, 
  Building2,
  Users, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: ('admin' | 'distribuicao' | 'conferente')[];
  isLogout?: boolean;
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'distribuicao'] },
  { icon: FileText, label: 'Protocolos', path: '/protocolos', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: Truck, label: 'Motoristas', path: '/motoristas', roles: ['admin', 'distribuicao'] },
  { icon: Building2, label: 'Unidades', path: '/unidades', roles: ['admin'] },
  { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['admin'] },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', roles: ['admin'] },
  { icon: LogOut, label: 'Sair', path: '/logout', roles: ['admin', 'distribuicao', 'conferente'], isLogout: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const userRole = user?.nivel || 'conferente';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-foreground/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 ease-in-out",
        "lg:transform-none",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="font-heading text-2xl font-bold text-white">
              Revalle
            </h1>
            <p className="text-sm text-sidebar-foreground/60 mt-1">Sistema de Reposição</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              if (item.isLogout) {
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="sidebar-item w-full text-destructive hover:bg-destructive/10"
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "sidebar-item",
                    isActive && "active"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
