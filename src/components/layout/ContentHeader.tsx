import { NotificationBell } from '@/components/NotificationBell';
import { useLocation } from 'react-router-dom';

export function ContentHeader() {
  const location = useLocation();
  const showNotifications = ['/', '/dashboard', '/protocolos'].includes(location.pathname);
  
  if (!showNotifications) return null;
  
  return (
    <div className="flex items-center justify-end mb-6">
      <NotificationBell />
    </div>
  );
}
