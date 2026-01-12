import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Protocolo, ObservacaoLog } from '@/types';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { supabase } from '@/integrations/supabase/client';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtocoloDetails } from '@/components/ProtocoloDetails';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePagination } from '@/components/ui/TablePagination';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, CheckCircle, XCircle, Send, Filter, X, MoreVertical, Phone, Download, Plus, EyeOff, Trash2, FileText, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInDays, parseISO, format, isAfter, isBefore, parse, isToday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import CreateProtocoloModal from '@/components/CreateProtocoloModal';

// Função para extrair data de encerramento do log
const getDataEncerramentoFromLog = (observacoesLog?: ObservacaoLog[]): string | null => {
  const logEncerramento = observacoesLog?.find(l => l.acao === 'Encerrou o protocolo');
  return logEncerramento?.data || null;
};

const calcularSlaDias = (dataStr: string, status?: string, observacoesLog?: ObservacaoLog[]): number => {
  // data vem no formato DD/MM/YYYY - consistente com o backend
  const dataProtocolo = parse(dataStr, 'dd/MM/yyyy', new Date());
  
  // Se encerrado, calcular até a data de encerramento
  if (status === 'encerrado') {
    const dataEncerramentoStr = getDataEncerramentoFromLog(observacoesLog);
    if (dataEncerramentoStr) {
      const dataEncerramento = parse(dataEncerramentoStr, 'dd/MM/yyyy', new Date());
      return differenceInDays(dataEncerramento, dataProtocolo);
    }
  }
  
  const hoje = new Date();
  return differenceInDays(hoje, dataProtocolo);
};

const getSlaColor = (dias: number): string => {
  if (dias >= 15) return 'text-foreground bg-red-300 dark:bg-red-500/30 dark:text-red-300';
  if (dias > 7) return 'text-foreground bg-amber-200 dark:bg-amber-500/30 dark:text-amber-300';
  return 'text-foreground bg-emerald-300 dark:bg-emerald-500/30 dark:text-emerald-300';
};

// Função para verificar se protocolo foi reaberto
const foiReaberto = (observacoesLog?: ObservacaoLog[]): boolean => {
  return !!observacoesLog?.some(log => log.acao === 'Reabriu o protocolo');
};

