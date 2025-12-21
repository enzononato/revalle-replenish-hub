import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { ContentHeader } from './ContentHeader';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { useChatDB } from '@/hooks/useChatDB';

export function MainLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { totalUnread } = useChatDB();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Não mostrar o chat bubble na página de protocolos (ela tem o seu próprio)
  const showChatBubble = !location.pathname.startsWith('/protocolos');

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-0 p-4 lg:p-6 pt-14 lg:pt-6">
        <ContentHeader />
        <Outlet />
      </main>
      
      {/* Global Chat Bubble - hidden on Protocolos page */}
      {showChatBubble && (
        <ChatBubble unreadCount={totalUnread} />
      )}
    </div>
  );
}
