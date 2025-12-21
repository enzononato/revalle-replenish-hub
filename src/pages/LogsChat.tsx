import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Search, 
  FileText,
  Users,
  User,
  Calendar,
  Filter,
  Download,
  X
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChatMessageLog {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_nome: string;
  sender_nivel: string;
  content: string;
  protocolo_id: string | null;
  protocolo_numero: string | null;
  created_at: string;
  conversation?: {
    id: string;
    tipo: string;
    nome: string | null;
    unidade: string | null;
  };
}

export default function LogsChat() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFilter, setNivelFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [usuarioFilter, setUsuarioFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Fetch all chat messages with conversation info
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-logs'],
    queryFn: async () => {
      // Get all messages
      const { data: msgs, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (msgError) throw msgError;

      // Get all conversations
      const convIds = [...new Set(msgs?.map(m => m.conversation_id) || [])];
      const { data: convs, error: convError } = await supabase
        .from('chat_conversations')
        .select('id, tipo, nome, unidade')
        .in('id', convIds);

      if (convError) throw convError;

      // Map conversations to messages
      const convMap = new Map(convs?.map(c => [c.id, c]) || []);
      
      return (msgs || []).map(msg => ({
        ...msg,
        conversation: convMap.get(msg.conversation_id),
      })) as ChatMessageLog[];
    },
  });

  // Get unique users for filter
  const uniqueUsers = [...new Set(messages.map(m => m.sender_nome))].sort();

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.protocolo_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.conversation?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNivel = nivelFilter === 'todos' || msg.sender_nivel === nivelFilter;
    const matchesTipo = tipoFilter === 'todos' || msg.conversation?.tipo === tipoFilter;
    const matchesUsuario = usuarioFilter === 'todos' || msg.sender_nome === usuarioFilter;
    
    // Date filter
    let matchesDate = true;
    if (dateRange.from || dateRange.to) {
      const msgDate = new Date(msg.created_at);
      if (dateRange.from && dateRange.to) {
        matchesDate = isWithinInterval(msgDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      } else if (dateRange.from) {
        matchesDate = msgDate >= startOfDay(dateRange.from);
      } else if (dateRange.to) {
        matchesDate = msgDate <= endOfDay(dateRange.to);
      }
    }
    
    return matchesSearch && matchesNivel && matchesTipo && matchesDate && matchesUsuario;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const getRoleBadgeVariant = (nivel: string) => {
    switch (nivel) {
      case 'admin': return 'default';
      case 'distribuicao': return 'secondary';
      case 'conferente': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (nivel: string) => {
    switch (nivel) {
      case 'admin': return 'Admin';
      case 'distribuicao': return 'Distribuição';
      case 'conferente': return 'Conferente';
      default: return nivel;
    }
  };

  const getConversationName = (msg: ChatMessageLog) => {
    if (msg.conversation?.tipo === 'grupo') {
      return msg.conversation.nome || `Grupo ${msg.conversation.unidade}`;
    }
    return 'Conversa Individual';
  };

  const handleExport = () => {
    const csvContent = [
      ['Data/Hora', 'Conversa', 'Tipo', 'Remetente', 'Nível', 'Mensagem', 'Protocolo'].join(','),
      ...filteredMessages.map(msg => [
        format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm'),
        getConversationName(msg).replace(/,/g, ';'),
        msg.conversation?.tipo || '-',
        msg.sender_nome.replace(/,/g, ';'),
        msg.sender_nivel,
        msg.content.replace(/,/g, ';').replace(/\n/g, ' '),
        msg.protocolo_numero || '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-chat-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="text-primary" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Logs de Chat</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de todas as mensagens do sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              Filtros
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download size={14} />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Buscar por mensagem, remetente, protocolo..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                className="pl-9"
              />
            </div>
            <Select value={nivelFilter} onValueChange={(v) => { setNivelFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="distribuicao">Distribuição</SelectItem>
                <SelectItem value="conferente">Conferente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupo">Grupo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={usuarioFilter} onValueChange={(v) => { setUsuarioFilter(v); handleFilterChange(); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[240px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Filtrar por data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {(dateRange.from || dateRange.to) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearDateFilter}
                className="h-10 w-10"
                title="Limpar filtro de data"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Mensagens ({filteredMessages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
              <p>Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Data/Hora</TableHead>
                    <TableHead className="w-[180px]">Conversa</TableHead>
                    <TableHead className="w-[150px]">Remetente</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead className="w-[140px]">Protocolo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(msg.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {msg.conversation?.tipo === 'grupo' ? (
                            <Users size={14} className="text-muted-foreground" />
                          ) : (
                            <User size={14} className="text-muted-foreground" />
                          )}
                          <span className="text-sm truncate max-w-[150px]">
                            {getConversationName(msg)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-sm font-medium">{msg.sender_nome}</span>
                          <Badge variant={getRoleBadgeVariant(msg.sender_nivel)} className="text-[10px]">
                            {getRoleLabel(msg.sender_nivel)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm line-clamp-2 max-w-md">{msg.content}</p>
                      </TableCell>
                      <TableCell>
                        {msg.protocolo_numero ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-primary hover:text-primary"
                            onClick={() => navigate(`/protocolos?id=${msg.protocolo_id}`)}
                          >
                            <FileText size={12} />
                            {msg.protocolo_numero}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredMessages.length)} de {filteredMessages.length} mensagens
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
