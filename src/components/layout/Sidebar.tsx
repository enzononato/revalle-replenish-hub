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
  X,
  Database,
  User
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: ('admin' | 'distribuicao' | 'conferente')[];
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: FileText, label: 'Protocolos', path: '/protocolos', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: Truck, label: 'Motoristas', path: '/motoristas', roles: ['admin', 'distribuicao'] },
  { icon: Building2, label: 'Unidades', path: '/unidades', roles: ['admin'] },
  { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['admin'] },
  { icon: Database, label: 'Importar Dados', path: '/importar-dados', roles: ['admin'] },
  { icon: Settings, label: 'Configurações', path: '/configuracoes', roles: ['admin'] },
];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return { label: 'Admin', variant: 'default' as const };
    case 'distribuicao':
      return { label: 'Distribuição', variant: 'secondary' as const };
    case 'conferente':
      return { label: 'Conferente', variant: 'outline' as const };
    default:
      return { label: role, variant: 'outline' as const };
  }
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const userRole = user?.nivel || 'conferente';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));
  const roleBadge = getRoleBadge(userRole);

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
        "fixed lg:static inset-y-0 left-0 z-40 w-56 bg-sidebar transform transition-transform duration-300 ease-in-out flex flex-col",
        "lg:transform-none",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border">
          <h1 className="font-heading text-xl font-bold text-white">
            Revalle
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">Sistema de Reposição</p>
        </div>

        {/* User Profile Section - Below logo */}
        <div className="flex-shrink-0 p-3 border-b border-sidebar-border bg-sidebar-accent/20">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.nome || 'Usuário'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-sidebar-foreground/80 mt-0.5">
                <Building2 size={10} />
                <span className="truncate">{user?.unidade || 'Sem unidade'}</span>
              </div>
              <Badge variant={roleBadge.variant} className="mt-1.5 text-[10px] px-1.5 py-0">
                {roleBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation with Logout at the end */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
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
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="sidebar-item w-full text-destructive hover:bg-destructive/10 mt-1"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </nav>
      </aside>
    </>
  );
}
