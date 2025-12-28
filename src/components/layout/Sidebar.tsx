import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatDB } from '@/hooks/useChatDB';
import { useTheme } from 'next-themes';
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
  User,
  ClipboardList,
  MessageSquare,
  Sun,
  Moon
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: ('admin' | 'distribuicao' | 'conferente')[];
};

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: FileText, label: 'Protocolos', path: '/protocolos', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: MessageSquare, label: 'Chat', path: '/chat', roles: ['admin', 'distribuicao', 'conferente'] },
  { icon: Truck, label: 'Motoristas', path: '/motoristas', roles: ['admin', 'distribuicao'] },
  { icon: Building2, label: 'Unidades', path: '/unidades', roles: ['admin'] },
  { icon: Users, label: 'Usuários', path: '/usuarios', roles: ['admin'] },
  { icon: ClipboardList, label: 'Logs de Auditoria', path: '/logs-auditoria', roles: ['admin'] },
  { icon: MessageSquare, label: 'Logs de Chat', path: '/logs-chat', roles: ['admin'] },
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
  const { totalUnread } = useChatDB();
  const { theme, setTheme } = useTheme();

  const userRole = user?.nivel || 'conferente';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));
  const roleBadge = getRoleBadge(userRole);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

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
      <aside 
        data-tour="sidebar"
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-56 bg-sidebar transform transition-all duration-300 ease-out flex flex-col",
          "lg:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border">
          <h1 className="font-heading text-xl font-bold text-white">
            Revalle
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">Sistema de Reposição</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 sidebar-scroll p-3 space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isChatItem = item.path === '/chat';
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                data-tour={item.path === '/chat' ? 'chat' : item.path === '/protocolos' ? 'protocolos' : undefined}
                className={cn(
                  "sidebar-item",
                  isActive && "active"
                )}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {isChatItem && totalUnread > 0 && (
                  <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section - at bottom */}
        <div className="flex-shrink-0 p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/30">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <User size={16} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.nome || 'Usuário'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 mt-0.5">
                <Building2 size={10} />
                <span className="truncate">{user?.unidade || 'Sem unidade'}</span>
              </div>
              <Badge variant={roleBadge.variant} className="mt-1.5 text-[10px] px-1.5 py-0.5">
                {roleBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Theme toggle and Logout */}
        <div className="flex-shrink-0 p-3 pt-0 space-y-2">
        {/* Theme toggle */}
          <button
            data-tour="theme-toggle"
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground text-sm"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="flex-1 text-left">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          
          {/* Logout */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm"
          >
            <LogOut size={16} />
            <span className="flex-1 text-left">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
