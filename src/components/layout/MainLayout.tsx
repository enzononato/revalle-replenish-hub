import { Outlet, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtocolosProvider } from '@/contexts/ProtocolosContext';
import { Sidebar } from './Sidebar';
import { ContentHeader } from './ContentHeader';
import { GuidedTour } from '@/components/GuidedTour';
import { supabase } from '@/integrations/supabase/client';

export function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      queryClient.prefetchQuery({
        queryKey: ['motoristas'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('motoristas_public' as any)
            .select('*')
            .order('nome', { ascending: true });
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5,
      });

      queryClient.prefetchQuery({
        queryKey: ['unidades'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .order('nome');
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5,
      });
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
    <ProtocolosProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-14 lg:pt-6 overflow-y-auto sidebar-scroll">
          <ContentHeader />
          <Outlet />
        </main>
        <GuidedTour />
      </div>
    </ProtocolosProvider>
  );
}
