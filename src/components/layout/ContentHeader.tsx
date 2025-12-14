import { NotificationBell } from '@/components/NotificationBell';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2 } from 'lucide-react';

export function ContentHeader() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const showNotifications = ['/protocolos'].includes(location.pathname);
  
  // No Dashboard, não mostra sino (alertas estão no card)
  if (isDashboard) return null;
  
  return (
    <div className="flex items-center justify-between mb-6">
      {/* Unidade do usuário */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 size={18} />
        <span className="text-sm font-medium">
          {isAdmin ? 'Todas as Unidades' : user?.unidade || '-'}
        </span>
      </div>
      
      {/* Notificações */}
      {showNotifications && <NotificationBell />}
    </div>
  );
}
