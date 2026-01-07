import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { ContentHeader } from './ContentHeader';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { useChatDB } from '@/hooks/useChatDB';
import { supabase } from '@/integrations/supabase/client';
export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { totalUnread } = useChatDB();
  const queryClient = useQueryClient();

  // Prefetch motoristas e unidades para melhor performance
  useEffect(() => {
    if (isAuthenticated) {
      // Prefetch motoristas
      queryClient.prefetchQuery({
        queryKey: ['motoristas'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('motoristas')
            .select('*')
            .order('nome', { ascending: true });
          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5,
      });

      // Prefetch unidades
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Não mostrar o chat bubble na página de chat e configurações
  const showChatBubble = !location.pathname.startsWith('/chat') && 
                         !location.pathname.startsWith('/configuracoes');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-14 lg:pt-6 overflow-y-auto sidebar-scroll">
        <ContentHeader />
        <Outlet />
      </main>
      
      {/* Global Chat Bubble - hidden on Protocolos and Configurações pages */}
      {showChatBubble && (
        <ChatBubble unreadCount={totalUnread} />
      )}
    </div>
  );
}
