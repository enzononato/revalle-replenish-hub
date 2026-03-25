import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchInput } from '@/components/ui/SearchInput';
import { TablePagination } from '@/components/ui/TablePagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ClipboardList, 
  User, 
  Calendar, 
  Trash2, 
  MapPin, 
  Loader2,
  PlusCircle,
  Edit,
  Eye,
  LogIn,
  LogOut,
  Send,
  MessageSquare,
  Upload,
  RefreshCw,
  CheckCircle,
  Mail,
  Phone,
  Truck,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  acao: string;
  tabela: string;
  registro_id: string;
  registro_dados: Record<string, unknown> | null;
  usuario_nome: string;
  usuario_role: string | null;
  usuario_unidade: string | null;
  created_at: string;
}

interface MotoristaLoginLog {
  id: string;
  created_at: string;
  identificador: string;
  identificador_tipo: string;
  sucesso: boolean;
  erro: string | null;
  motorista_id: string | null;
  motorista_nome: string | null;
  unidade: string | null;
}

const getAcaoLabel = (acao: string): string => {
  switch (acao) {
    case 'exclusao':
      return 'Exclusão';
    case 'criacao':
      return 'Criação';
    case 'edicao':
      return 'Edição';
    case 'importacao':
      return 'Importação';
    case 'login':
      return 'Login';
    case 'logout':
      return 'Logout';
    case 'visualizacao':
      return 'Visualização';
    case 'envio_mensagem':
      return 'Mensagem Chat';
    case 'alteracao_status':
      return 'Status Alterado';
    case 'upload_foto':
      return 'Upload Foto';
    case 'envio_whatsapp':
      return 'WhatsApp Enviado';
    case 'envio_email':
      return 'E-mail Enviado';
    case 'validacao':
      return 'Validação';
    case 'lancamento':
      return 'Lançamento';
    case 'reenvio':
      return 'Reenvio';
    case 'reabertura':
      return 'Reabertura';
    default:
      return acao.charAt(0).toUpperCase() + acao.slice(1).replace(/_/g, ' ');
  }
};

const getAcaoIcon = (acao: string) => {
  switch (acao) {
    case 'exclusao':
      return Trash2;
    case 'criacao':
      return PlusCircle;
    case 'edicao':
      return Edit;
    case 'importacao':
      return Upload;
    case 'login':
      return LogIn;
    case 'logout':
      return LogOut;
    case 'visualizacao':
      return Eye;
    case 'envio_mensagem':
      return MessageSquare;
    case 'alteracao_status':
      return RefreshCw;
    case 'upload_foto':
      return Upload;
    case 'envio_whatsapp':
      return Phone;
    case 'envio_email':
      return Mail;
    case 'validacao':
    case 'lancamento':
      return CheckCircle;
    case 'reenvio':
      return Send;
    case 'reabertura':
      return RefreshCw;
    default:
      return ClipboardList;
  }
};

const getAcaoColor = (acao: string): string => {
  switch (acao) {
    case 'exclusao':
      return 'bg-destructive/20 text-destructive';
    case 'criacao':
      return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
    case 'edicao':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'importacao':
      return 'bg-violet-500/20 text-violet-700 dark:text-violet-400';
    case 'login':
      return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'logout':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
    case 'visualizacao':
      return 'bg-slate-500/20 text-slate-700 dark:text-slate-400';
    case 'envio_mensagem':
      return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
    case 'alteracao_status':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    case 'upload_foto':
      return 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400';
    case 'envio_whatsapp':
      return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'envio_email':
      return 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400';
    case 'validacao':
    case 'lancamento':
      return 'bg-teal-500/20 text-teal-700 dark:text-teal-400';
    case 'reabertura':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTabelaLabel = (tabela: string): string => {
  switch (tabela) {
    case 'motoristas':
      return 'Motorista';
    case 'pdvs':
      return 'Cliente';
    case 'protocolos':
      return 'Protocolo';
    case 'unidades':
      return 'Unidade';
    case 'gestores':
      return 'Gestor';
    case 'sessao':
      return 'Sessão';
    case 'chat':
      return 'Chat';
    case 'storage':
      return 'Arquivo';
    case 'notificacao':
      return 'Notificação';
    default:
      return tabela.charAt(0).toUpperCase() + tabela.slice(1);
  }
};

const getRoleLabel = (role: string | null): string => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'distribuicao':
      return 'Distribuição';
    case 'conferente':
      return 'Conferente';
    default:
      return role || '-';
  }
};

