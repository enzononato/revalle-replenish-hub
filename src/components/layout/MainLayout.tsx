import { Outlet, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { ContentHeader } from './ContentHeader';
import { GuidedTour } from '@/components/GuidedTour';
import { supabase } from '@/integrations/supabase/client';

export function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ['unidades'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('unidades')
              .select('*')
              .order('nome');

            if (error) {
              console.warn('[prefetch] Falha ao pré-carregar unidades:', error.message);
              return [];
            }

            return data;
          },
          staleTime: 1000 * 60 * 5,
          retry: false,
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, queryClient]);

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
