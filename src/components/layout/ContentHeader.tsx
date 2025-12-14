import { NotificationBell } from '@/components/NotificationBell';
import { useLocation } from 'react-router-dom';

export function ContentHeader() {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const showNotifications = ['/protocolos'].includes(location.pathname);
  
  // No Dashboard, não mostra sino (alertas estão no card)
  if (isDashboard) return null;
  if (!showNotifications) return null;
  
  return (
    <div className="flex items-center justify-end mb-6">
      <NotificationBell />
    </div>
  );
}
