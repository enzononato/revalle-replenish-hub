import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatDB } from '@/hooks/useChatDB';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { NewConversationModal } from '@/components/chat/NewConversationModal';
import { NewGroupModal } from '@/components/chat/NewGroupModal';
import { toast } from 'sonner';
import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Chat() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    conversations,
    isLoadingConversations,
    useConversationMessages,
    getOrCreateConversation,
    getOrCreateUnitGroup,
    sendMessage,
    isSending,
    markAsRead,
  } = useChatDB();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);
  const [pendingProtocolo, setPendingProtocolo] = useState<{ id: string; numero: string } | null>(null);

  const { data: messages = [], isLoading: isLoadingMessages } = useConversationMessages(selectedConversationId);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Handle URL parameters for direct protocol discussion
  useEffect(() => {
    const protocoloId = searchParams.get('protocolo_id');
    const protocoloNumero = searchParams.get('protocolo_numero');
    const targetUserId = searchParams.get('target_user_id');
    const targetUserNome = searchParams.get('target_user_nome');

    if (protocoloId && protocoloNumero) {
      setPendingProtocolo({ id: protocoloId, numero: protocoloNumero });
      
      // If we have a target user, create/get conversation with them
      if (targetUserId && targetUserNome) {
        getOrCreateConversation({
          id: targetUserId,
          nome: targetUserNome,
          nivel: 'conferente', // Default, will be matched
          unidade: user?.unidade || '',
        }).then(convId => {
          setSelectedConversationId(convId);
          setIsMobileSidebarOpen(false);
        }).catch(console.error);
      }
      
      // Clear URL params
      setSearchParams({});
    }
  }, [searchParams, user, getOrCreateConversation, setSearchParams]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversationId && selectedConversation?.unreadCount > 0) {
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, selectedConversation?.unreadCount, markAsRead]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleNewConversation = async (selectedUser: { id: string; nome: string; nivel: string; unidade: string }) => {
    try {
      const conversationId = await getOrCreateConversation(selectedUser);
      setSelectedConversationId(conversationId);
      setIsMobileSidebarOpen(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erro ao criar conversa');
    }
  };

  const handleNewGroup = async (unidade: string) => {
    try {
      const conversationId = await getOrCreateUnitGroup(unidade);
      setSelectedConversationId(conversationId);
      setIsMobileSidebarOpen(false);
      toast.success(`Você entrou no grupo ${unidade}`);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Erro ao entrar no grupo');
    }
  };

  const handleSendMessage = async (content: string, protocoloId?: string, protocoloNumero?: string) => {
    if (!selectedConversationId) return;

    // Use pending protocolo if available
    const finalProtocoloId = protocoloId || pendingProtocolo?.id;
    const finalProtocoloNumero = protocoloNumero || pendingProtocolo?.numero;

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        content,
        protocoloId: finalProtocoloId,
        protocoloNumero: finalProtocoloNumero,
      });
      
      // Clear pending protocolo after first message
      if (pendingProtocolo) {
        setPendingProtocolo(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-background">
      {/* Mobile toggle */}
      <div className="lg:hidden absolute top-4 right-4 z-10">
        {!isMobileSidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "w-full lg:w-80 flex-shrink-0 transition-all duration-300",
          "lg:block",
          isMobileSidebarOpen ? "block" : "hidden"
        )}
      >
        <ChatSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={() => setIsNewConversationOpen(true)}
          onNewGroup={() => setIsNewGroupOpen(true)}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          "lg:flex",
          isMobileSidebarOpen ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Mobile back button */}
        {!isMobileSidebarOpen && selectedConversationId && (
          <div className="lg:hidden p-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        )}

        <ChatWindow
          messages={messages}
          conversation={selectedConversation}
          isLoading={isLoadingMessages}
        />

        {selectedConversationId && (
          <ChatInput
            onSend={handleSendMessage}
            isSending={isSending}
            disabled={!selectedConversationId}
          />
        )}
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        open={isNewConversationOpen}
        onOpenChange={setIsNewConversationOpen}
        onSelectUser={handleNewConversation}
      />

      {/* New Group Modal */}
      <NewGroupModal
        open={isNewGroupOpen}
        onOpenChange={setIsNewGroupOpen}
        onSelectUnidade={handleNewGroup}
      />
    </div>
  );
}
