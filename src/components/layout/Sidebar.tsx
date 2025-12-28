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
  Moon,
  Circle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
        <div className="flex-shrink-0 p-3 border-t border-sidebar-border space-y-3">
          {/* User Info Card */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-sidebar-accent/50 to-sidebar-accent/20 border border-sidebar-border/50">
            {/* Avatar with online indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-sm font-bold text-primary-foreground">
                  {user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'US'}
                </span>
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-sidebar-background flex items-center justify-center">
                <Circle size={6} fill="currentColor" className="text-emerald-300 animate-pulse" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user?.nome || 'Usuário'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/60 mt-0.5">
                <Building2 size={9} />
                <span className="truncate">{user?.unidade || 'Sem unidade'}</span>
              </div>
              <Badge variant={roleBadge.variant} className="mt-1 text-[9px] px-1.5 py-0 h-4">
                {roleBadge.label}
              </Badge>
            </div>
          </div>

          {/* Theme toggle with Switch */}
          <div 
            data-tour="theme-toggle"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/30"
          >
            <div className="flex items-center gap-2 text-sidebar-foreground/80">
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span className="text-xs">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          {/* Logout button */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm border border-red-500/20"
          >
            <LogOut size={14} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
