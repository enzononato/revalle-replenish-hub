import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchInput } from '@/components/ui/SearchInput';
import { TablePagination } from '@/components/ui/TablePagination';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, User, Calendar, Trash2, MapPin, Loader2 } from 'lucide-react';
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

const getAcaoLabel = (acao: string): string => {
  switch (acao) {
    case 'exclusao':
      return 'Exclusão';
    case 'criacao':
      return 'Criação';
    case 'edicao':
      return 'Edição';
    default:
      return acao;
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
    default:
      return tabela;
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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabelaFiltro, setTabelaFiltro] = useState<string>('todas');
  const [acaoFiltro, setAcaoFiltro] = useState<string>('todas');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs((data as AuditLog[]) || []);
      } catch (error) {
        console.error('Erro ao carregar logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.usuario_nome.toLowerCase().includes(search.toLowerCase()) ||
      (log.registro_dados && JSON.stringify(log.registro_dados).toLowerCase().includes(search.toLowerCase()));
    
    const matchesTabela = tabelaFiltro === 'todas' || log.tabela === tabelaFiltro;
    const matchesAcao = acaoFiltro === 'todas' || log.acao === acaoFiltro;

    return matchesSearch && matchesTabela && matchesAcao;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tabelaFiltro, acaoFiltro, pageSize]);

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

      {/* Search and Filters */}
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
          </SelectContent>
        </Select>

        <Select value={acaoFiltro} onValueChange={setAcaoFiltro}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Todas as Ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Ações</SelectItem>
            <SelectItem value="exclusao">Exclusão</SelectItem>
            <SelectItem value="criacao">Criação</SelectItem>
            <SelectItem value="edicao">Edição</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        log.acao === 'exclusao' 
                          ? 'bg-destructive/20 text-destructive' 
                          : log.acao === 'criacao'
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                          : 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                      }`}>
                        <Trash2 size={10} />
                        {getAcaoLabel(log.acao)}
                      </span>
                    </td>
                    <td className="p-2.5 text-xs font-medium">
                      {getTabelaLabel(log.tabela)}
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
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum log encontrado
              </div>
            )}

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredLogs.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
