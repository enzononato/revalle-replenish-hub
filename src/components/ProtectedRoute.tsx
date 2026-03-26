import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Fallback de segurança: evita spinner infinito quando sessão existe,
  // mas o perfil não pôde ser hidratado.
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!allowedRoles.includes(user.nivel)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
