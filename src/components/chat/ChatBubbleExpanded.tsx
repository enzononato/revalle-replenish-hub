import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, MessageSquare, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatDB, ChatConversation } from '@/hooks/useChatDB';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { NewConversationModal } from './NewConversationModal';
import { NewGroupModal } from './NewGroupModal';

interface ChatBubbleExpandedProps {
  onClose: () => void;
  protocoloId?: string;
  protocoloNumero?: string;
  initialMessage?: string;
  targetUser?: { id: string; nome: string; nivel: string; unidade: string } | null;
}

export function ChatBubbleExpanded({ onClose, protocoloId, protocoloNumero, initialMessage, targetUser }: ChatBubbleExpandedProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [attachProtocolo, setAttachProtocolo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasAutoOpenedConversation, setHasAutoOpenedConversation] = useState(false);

  const { data: messages = [] } = useConversationMessages(selectedConversation?.id || null);

  // Auto abrir conversa com usuário alvo se fornecido
  useEffect(() => {
    const openTargetConversation = async () => {
      if (targetUser && !hasAutoOpenedConversation) {
        try {
          const conversationId = await getOrCreateConversation(targetUser);
          const conv = conversations.find(c => c.id === conversationId);
          if (conv) {
            setSelectedConversation(conv);
            if (initialMessage) {
              setMessageInput(initialMessage);
              setAttachProtocolo(true);
            }
          }
          setHasAutoOpenedConversation(true);
        } catch (error) {
          console.error('Erro ao abrir conversa:', error);
        }
      }
    };
    
    if (conversations.length > 0 || targetUser) {
      openTargetConversation();
    }
  }, [targetUser, conversations, getOrCreateConversation, initialMessage, hasAutoOpenedConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation, markAsRead]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM');
  };

  const getConversationName = (conv: ChatConversation) => {
    if (conv.tipo === 'grupo') return conv.nome || `Grupo ${conv.unidade}`;
    const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.user_nome || 'Conversa';
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      await sendMessage({
        conversationId: selectedConversation.id,
        content: messageInput,
        protocoloId: attachProtocolo ? protocoloId : undefined,
        protocoloNumero: attachProtocolo ? protocoloNumero : undefined,
      });
      setMessageInput('');
      setAttachProtocolo(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleNewConversation = async (otherUser: { id: string; nome: string; nivel: string; unidade: string }) => {
    try {
      const conversationId = await getOrCreateConversation(otherUser);
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) setSelectedConversation(conv);
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const handleNewGroup = async (unidade: string) => {
    try {
      const conversationId = await getOrCreateUnitGroup(unidade);
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) setSelectedConversation(conv);
    } catch (error) {
      console.error('Erro ao entrar no grupo:', error);
    }
  };

  // Conversation List View
  if (!selectedConversation) {
    return (
      <div className="fixed bottom-24 right-6 z-50 w-96 h-[450px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        {/* Header */}
        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-semibold">Chat</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewConversation(true)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewGroup(true)}>
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {isLoadingConversations ? (
            <p className="text-center text-muted-foreground p-4">Carregando...</p>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground p-4 space-y-2">
              <MessageSquare className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm">Nenhuma conversa ainda</p>
              <Button size="sm" variant="outline" onClick={() => setShowNewConversation(true)}>
                Iniciar Conversa
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    conv.tipo === 'grupo' ? 'bg-secondary' : 'bg-primary/20'
                  )}>
                    {conv.tipo === 'grupo' ? (
                      <Users className="h-5 w-5 text-secondary-foreground" />
                    ) : (
                      <span className="text-primary font-semibold">
                        {getConversationName(conv).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium truncate flex-1">{getConversationName(conv)}</span>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">{formatTime(conv.lastMessage.created_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage?.content || 'Sem mensagens'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Modals */}
        <NewConversationModal
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          onSelectUser={handleNewConversation}
        />
        <NewGroupModal
          open={showNewGroup}
          onOpenChange={setShowNewGroup}
          onSelectUnidade={handleNewGroup}
        />
      </div>
    );
  }

  // Messages View
  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[450px] bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedConversation(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          selectedConversation.tipo === 'grupo' ? 'bg-secondary' : 'bg-primary/20'
        )}>
          {selectedConversation.tipo === 'grupo' ? (
            <Users className="h-4 w-4 text-secondary-foreground" />
          ) : (
            <span className="text-primary font-semibold text-sm">
              {getConversationName(selectedConversation).charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{getConversationName(selectedConversation)}</h3>
          {selectedConversation.tipo === 'grupo' && (
            <p className="text-xs text-muted-foreground">{selectedConversation.participants.length} participantes</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.sender_id === user?.id ? "ml-auto items-end" : "items-start"
              )}
            >
              {selectedConversation.tipo === 'grupo' && msg.sender_id !== user?.id && (
                <span className="text-xs text-muted-foreground mb-0.5">{msg.sender_nome}</span>
              )}
              <div className={cn(
                "px-3 py-2 rounded-lg text-sm",
                msg.sender_id === user?.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                {msg.protocolo_numero && msg.protocolo_id && (
                  <button
                    onClick={() => navigate(`/protocolos?id=${msg.protocolo_id}`)}
                    className={cn(
                      "flex items-center gap-1 text-xs mb-1 px-2 py-0.5 rounded transition-colors",
                      msg.sender_id === user?.id 
                        ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                    )}
                  >
                    <FileText className="h-3 w-3" />
                    #{msg.protocolo_numero}
                  </button>
                )}
                <p className="break-words">{msg.content}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(msg.created_at), 'HH:mm')}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t space-y-2">
        {protocoloId && protocoloNumero && (
          <button
            onClick={() => setAttachProtocolo(!attachProtocolo)}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
              attachProtocolo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Paperclip className="h-3 w-3" />
            Anexar #{protocoloNumero}
          </button>
        )}
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            className="text-sm"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
