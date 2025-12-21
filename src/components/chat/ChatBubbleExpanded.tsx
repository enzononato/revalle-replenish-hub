import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, MessageSquare, Paperclip, FileText, RefreshCw, X, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatDB, ChatConversation } from '@/hooks/useChatDB';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { NewConversationModal } from './NewConversationModal';
import { NewGroupModal } from './NewGroupModal';
import { supabase } from '@/integrations/supabase/client';
import { useProtocolosDB } from '@/hooks/useProtocolosDB';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [selectedProtocoloId, setSelectedProtocoloId] = useState<string | undefined>(protocoloId);
  const [selectedProtocoloNumero, setSelectedProtocoloNumero] = useState<string | undefined>(protocoloNumero);
  const [protocoloPopoverOpen, setProtocoloPopoverOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasAutoOpenedConversation, setHasAutoOpenedConversation] = useState(false);
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  const { protocolos } = useProtocolosDB();
  const { data: messages = [] } = useConversationMessages(selectedConversation?.id || null);

  // Realtime presence for typing indicator
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channel = supabase.channel(`typing:${selectedConversation.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.values(state)
          .flat()
          .filter((presence: any) => presence.user_id !== user.id && presence.is_typing)
          .map((presence: any) => presence.user_nome);
        setOthersTyping(typingUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            user_nome: user.nome,
            is_typing: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, user]);

  // Broadcast typing status
  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!selectedConversation || !user) return;
    
    const now = Date.now();
    // Throttle broadcasts to max once every 500ms
    if (isTyping && now - lastTypingBroadcastRef.current < 500) return;
    lastTypingBroadcastRef.current = now;

    const channel = supabase.channel(`typing:${selectedConversation.id}`);
    await channel.track({
      user_id: user.id,
      user_nome: user.nome,
      is_typing: isTyping,
    });
  }, [selectedConversation, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Broadcast typing
    broadcastTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

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

    // Stop typing indicator
    broadcastTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage({
        conversationId: selectedConversation.id,
        content: messageInput,
        protocoloId: attachProtocolo ? selectedProtocoloId : undefined,
        protocoloNumero: attachProtocolo ? selectedProtocoloNumero : undefined,
      });
      setMessageInput('');
      setAttachProtocolo(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleEndConversation = () => {
    setSelectedConversation(null);
    setMessageInput('');
    setAttachProtocolo(false);
    setOthersTyping([]);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
    setOthersTyping([]);
  };

  const handleCloseChat = () => {
    if (messageInput.trim()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmCloseChat = () => {
    setShowCloseConfirm(false);
    onClose();
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['protocolos'] });
    await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    setTimeout(() => setIsRefreshing(false), 500);
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseConversation}>
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
          {othersTyping.length > 0 ? (
            <p className="text-xs text-primary animate-pulse">
              {othersTyping.length === 1 
                ? `${othersTyping[0]} está digitando...` 
                : `${othersTyping.length} pessoas digitando...`}
            </p>
          ) : selectedConversation.tipo === 'grupo' ? (
            <p className="text-xs text-muted-foreground">{selectedConversation.participants.length} participantes</p>
          ) : null}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs gap-1" 
          onClick={handleEndConversation}
          title="Encerrar esta conversa e iniciar nova"
        >
          <Plus className="h-3 w-3" />
          Nova
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive" 
          onClick={handleCloseChat}
          title="Fechar chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem uma mensagem não enviada. Tem certeza que deseja fechar o chat? 
              A mensagem será perdida, mas o histórico da conversa ficará salvo nos logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseChat}>
              Fechar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <div className="flex items-center gap-2">
          {/* Protocol selector */}
          <Popover open={protocoloPopoverOpen} onOpenChange={setProtocoloPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors shrink-0",
                  attachProtocolo && selectedProtocoloNumero 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Paperclip className="h-3 w-3" />
                {attachProtocolo && selectedProtocoloNumero ? `#${selectedProtocoloNumero}` : 'Protocolo'}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar protocolo..." />
                <CommandList>
                  <CommandEmpty>Nenhum protocolo encontrado</CommandEmpty>
                  <CommandGroup>
                    {attachProtocolo && (
                      <CommandItem
                        onSelect={() => {
                          setAttachProtocolo(false);
                          setSelectedProtocoloId(undefined);
                          setSelectedProtocoloNumero(undefined);
                          setProtocoloPopoverOpen(false);
                        }}
                        className="text-muted-foreground"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Remover anexo
                      </CommandItem>
                    )}
                    {protocolos
                      .filter(p => p.status !== 'encerrado')
                      .slice(0, 20)
                      .map(p => (
                        <CommandItem
                          key={p.id}
                          onSelect={() => {
                            setSelectedProtocoloId(p.id);
                            setSelectedProtocoloNumero(p.numero);
                            setAttachProtocolo(true);
                            setProtocoloPopoverOpen(false);
                          }}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          <span className="font-mono">#{p.numero}</span>
                          <span className="text-muted-foreground ml-2 truncate text-xs">
                            {p.motorista.nome}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={handleInputChange}
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
