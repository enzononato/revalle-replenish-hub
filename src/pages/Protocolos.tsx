import { useState, useEffect } from 'react';
import { Protocolo, ObservacaoLog } from '@/types';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Eye, CheckCircle, XCircle, Send, Filter, X, MoreVertical, ChevronRight, Phone, Download, Plus, EyeOff, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { differenceInDays, parseISO, format, isAfter, isBefore, parse } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import CreateProtocoloModal from '@/components/CreateProtocoloModal';

const calcularSlaDias = (createdAt: string): number => {
  const dataProtocolo = parseISO(createdAt);
  const hoje = new Date();
  return differenceInDays(hoje, dataProtocolo);
};

const getSlaColor = (dias: number): string => {
  if (dias >= 15) return 'text-[#1F2937] bg-[#FCA5A5]';
  if (dias > 7) return 'text-[#1F2937] bg-[#FDE68A]';
  return 'text-[#1F2937] bg-[#86EFAC]';
};

export default function Protocolos() {
  const { canValidate, canLaunch, isAdmin, isDistribuicao, isConferente, user } = useAuth();
  const { protocolos, addProtocolo, updateProtocolo, deleteProtocolo } = useProtocolos();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [dataInicialFilter, setDataInicialFilter] = useState('');
  const [dataFinalFilter, setDataFinalFilter] = useState('');
  const [lancadoFilter, setLancadoFilter] = useState<string>('todos');
  const [validadoFilter, setValidadoFilter] = useState<string>('todos');
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredProtocolos = protocolos
    .filter(p => {
      // Não mostrar protocolos ocultos (exceto para admin que os ocultou)
      if (p.oculto) return false;
      
      const searchMatch = 
        p.numero.toLowerCase().includes(search.toLowerCase()) ||
        p.motorista.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.motorista.whatsapp || '').includes(search) ||
        p.codigoPdv?.includes(search) ||
        p.mapa?.includes(search);
      
      const statusMatch = activeTab === 'todos' || p.status === activeTab;
      
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
      
      return searchMatch && statusMatch && dataInicialMatch && dataFinalMatch && lancadoMatch && validadoMatch;
    })
    // Ordenar por SLA: mais antigos primeiro (maior SLA = topo)
    .sort((a, b) => {
      const slaA = calcularSlaDias(a.createdAt);
      const slaB = calcularSlaDias(b.createdAt);
      return slaB - slaA;
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
  }, [search, activeTab, dataInicialFilter, dataFinalFilter, lancadoFilter, validadoFilter, pageSize]);

  const handleEnviarLancar = (id: string) => {
    const protocolo = protocolos.find(p => p.id === id);
    if (protocolo) {
      updateProtocolo({ ...protocolo, enviadoLancar: true });
    }
    toast.success('Notificação de lançamento enviada!');
  };

  const handleEnviarEncerrar = (id: string) => {
    const protocolo = protocolos.find(p => p.id === id);
    if (protocolo) {
      updateProtocolo({ ...protocolo, enviadoEncerrar: true, status: 'encerrado' });
    }
    toast.success('Protocolo encerrado com sucesso!');
  };

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
    const content = filteredProtocolos.map(protocolo => `
================================================================================
PROTOCOLO: ${protocolo.numero}
================================================================================
DATA: ${protocolo.data} | HORA: ${protocolo.hora} | STATUS: ${protocolo.status.toUpperCase()}

MOTORISTA
---------
Nome: ${protocolo.motorista.nome}
Código: ${protocolo.motorista.codigo}
WhatsApp: ${protocolo.motorista.whatsapp || '-'}
E-mail: ${protocolo.motorista.email || '-'}

CLIENTE
-------
Código PDV: ${protocolo.codigoPdv || '-'}
MAPA: ${protocolo.mapa || '-'}
Nota Fiscal: ${protocolo.notaFiscal || '-'}

OBSERVAÇÃO
----------
${protocolo.observacaoGeral || '-'}

PRODUTOS
--------
${protocolo.produtos?.map(p => 
  `${p.codigo} | ${p.nome} | ${p.unidade} | Qtd: ${p.quantidade} | Val: ${p.validade}`
).join('\n') || 'Nenhum produto'}

STATUS: Validado: ${protocolo.validacao ? 'Sim' : 'Não'} | Lançado: ${protocolo.lancado ? 'Sim' : 'Não'}
`).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protocolos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filteredProtocolos.length} protocolo(s) exportado(s)!`);
  };

  const clearFilters = () => {
    setDataInicialFilter('');
    setDataFinalFilter('');
    setLancadoFilter('todos');
    setValidadoFilter('todos');
  };

  const hasActiveFilters = dataInicialFilter || dataFinalFilter || lancadoFilter !== 'todos' || validadoFilter !== 'todos';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
          <FileText className="text-primary" size={32} />
          Protocolos
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie os protocolos de reposição</p>
      </div>

      {/* Smart Search */}
      <div className="flex flex-col lg:flex-row gap-4">
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
              className="lg:w-auto"
            >
              <Plus size={18} className="mr-2" />
              Criar Protocolo
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleDownloadAll}
            disabled={filteredProtocolos.length === 0}
            className="lg:w-auto"
          >
            <Download size={18} className="mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="lg:w-auto"
          >
            <Filter size={18} className="mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                !
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Status Tabs - SEM contagem */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent gap-2 h-auto p-0">
          <TabsTrigger 
            value="todos" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger 
            value="aberto" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Abertos
          </TabsTrigger>
          <TabsTrigger 
            value="em_andamento" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Em andamento
          </TabsTrigger>
          <TabsTrigger 
            value="encerrado" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Encerrados
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card rounded-xl p-6 shadow-md animate-scale-in">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Data Inicial</label>
              <Input
                type="date"
                value={dataInicialFilter}
                onChange={(e) => setDataInicialFilter(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 min-w-[150px]">
              <label className="text-sm font-medium text-muted-foreground">Data Final</label>
              <Input
                type="date"
                value={dataFinalFilter}
                onChange={(e) => setDataFinalFilter(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 min-w-[130px]">
              <label className="text-sm font-medium text-muted-foreground">Lançado</label>
              <Select value={lancadoFilter} onValueChange={setLancadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 min-w-[130px]">
              <label className="text-sm font-medium text-muted-foreground">Validado</label>
              <Select value={validadoFilter} onValueChange={setValidadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-destructive">
                <X size={16} className="mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Protocols count */}
      <p className="text-[13px] font-medium text-[#475569]">
        {filteredProtocolos.length} protocolo(s) encontrado(s)
      </p>

      {/* Table */}
      <div className="bg-card rounded-xl p-6 shadow-md animate-fade-in overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="text-left p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Data/Hora</th>
              <th className="text-left p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Protocolo</th>
              <th className="text-left p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Motorista</th>
              <th className="text-left p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">WhatsApp</th>
              <th className="text-center p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">SLA</th>
              <th className="text-center p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Validação</th>
              <th className="text-center p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Lançado</th>
              <th className="text-center p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Env. Lançar</th>
              <th className="text-center p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Env. Encerrar</th>
              <th className="text-right p-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProtocolos.map((protocolo, index) => {
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
                  <td className="p-4 border-r border-[#E5E7EB]">
                    <div className="text-[14px] text-[#1F2937]">
                      <p className="font-bold">{protocolo.data}</p>
                      <p className="font-bold">{protocolo.hora}</p>
                    </div>
                  </td>
                  <td className="p-4 border-r border-[#E5E7EB]">
                    <span className="text-[#2563EB] font-medium hover:underline cursor-pointer">
                      {protocolo.numero}
                    </span>
                  </td>
                  <td className="p-4 border-r border-[#E5E7EB] text-[14px] text-[#1F2937] font-bold">
                    {protocolo.motorista.nome}
                  </td>
                  <td className="p-4 border-r border-[#E5E7EB]">
                    <span className="text-[#16A34A] font-medium flex items-center gap-1">
                      <Phone size={14} />
                      {protocolo.motorista.whatsapp || '-'}
                    </span>
                  </td>
                  <td className="p-4 text-center border-r border-[#E5E7EB]">
                    {(() => {
                      const dias = calcularSlaDias(protocolo.createdAt);
                      return (
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${getSlaColor(dias)}`}>
                          {dias} {dias === 1 ? 'dia' : 'dias'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-center border-r border-[#E5E7EB]">
                    <button
                      onClick={() => handleToggleValidacao(protocolo.id)}
                      className="inline-flex"
                      title="Apenas Conferente pode validar"
                    >
                      {protocolo.validacao ? (
                        <CheckCircle className="text-green-500" size={22} />
                      ) : (
                        <XCircle className="text-red-400" size={22} />
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-center border-r border-[#E5E7EB]">
                    <button
                      onClick={() => handleToggleLancado(protocolo.id)}
                      className={`inline-flex ${!protocolo.validacao ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!protocolo.validacao}
                      title={!protocolo.validacao ? 'Aguardando validação do conferente' : 'Apenas Distribuição pode lançar'}
                    >
                      {protocolo.lancado ? (
                        <CheckCircle className="text-green-500" size={22} />
                      ) : (
                        <XCircle className="text-red-400" size={22} />
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-center border-r border-[#E5E7EB]">
                    {protocolo.enviadoLancar ? (
                      <CheckCircle className="text-green-500 mx-auto" size={22} />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnviarLancar(protocolo.id)}
                        className="text-info hover:text-info/80"
                      >
                        <Send size={16} />
                      </Button>
                    )}
                  </td>
                  <td className="p-4 text-center border-r border-[#E5E7EB]">
                    {protocolo.enviadoEncerrar ? (
                      <CheckCircle className="text-green-500 mx-auto" size={22} />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnviarEncerrar(protocolo.id)}
                        className="text-green-600 hover:text-green-700"
                        disabled={!protocolo.lancado || !protocolo.validacao}
                        title={!protocolo.validacao || !protocolo.lancado ? 'Validação e Lançamento são obrigatórios' : ''}
                      >
                        <Send size={16} />
                      </Button>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          {/* Ver detalhes - Todos os perfis */}
                          <DropdownMenuItem onClick={() => {
                            setSelectedProtocolo(protocolo);
                            setSelectedIndex(globalIndex);
                          }}>
                            <Eye size={16} className="mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          
                          {/* Ocultar - Apenas Admin */}
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => handleOcultar(protocolo.id)}>
                              <EyeOff size={16} className="mr-2" />
                              Ocultar
                            </DropdownMenuItem>
                          )}
                          
                          {/* Excluir - Apenas Admin */}
                          {isAdmin && (
                            <DropdownMenuItem 
                              onClick={() => handleExcluir(protocolo.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredProtocolos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
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