export default function LogsAuditoria() {
  const [activeTab, setActiveTab] = useState('auditoria');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loginLogs, setLoginLogs] = useState<MotoristaLoginLog[]>([]);
  const [totalLoginLogs, setTotalLoginLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [search, setSearch] = useState('');
  const [loginSearch, setLoginSearch] = useState('');
  const [tabelaFiltro, setTabelaFiltro] = useState<string>('todas');
  const [acaoFiltro, setAcaoFiltro] = useState<string>('todas');
  const [loginStatusFiltro, setLoginStatusFiltro] = useState<string>('todos');
  const [loginTipoFiltro, setLoginTipoFiltro] = useState<string>('todos');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loginCurrentPage, setLoginCurrentPage] = useState(1);
  const [loginPageSize, setLoginPageSize] = useState(20);

  // Server-side paginated fetch for audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Apply server-side filters
        if (tabelaFiltro !== 'todas') {
          query = query.eq('tabela', tabelaFiltro);
        }
        if (acaoFiltro !== 'todas') {
          query = query.eq('acao', acaoFiltro);
        }
        if (search.trim()) {
          query = query.or(`usuario_nome.ilike.%${search}%,registro_id.ilike.%${search}%`);
        }

        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;
        setLogs((data as AuditLog[]) || []);
        setTotalLogs(count ?? 0);
      } catch (error) {
        console.error('Erro ao carregar logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [currentPage, pageSize, tabelaFiltro, acaoFiltro, search]);

  // Server-side paginated fetch for login logs
  useEffect(() => {
    if (activeTab === 'login-motorista') {
      const fetchLoginLogs = async () => {
        setIsLoadingLogin(true);
        try {
          let query = supabase
            .from('motorista_login_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

          if (loginStatusFiltro === 'sucesso') {
            query = query.eq('sucesso', true);
          } else if (loginStatusFiltro === 'falha') {
            query = query.eq('sucesso', false);
          }
          if (loginTipoFiltro !== 'todos') {
            query = query.eq('identificador_tipo', loginTipoFiltro);
          }
          if (loginSearch.trim()) {
            query = query.or(`identificador.ilike.%${loginSearch}%,motorista_nome.ilike.%${loginSearch}%,unidade.ilike.%${loginSearch}%`);
          }

          const from = (loginCurrentPage - 1) * loginPageSize;
          const to = from + loginPageSize - 1;
          query = query.range(from, to);

          const { data, error, count } = await query;

          if (error) throw error;
          setLoginLogs((data as MotoristaLoginLog[]) || []);
          setTotalLoginLogs(count ?? 0);
        } catch (error) {
          console.error('Erro ao carregar logs de login:', error);
        } finally {
          setIsLoadingLogin(false);
        }
      };
      fetchLoginLogs();
    }
  }, [activeTab, loginCurrentPage, loginPageSize, loginStatusFiltro, loginTipoFiltro, loginSearch]);

  // Server-side pagination — data already filtered and paginated
  const totalPages = Math.ceil(totalLogs / pageSize);
  const paginatedLogs = logs;

  const loginTotalPages = Math.ceil(totalLoginLogs / loginPageSize);
  const paginatedLoginLogs = loginLogs;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tabelaFiltro, acaoFiltro, pageSize]);

  useEffect(() => {
    setLoginCurrentPage(1);
  }, [loginSearch, loginStatusFiltro, loginTipoFiltro, loginPageSize]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getRegistroInfo = (log: AuditLog): string => {
    if (!log.registro_dados) return log.registro_id;
    
    const dados = log.registro_dados;
    if (dados.nome) return String(dados.nome);
    if (dados.codigo) return String(dados.codigo);
    return log.registro_id.substring(0, 8) + '...';
  };

  const getProtocoloNumero = (log: AuditLog): string | null => {
    if (log.tabela === 'protocolos' && log.registro_dados) {
      const dados = log.registro_dados;
      if (dados.numero) return String(dados.numero);
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="text-primary" size={24} />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Histórico de ações realizadas no sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="auditoria" className="gap-1.5">
            <ClipboardList size={14} />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="login-motorista" className="gap-1.5">
            <Truck size={14} />
            Login Motoristas
          </TabsTrigger>
        </TabsList>

        {/* Aba Auditoria */}
        <TabsContent value="auditoria" className="space-y-3 mt-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por usuário ou dados..."
              className="flex-1 max-w-md"
            />
            
            <Select value={tabelaFiltro} onValueChange={setTabelaFiltro}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todas as Tabelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Tabelas</SelectItem>
                <SelectItem value="motoristas">Motoristas</SelectItem>
                <SelectItem value="pdvs">Clientes</SelectItem>
                <SelectItem value="protocolos">Protocolos</SelectItem>
                <SelectItem value="unidades">Unidades</SelectItem>
                <SelectItem value="gestores">Gestores</SelectItem>
                <SelectItem value="sessao">Sessão</SelectItem>
              </SelectContent>
            </Select>

            <Select value={acaoFiltro} onValueChange={setAcaoFiltro}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todas as Ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Ações</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="criacao">Criação</SelectItem>
                <SelectItem value="edicao">Edição</SelectItem>
                <SelectItem value="exclusao">Exclusão</SelectItem>
                <SelectItem value="importacao">Importação</SelectItem>
                <SelectItem value="visualizacao">Visualização</SelectItem>
                <SelectItem value="envio_mensagem">Mensagem Chat</SelectItem>
                <SelectItem value="alteracao_status">Status Alterado</SelectItem>
                <SelectItem value="upload_foto">Upload Foto</SelectItem>
                <SelectItem value="envio_whatsapp">WhatsApp</SelectItem>
                <SelectItem value="envio_email">E-mail</SelectItem>
                <SelectItem value="validacao">Validação</SelectItem>
                <SelectItem value="lancamento">Lançamento</SelectItem>
                <SelectItem value="reabertura">Reabertura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-md animate-fade-in overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left p-2.5 text-[11px] rounded-tl-lg">Data/Hora</th>
                      <th className="text-left p-2.5 text-[11px]">Ação</th>
                      <th className="text-left p-2.5 text-[11px]">Tabela</th>
                      <th className="text-left p-2.5 text-[11px]">Protocolo</th>
                      <th className="text-left p-2.5 text-[11px]">Registro</th>
                      <th className="text-left p-2.5 text-[11px]">Usuário</th>
                      <th className="text-left p-2.5 text-[11px]">Perfil</th>
                      <th className="text-left p-2.5 text-[11px] rounded-tr-lg">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                            <Calendar size={12} />
                            {formatDate(log.created_at)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {(() => {
                            const Icon = getAcaoIcon(log.acao);
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getAcaoColor(log.acao)}`}>
                                <Icon size={10} />
                                {getAcaoLabel(log.acao)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 text-xs font-medium">
                          {getTabelaLabel(log.tabela)}
                        </td>
                        <td className="p-2.5 text-xs">
                          {(() => {
                            const numero = getProtocoloNumero(log);
                            if (numero) {
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-medium text-[10px]">
                                  <ClipboardList size={10} />
                                  {numero.replace('PROTOC-', '')}
                                </span>
                              );
                            }
                            return <span className="text-muted-foreground">-</span>;
                          })()}
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground">
                          {getRegistroInfo(log)}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <User size={12} className="text-muted-foreground" />
                            {log.usuario_nome}
                          </span>
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground">
                          {getRoleLabel(log.usuario_role)}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                            <MapPin size={12} />
                            {log.usuario_unidade || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {paginatedLogs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum log encontrado
                  </div>
                )}

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalLogs}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* Aba Login Motoristas */}
        <TabsContent value="login-motorista" className="space-y-3 mt-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              value={loginSearch}
              onChange={setLoginSearch}
              placeholder="Buscar por CPF, código, nome ou erro..."
              className="flex-1 max-w-md"
            />
            
            <Select value={loginStatusFiltro} onValueChange={setLoginStatusFiltro}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sucesso">Sucesso</SelectItem>
                <SelectItem value="falha">Falha</SelectItem>
              </SelectContent>
            </Select>

            <Select value={loginTipoFiltro} onValueChange={setLoginTipoFiltro}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="codigo">Código</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-md animate-fade-in overflow-x-auto">
            {isLoadingLogin ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-left p-2.5 text-[11px] rounded-tl-lg">Data/Hora</th>
                      <th className="text-left p-2.5 text-[11px]">Status</th>
                      <th className="text-left p-2.5 text-[11px]">Identificador</th>
                      <th className="text-left p-2.5 text-[11px]">Tipo</th>
                      <th className="text-left p-2.5 text-[11px]">Motorista</th>
                      <th className="text-left p-2.5 text-[11px]">Unidade</th>
                      <th className="text-left p-2.5 text-[11px] rounded-tr-lg">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLoginLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                            <Calendar size={12} />
                            {formatDate(log.created_at)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {log.sucesso ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle size={10} />
                              Sucesso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive/20 text-destructive">
                              <XCircle size={10} />
                              Falha
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-xs font-mono font-medium">
                          {log.identificador}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            log.identificador_tipo === 'cpf' 
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' 
                              : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          }`}>
                            {log.identificador_tipo === 'cpf' ? 'CPF' : 'Código'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {log.motorista_nome ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <User size={12} className="text-muted-foreground" />
                              {log.motorista_nome}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {log.unidade ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                              <MapPin size={12} />
                              {log.unidade}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {log.erro ? (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive">
                              <ShieldAlert size={12} />
                              {log.erro}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {paginatedLoginLogs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum log de login encontrado
                  </div>
                )}

                <TablePagination
                  currentPage={loginCurrentPage}
                  totalPages={loginTotalPages}
                  pageSize={loginPageSize}
                  totalItems={totalLoginLogs}
                  onPageChange={setLoginCurrentPage}
                  onPageSizeChange={setLoginPageSize}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
