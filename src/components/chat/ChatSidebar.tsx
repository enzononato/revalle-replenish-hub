import { useState } from 'react';
import { Search, Plus, MessageSquare, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  onNewGroup: () => void;
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
  onNewGroup,
  isLoading,
}: ChatSidebarProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'grupo'>('individual');

  const filteredConversations = conversations.filter((conv) => {
    const matchesTab = conv.tipo === activeTab;
    
    if (conv.tipo === 'individual') {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      return matchesTab && otherParticipant?.user_nome.toLowerCase().includes(search.toLowerCase());
    } else {
      return matchesTab && (conv.nome?.toLowerCase().includes(search.toLowerCase()) || 
                           conv.unidade?.toLowerCase().includes(search.toLowerCase()));
    }
  });

  const individualUnread = conversations
    .filter(c => c.tipo === 'individual')
    .reduce((acc, c) => acc + c.unreadCount, 0);
  
  const groupUnread = conversations
    .filter(c => c.tipo === 'grupo')
    .reduce((acc, c) => acc + c.unreadCount, 0);

  const renderConversationItem = (conv: ChatConversation) => {
    const isSelected = conv.id === selectedConversationId;

    if (conv.tipo === 'individual') {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      
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
    } else {
      // Group conversation
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
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">
                  {conv.nome || conv.unidade}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{conv.participants.length} membros</span>
              </div>
              {conv.lastMessage && (
                <p className="text-sm text-muted-foreground truncate">
                  {conv.lastMessage.sender_id === user?.id ? 'Você' : conv.lastMessage.sender_nome.split(' ')[0]}: {conv.lastMessage.content}
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
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </h2>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={onNewGroup} title="Novo grupo">
              <Users className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onNewConversation} title="Nova conversa">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'individual' | 'grupo')} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-2">
          <TabsTrigger value="individual" className="relative">
            Individual
            {individualUnread > 0 && (
              <Badge className="ml-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                {individualUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grupo" className="relative">
            Grupos
            {groupUnread > 0 && (
              <Badge className="ml-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                {groupUnread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="flex-1 m-0">
          <ScrollArea className="h-full">
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
                {filteredConversations.map(renderConversationItem)}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="grupo" className="flex-1 m-0">
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {search ? 'Nenhum grupo encontrado' : 'Nenhum grupo ainda'}
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map(renderConversationItem)}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
