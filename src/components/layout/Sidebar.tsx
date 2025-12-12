import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Truck, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', adminOnly: false },
  { icon: FileText, label: 'Protocolos', path: '/protocolos', adminOnly: false },
  { icon: Truck, label: 'Motoristas', path: '/motoristas', adminOnly: true },
  { icon: Users, label: 'Usuários', path: '/usuarios', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', adminOnly: true },
];

export function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
            <h1 className="font-heading text-2xl font-bold text-sidebar-foreground">
              <span className="text-sidebar-primary">Revalle</span>
            </h1>
            <p className="text-sm text-sidebar-foreground/60 mt-1">Sistema de Reposição</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
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

          {/* User info & Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-4 px-4">
              <p className="font-medium text-sidebar-foreground">{user?.nome}</p>
              <p className="text-sm text-sidebar-foreground/60">{user?.email}</p>
              <span className={cn(
                "inline-block mt-2 px-2 py-1 rounded text-xs font-medium",
                isAdmin 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "bg-sidebar-accent text-sidebar-accent-foreground"
              )}>
                {isAdmin ? 'Administrador' : 'Usuário'}
              </span>
            </div>
            <button
              onClick={logout}
              className="sidebar-item w-full text-destructive hover:bg-destructive/10"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