export default function Protocolos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { canValidate, canLaunch, isAdmin, isDistribuicao, isConferente, user } = useAuth();
  const { protocolos, addProtocolo, updateProtocolo, deleteProtocolo, isLoading } = useProtocolos();
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('aberto');
  const [dataInicialFilter, setDataInicialFilter] = useState('');
  const [dataFinalFilter, setDataFinalFilter] = useState('');
  const [lancadoFilter, setLancadoFilter] = useState<string>('todos');
  const [validadoFilter, setValidadoFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodoFilter, setPeriodoFilter] = useState<string>('todos');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Processar parâmetros da URL
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const periodoParam = searchParams.get('periodo');
    const tipoParam = searchParams.get('tipo');
    
    if (statusParam) {
      setActiveTab(statusParam);
    }
    
    if (periodoParam) {
      setPeriodoFilter(periodoParam);
    }
    
    if (tipoParam) {
      setTipoFilter(tipoParam);
      setShowFilters(true);
    }
  }, [searchParams]);

  // Abrir protocolo por ID quando protocolos estiverem carregados (apenas uma vez)
  useEffect(() => {
    const idParam = searchParams.get('id');
    
    if (idParam && protocolos.length > 0 && !selectedProtocolo) {
      const protocolo = protocolos.find(p => p.id === idParam);
      if (protocolo) {
        const index = protocolos.findIndex(p => p.id === idParam);
        setSelectedProtocolo(protocolo);
        setSelectedIndex(index);
        // Limpar o parâmetro id da URL após abrir, para evitar reabertura ao fechar
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('id');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, protocolos, selectedProtocolo, setSearchParams]);

  const filteredProtocolos = protocolos
    .filter(p => {
      // Não mostrar protocolos ocultos (exceto para admin que os ocultou)
      if (p.oculto) return false;
      
      // Filtrar por unidade do usuário (exceto para admin)
      if (!isAdmin && p.unidadeNome !== user?.unidade) return false;
      
      const searchMatch = 
        p.numero.toLowerCase().includes(search.toLowerCase()) ||
        p.motorista.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.contatoWhatsapp || '').includes(search) ||
        (p.motorista.whatsapp || '').includes(search) ||
        p.codigoPdv?.includes(search) ||
        p.mapa?.includes(search);
      
      const statusMatch = activeTab === 'todos' || p.status === activeTab;
      
      // Filtro de período (hoje)
      let periodoMatch = true;
      if (periodoFilter === 'hoje') {
        try {
          periodoMatch = isToday(parseISO(p.createdAt));
        } catch {
          periodoMatch = false;
        }
      }
      
      // Filtro de data inicial
      let dataInicialMatch = true;
      if (dataInicialFilter) {
        const dataProtocolo = parse(p.data, 'dd/MM/yyyy', new Date());
        const dataInicial = parseISO(dataInicialFilter);
        dataInicialMatch = !isBefore(dataProtocolo, dataInicial);
      }
      
      // Filtro de data final
      let dataFinalMatch = true;
      if (dataFinalFilter) {
        const dataProtocolo = parse(p.data, 'dd/MM/yyyy', new Date());
        const dataFinal = parseISO(dataFinalFilter);
        dataFinalMatch = !isAfter(dataProtocolo, dataFinal);
      }
      
      // Filtro de lançado
      const lancadoMatch = lancadoFilter === 'todos' || 
        (lancadoFilter === 'sim' && p.lancado) || 
        (lancadoFilter === 'nao' && !p.lancado);
      
      // Filtro de validado
      const validadoMatch = validadoFilter === 'todos' || 
        (validadoFilter === 'sim' && p.validacao) || 
        (validadoFilter === 'nao' && !p.validacao);
      
      // Filtro de tipo
      const tipoMatch = tipoFilter === 'todos' || p.tipoReposicao === tipoFilter;
      
      return searchMatch && statusMatch && periodoMatch && dataInicialMatch && dataFinalMatch && lancadoMatch && validadoMatch && tipoMatch;
    })
    // Ordenar por SLA: mais antigos primeiro (maior SLA = topo)
    // Para protocolos com mesmo SLA, ordenar por número (mais antigo primeiro)
    .sort((a, b) => {
      const slaA = calcularSlaDias(a.data, a.status, a.observacoesLog);
      const slaB = calcularSlaDias(b.data, b.status, b.observacoesLog);
      if (slaB !== slaA) return slaB - slaA;
      // Ordenação secundária: número do protocolo (mais antigo primeiro)
      return a.numero.localeCompare(b.numero);
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProtocolos.length / pageSize);
  const paginatedProtocolos = filteredProtocolos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, dataInicialFilter, dataFinalFilter, lancadoFilter, validadoFilter, tipoFilter, pageSize]);

  // Envio WhatsApp é feito via webhook n8n

  const criarLogEntry = (acao: string, texto: string): ObservacaoLog => ({
    id: Date.now().toString(),
    usuarioNome: user?.nome || 'Sistema',
    usuarioId: user?.id || '',
    data: format(new Date(), 'dd/MM/yyyy'),
    hora: format(new Date(), 'HH:mm'),
    acao,
    texto
  });

  const handleToggleLancado = (id: string) => {
    if (!canLaunch) {
      toast.error('Apenas Distribuição ou Admin pode lançar protocolos!');
      return;
    }
    const protocolo = protocolos.find(p => p.id === id);
    if (!protocolo?.validacao) {
      toast.error('A validação do conferente é obrigatória antes do lançamento!');
      return;
    }
    
    if (protocolo) {
      const newLancado = !protocolo.lancado;
      const newStatus = (protocolo.validacao && newLancado) ? 'em_andamento' as const : 'aberto' as const;
      const logEntry = criarLogEntry(
        newLancado ? 'Marcou como lançado' : 'Removeu lançamento',
        newLancado ? 'Protocolo marcado como lançado' : 'Lançamento removido do protocolo'
      );
      updateProtocolo({ 
        ...protocolo, 
        lancado: newLancado, 
        status: protocolo.status === 'encerrado' ? protocolo.status : newStatus,
        observacoesLog: [...(protocolo.observacoesLog || []), logEntry]
      });
    }
    toast.success('Status de lançamento atualizado!');
  };

  const handleToggleValidacao = (id: string) => {
    if (!canValidate) {
      toast.error('Apenas Conferente ou Admin pode validar protocolos!');
      return;
    }
    const protocolo = protocolos.find(p => p.id === id);
    if (protocolo) {
      const newValidacao = !protocolo.validacao;
      const newStatus = (newValidacao && protocolo.lancado) ? 'em_andamento' as const : 'aberto' as const;
      const logEntry = criarLogEntry(
        newValidacao ? 'Confirmou validação' : 'Removeu validação',
        newValidacao ? 'Protocolo validado' : 'Validação removida do protocolo'
      );
      updateProtocolo({ 
        ...protocolo, 
        validacao: newValidacao, 
        status: protocolo.status === 'encerrado' ? protocolo.status : newStatus,
        observacoesLog: [...(protocolo.observacoesLog || []), logEntry]
      });
    }
    toast.success('Validação atualizada!');
  };

  const handleOcultar = (id: string) => {
    const protocolo = protocolos.find(p => p.id === id);
    if (protocolo) {
      const logEntry = criarLogEntry('Ocultou protocolo', 'Protocolo foi ocultado');
      updateProtocolo({ 
        ...protocolo, 
        oculto: true,
        observacoesLog: [...(protocolo.observacoesLog || []), logEntry]
      });
    }
    toast.success('Protocolo ocultado!');
  };

  const handleExcluir = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este protocolo?')) {
      deleteProtocolo(id);
      toast.success('Protocolo excluído!');
    }
  };

  const handleUpdateProtocolo = (protocoloAtualizado: Protocolo) => {
    updateProtocolo(protocoloAtualizado);
    setSelectedProtocolo(protocoloAtualizado);
  };

  const handleCreateProtocolo = (novoProtocolo: Protocolo) => {
    addProtocolo(novoProtocolo);
  };

  const handleNavigateProtocolo = (index: number) => {
    if (index >= 0 && index < filteredProtocolos.length) {
      setSelectedProtocolo(filteredProtocolos[index]);
      setSelectedIndex(index);
    }
  };

  const handleDownloadAll = () => {
    // Cabeçalho do CSV
    const headers = [
      'Protocolo',
      'Data',
      'Hora',
      'Status',
      'SLA (dias)',
      'Motorista Código',
      'Motorista Nome',
      'Motorista WhatsApp',
      'Motorista Email',
      'Código PDV',
      'MAPA',
      'Nota Fiscal',
      'Unidade',
      'Observação',
      'Validado',
      'Lançado',
      'Produtos'
    ];

    // Função para escapar valores CSV
    const escapeCSV = (value: string | null | undefined) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Linhas de dados
    const rows = filteredProtocolos.map(protocolo => {
      const produtos = protocolo.produtos?.map(p => 
        `${p.codigo} - ${p.nome} (${p.quantidade} ${p.unidade})`
      ).join('; ') || '';

      const slaDias = calcularSlaDias(protocolo.data, protocolo.status, protocolo.observacoesLog);

      return [
        protocolo.numero,
        protocolo.data,
        protocolo.hora,
        protocolo.status,
        slaDias.toString(),
        protocolo.motorista.codigo,
        protocolo.motorista.nome,
        protocolo.motorista.whatsapp || '',
        protocolo.motorista.email || '',
        protocolo.codigoPdv || '',
        protocolo.mapa || '',
        protocolo.notaFiscal || '',
        protocolo.unidadeNome || '',
        protocolo.observacaoGeral || '',
        protocolo.validacao ? 'Sim' : 'Não',
        protocolo.lancado ? 'Sim' : 'Não',
        produtos
      ].map(escapeCSV).join(',');
    });

    // Montar CSV com BOM para suporte a caracteres especiais no Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protocolos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filteredProtocolos.length} protocolo(s) exportado(s)!`);
  };

  const clearFilters = () => {
    setActiveTab('aberto');
    setDataInicialFilter('');
    setDataFinalFilter('');
    setLancadoFilter('todos');
    setValidadoFilter('todos');
    setTipoFilter('todos');
  };

  const hasActiveFilters = activeTab === 'todos' || dataInicialFilter || dataFinalFilter || lancadoFilter !== 'todos' || validadoFilter !== 'todos' || tipoFilter !== 'todos';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="text-primary" size={24} />
          Protocolos
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie os protocolos de reposição</p>
      </div>

      {/* Smart Search */}
      <div className="flex flex-col lg:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por Código PDV, Motorista, WhatsApp ou MAPA..."
          className="flex-1"
        />
        <div className="flex gap-2">
          {/* Botão Criar Protocolo - Apenas Admin */}
          {isAdmin && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="lg:w-auto"
            >
              <Plus size={16} className="mr-1.5" />
              Criar Protocolo
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadAll}
            disabled={filteredProtocolos.length === 0}
            className="lg:w-auto"
          >
            <Download size={16} className="mr-1.5" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:w-auto"
          >
            <Filter size={16} className="mr-1.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status Tabs - SEM "Todos" */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent gap-1.5 h-auto p-0">
          <TabsTrigger 
            value="aberto" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent hover:bg-muted/50 rounded-xl px-2.5 py-1 text-xs transition-colors"
          >
            Abertos
          </TabsTrigger>
          <TabsTrigger 
            value="em_andamento" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent hover:bg-muted/50 rounded-xl px-2.5 py-1 text-xs transition-colors"
          >
            Em andamento
          </TabsTrigger>
          <TabsTrigger 
            value="encerrado" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent hover:bg-muted/50 rounded-xl px-2.5 py-1 text-xs transition-colors"
          >
            Encerrados
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card rounded-xl p-4 shadow-md animate-scale-in">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[110px]">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Abertos</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="encerrado">Encerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 min-w-[130px]">
              <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
              <Input
                type="date"
                value={dataInicialFilter}
                onChange={(e) => setDataInicialFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            
            <div className="space-y-1 min-w-[130px]">
              <label className="text-xs font-medium text-muted-foreground">Data Final</label>
              <Input
                type="date"
                value={dataFinalFilter}
                onChange={(e) => setDataFinalFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            
            <div className="space-y-1 min-w-[110px]">
              <label className="text-xs font-medium text-muted-foreground">Lançado</label>
              <Select value={lancadoFilter} onValueChange={setLancadoFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 min-w-[110px]">
              <label className="text-xs font-medium text-muted-foreground">Validado</label>
              <Select value={validadoFilter} onValueChange={setValidadoFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 min-w-[110px]">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="INVERSAO">Inversão</SelectItem>
                  <SelectItem value="AVARIA">Avaria</SelectItem>
                  <SelectItem value="FALTA">Falta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive h-8">
                <X size={14} className="mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Protocols count */}
      <p className="text-[12px] font-medium text-muted-foreground">
        {isLoading ? <Skeleton className="h-4 w-40 inline-block" /> : `${filteredProtocolos.length} protocolo(s) encontrado(s)`}
      </p>

      {/* Table */}
      <div className="bg-card rounded-xl p-4 shadow-md animate-fade-in overflow-x-auto border border-border/50">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Data/Hora</th>
              <th className="text-left p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Protocolo</th>
              <th className="text-left p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Tipo</th>
              <th className="text-left p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Motorista</th>
              <th className="text-left p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">WhatsApp</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">SLA</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Validação</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Lançado</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Msg. Envio</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">Msg. Encerramento</th>
              <th className="text-center p-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton rows while loading
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={index} className={cn("border-b-2 border-border", index % 2 === 0 ? 'bg-card' : 'bg-muted/30')}>
                  <td className="p-2.5 border-r border-border">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <Skeleton className="h-5 w-5 mx-auto rounded-full" />
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <Skeleton className="h-5 w-5 mx-auto rounded-full" />
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <Skeleton className="h-5 w-5 mx-auto rounded-full" />
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <Skeleton className="h-5 w-5 mx-auto rounded-full" />
                  </td>
                  <td className="p-2.5 text-center">
                    <Skeleton className="h-7 w-7 mx-auto rounded-md" />
                  </td>
                </tr>
              ))
            ) : paginatedProtocolos.map((protocolo, index) => {
              const globalIndex = (currentPage - 1) * pageSize + index;
              return (
                <tr 
                  key={protocolo.id} 
                  className={cn(
                    "border-b-2 border-border transition-all duration-200",
                    index % 2 === 0 ? 'bg-card' : 'bg-muted/30',
                    selectedIndex === globalIndex && 'bg-primary/10 border-l-4 border-l-primary',
                    "hover:bg-primary/5 hover:shadow-sm"
                  )}
                >
                  <td className="p-2.5 border-r border-border">
                    <div className="text-[12px] text-foreground">
                      <p className="font-bold">{protocolo.data}</p>
                      <p className="font-bold">{protocolo.hora}</p>
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground font-medium text-[12px]">
                        {protocolo.numero}
                      </span>
                      {foiReaberto(protocolo.observacoesLog) && (
                        <span 
                          className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full w-fit"
                          title="Protocolo reaberto"
                        >
                          <RefreshCw size={10} />
                          Reaberto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      protocolo.tipoReposicao === 'Inversão' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                        : protocolo.tipoReposicao === 'Avaria' 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' 
                          : protocolo.tipoReposicao === 'Falta' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' 
                            : 'bg-muted text-muted-foreground'
                    }`}>
                      {protocolo.tipoReposicao || '-'}
                    </span>
                  </td>
                  <td className="p-2.5 border-r border-border text-[12px] text-foreground font-bold">
                    {protocolo.motorista.nome}
                  </td>
                  <td className="p-2.5 border-r border-border">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[12px] flex items-center gap-1">
                      <Phone size={12} />
                      {protocolo.contatoWhatsapp || '-'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    {(() => {
                      const dias = calcularSlaDias(protocolo.data, protocolo.status, protocolo.observacoesLog);
                      
                      if (protocolo.status === 'encerrado') {
                        return (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
                            ✓ {dias} {dias === 1 ? 'dia' : 'dias'}
                          </span>
                        );
                      }
                      
                      return (
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getSlaColor(dias)}`}>
                          {dias} {dias === 1 ? 'dia' : 'dias'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <button
                      onClick={() => handleToggleValidacao(protocolo.id)}
                      className="inline-flex"
                      title="Apenas Conferente pode validar"
                    >
                      {protocolo.validacao ? (
                        <CheckCircle className="text-green-500" size={18} />
                      ) : (
                        <XCircle className="text-red-400" size={18} />
                      )}
                    </button>
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    <button
                      onClick={() => handleToggleLancado(protocolo.id)}
                      className={`inline-flex ${!protocolo.validacao ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!protocolo.validacao}
                      title={!protocolo.validacao ? 'Aguardando validação do conferente' : 'Apenas Distribuição pode lançar'}
                    >
                      {protocolo.lancado ? (
                        <CheckCircle className="text-green-500" size={18} />
                      ) : (
                        <XCircle className="text-red-400" size={18} />
                      )}
                    </button>
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    {protocolo.statusEnvio === 'sucesso' ? (
                      <CheckCircle className="text-green-500 mx-auto" size={18} />
                    ) : protocolo.statusEnvio === 'erro' ? (
                      <XCircle className="text-red-500 mx-auto" size={18} />
                    ) : (
                      <Clock className="text-yellow-500 mx-auto" size={18} />
                    )}
                  </td>
                  <td className="p-2.5 text-center border-r border-border">
                    {protocolo.statusEncerramento === 'sucesso' ? (
                      <CheckCircle className="text-green-500 mx-auto" size={18} />
                    ) : protocolo.statusEncerramento === 'erro' ? (
                      <XCircle className="text-red-500 mx-auto" size={18} />
                    ) : (
                      <Clock className="text-yellow-500 mx-auto" size={18} />
                    )}
                  </td>
                  <td className="p-2.5">
                    <div className="flex justify-center items-center gap-1">
                      {/* Botão olho verde - sempre visível */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-emerald-500 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 w-7 p-0"
                        onClick={() => {
                          setSelectedProtocolo(protocolo);
                          setSelectedIndex(globalIndex);
                        }}
                      >
                        <Eye size={14} />
                      </Button>
                      
                      {/* Menu dropdown apenas para admin */}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem onClick={() => handleOcultar(protocolo.id)} className="text-xs">
                              <EyeOff size={14} className="mr-1.5" />
                              Ocultar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExcluir(protocolo.id)}
                              className="text-destructive focus:text-destructive text-xs"
                            >
                              <Trash2 size={14} className="mr-1.5" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {!isLoading && filteredProtocolos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum protocolo encontrado
          </div>
        )}

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredProtocolos.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Detail Dialog */}
      <ProtocoloDetails
        protocolo={selectedProtocolo}
        protocolos={filteredProtocolos}
        currentIndex={selectedIndex ?? 0}
        open={!!selectedProtocolo}
        onClose={() => {
          setSelectedProtocolo(null);
          setSelectedIndex(null);
        }}
        onNavigate={handleNavigateProtocolo}
        onUpdateProtocolo={handleUpdateProtocolo}
        user={user}
        canValidate={canValidate}
        canEditMotorista={isAdmin || isDistribuicao}
        isConferente={isConferente}
        isAdmin={isAdmin}
        isDistribuicao={isDistribuicao}
      />

      {/* Create Protocol Modal */}
      <CreateProtocoloModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateProtocolo={handleCreateProtocolo}
      />
    </div>
  );
}