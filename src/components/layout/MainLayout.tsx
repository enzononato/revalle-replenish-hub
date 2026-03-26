import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { ContentHeader } from './ContentHeader';
import { GuidedTour } from '@/components/GuidedTour';

export function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-14 lg:pt-6 overflow-y-auto sidebar-scroll">
        <ContentHeader />
        <Outlet />
      </main>
      <GuidedTour />
    </div>
  );
}
