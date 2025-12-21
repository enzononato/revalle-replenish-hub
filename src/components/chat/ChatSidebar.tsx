import { useState } from 'react';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChatConversation } from '@/hooks/useChatDB';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isLoading: boolean;
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

const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  return format(date, 'dd/MM', { locale: ptBR });
};

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading,
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.user_nome.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </h2>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conv) => {
              const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
              const isSelected = conv.id === selectedConversationId;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors mb-1",
                    "hover:bg-accent/50",
                    isSelected && "bg-accent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {otherParticipant?.user_nome || 'Usuário'}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-[10px] px-1.5 py-0", getRoleBadgeColor(otherParticipant?.user_nivel || ''))}
                        >
                          {otherParticipant?.user_nivel === 'admin' ? 'Admin' : 
                           otherParticipant?.user_nivel === 'distribuicao' ? 'Dist.' : 
                           'Conf.'}
                        </Badge>
                      </div>
                      {conv.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.sender_id === user?.id ? 'Você: ' : ''}
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conv.lastMessage.created_at)}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <Badge className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
