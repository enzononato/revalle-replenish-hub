import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChatMessage, ChatParticipant, ChatConversation } from '@/hooks/useChatDB';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MessageSquare, FileText, Users } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  conversation: ChatConversation | undefined;
  isLoading: boolean;
}

export function ChatWindow({ messages, conversation, isLoading }: ChatWindowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'admin':
        return 'bg-primary text-primary-foreground';
      case 'distribuicao':
        return 'bg-secondary text-secondary-foreground';
      case 'conferente':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isGroup = conversation.tipo === 'grupo';
  const otherParticipant = !isGroup ? conversation.participants.find(p => p.user_id !== user?.id) : undefined;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {isGroup ? (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{conversation.nome || conversation.unidade}</span>
                  <Badge variant="outline" className="text-xs">
                    Grupo
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {conversation.participants.length} membros
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {otherParticipant?.user_nome.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{otherParticipant?.user_nome}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getRoleBadgeColor(otherParticipant?.user_nivel || ''))}
                  >
                    {otherParticipant?.user_nivel === 'admin' ? 'Admin' : 
                     otherParticipant?.user_nivel === 'distribuicao' ? 'Distribuição' : 
                     'Conferente'}
                  </Badge>
                </div>
                {otherParticipant?.user_unidade && (
                  <p className="text-sm text-muted-foreground">{otherParticipant.user_unidade}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma mensagem ainda. Comece a conversa!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showDate = index === 0 || 
                format(new Date(messages[index - 1].created_at), 'dd/MM/yyyy') !== 
                format(new Date(message.created_at), 'dd/MM/yyyy');
              
              // Show sender name in groups for messages from others
              const showSenderName = isGroup && !isOwn;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(message.created_at), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md"
                      )}
                    >
                      {showSenderName && (
                        <p className={cn(
                          "text-xs font-medium mb-1",
                          isOwn ? "text-primary-foreground/80" : "text-primary"
                        )}>
                          {message.sender_nome}
                        </p>
                      )}
                      {message.protocolo_numero && (
                        <button
                          onClick={() => navigate(`/protocolos?numero=${message.protocolo_numero}`)}
                          className={cn(
                            "flex items-center gap-1 text-xs mb-2 px-2 py-1 rounded-md transition-colors",
                            isOwn 
                              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
                              : "bg-primary/10 hover:bg-primary/20 text-primary"
                          )}
                        >
                          <FileText className="h-3 w-3" />
                          {message.protocolo_numero}
                        </button>
                      )}
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {format(new Date(message.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
