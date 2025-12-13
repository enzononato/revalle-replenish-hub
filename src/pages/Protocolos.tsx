import { useState } from 'react';
import { mockProtocolos, mockMotoristas } from '@/data/mockData';
import { Protocolo } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtocoloDetails } from '@/components/ProtocoloDetails';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Eye, CheckCircle, XCircle, Send, Filter, X, MoreVertical, Edit, Power, ChevronRight, Phone, Download } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO, format } from 'date-fns';

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
  const [protocolos, setProtocolos] = useState<Protocolo[]>(mockProtocolos);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('aberto');
  const [motoristaFilter, setMotoristaFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState('');
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const countByStatus = {
    aberto: protocolos.filter(p => p.status === 'aberto').length,
    em_andamento: protocolos.filter(p => p.status === 'em_andamento').length,
    encerrado: protocolos.filter(p => p.status === 'encerrado').length,
  };

  const filteredProtocolos = protocolos.filter(p => {
    const searchMatch = 
      p.numero.toLowerCase().includes(search.toLowerCase()) ||
      p.motorista.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.motorista.whatsapp.includes(search) ||
      p.motorista.codigoPdv?.includes(search) ||
      p.codigoPdv?.includes(search) ||
      p.mapa?.includes(search);
    
    const statusMatch = p.status === activeTab;
    const motoristaMatch = motoristaFilter === 'todos' || p.motorista.id === motoristaFilter;
    const dataMatch = !dataFilter || p.data.includes(dataFilter.split('-').reverse().join('/'));
    
    return searchMatch && statusMatch && motoristaMatch && dataMatch;
  });

  const handleEnviarLancar = (id: string) => {
    setProtocolos(prev => prev.map(p => 
      p.id === id ? { ...p, enviadoLancar: true } : p
    ));
    toast.success('Notificação de lançamento enviada!');
  };

  const handleEnviarEncerrar = (id: string) => {
    setProtocolos(prev => prev.map(p => 
      p.id === id ? { ...p, enviadoEncerrar: true, status: 'encerrado' as const } : p
    ));
    toast.success('Protocolo encerrado com sucesso!');
  };

  const handleToggleLancado = (id: string) => {
    const protocolo = protocolos.find(p => p.id === id);
    if (!protocolo?.validacao) {
      toast.error('A validação do conferente é obrigatória antes do lançamento!');
      return;
    }
    
    setProtocolos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newLancado = !p.lancado;
      const newStatus = (p.validacao && newLancado) ? 'em_andamento' as const : 'aberto' as const;
      return { ...p, lancado: newLancado, status: p.status === 'encerrado' ? p.status : newStatus };
    }));
    toast.success('Status de lançamento atualizado!');
  };

  const handleToggleValidacao = (id: string) => {
    setProtocolos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newValidacao = !p.validacao;
      const newStatus = (newValidacao && p.lancado) ? 'em_andamento' as const : 'aberto' as const;
      return { ...p, validacao: newValidacao, status: p.status === 'encerrado' ? p.status : newStatus };
    }));
    toast.success('Validação atualizada!');
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
WhatsApp: ${protocolo.motorista.whatsapp}
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
    setMotoristaFilter('todos');
    setDataFilter('');
  };

  const hasActiveFilters = motoristaFilter !== 'todos' || dataFilter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Painel de Controle Revalle</h1>
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
          <Button 
            variant="outline" 
            onClick={handleDownloadAll}
            disabled={filteredProtocolos.length === 0}
            className="lg:w-auto"
          >
            <Download size={18} className="mr-2" />
            Download Todos
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

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent gap-2 h-auto p-0">
          <TabsTrigger 
            value="aberto" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Abertos <span className="ml-1 font-bold">({countByStatus.aberto})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="em_andamento" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Em andamento <span className="ml-1 font-bold">({countByStatus.em_andamento})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="encerrado" 
            className="data-[state=active]:bg-[#E0E7FF] data-[state=active]:text-[#1E3A8A] data-[state=active]:font-semibold data-[state=inactive]:text-[#64748B] data-[state=inactive]:bg-transparent hover:bg-[#F1F5F9] rounded-2xl px-3 py-1.5 text-sm transition-colors"
          >
            Encerrados <span className="ml-1 font-bold">({countByStatus.encerrado})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      {showFilters && (
        <div className="card-stats animate-scale-in">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[180px]">
              <label className="text-sm font-medium text-muted-foreground">Motorista</label>
              <Select value={motoristaFilter} onValueChange={setMotoristaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {mockMotoristas.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 min-w-[180px]">
              <label className="text-sm font-medium text-muted-foreground">Data</label>
              <Input
                type="date"
                value={dataFilter}
                onChange={(e) => setDataFilter(e.target.value)}
              />
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
              <th className="text-left p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Data/Hora</th>
              <th className="text-left p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Protocolo</th>
              <th className="text-left p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Motorista</th>
              <th className="text-left p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">WhatsApp</th>
              <th className="text-center p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">SLA</th>
              <th className="text-center p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Validação</th>
              <th className="text-center p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Lançado</th>
              <th className="text-center p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Env. Lançar</th>
              <th className="text-center p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider border-r border-[#E5E7EB]">Env. Encerrar</th>
              <th className="text-right p-4 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProtocolos.map((protocolo, index) => (
              <tr 
                key={protocolo.id} 
                className={`border-b border-[#E5E7EB] ${selectedIndex === index ? 'bg-blue-50' : ''}`}
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
                    {protocolo.motorista.whatsapp}
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
                      className="text-success hover:text-success/80"
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
                        <DropdownMenuItem onClick={() => {
                          setSelectedProtocolo(protocolo);
                          setSelectedIndex(index);
                        }}>
                          <Eye size={16} className="mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit size={16} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleEnviarEncerrar(protocolo.id)}
                          disabled={!protocolo.lancado || !protocolo.validacao || protocolo.enviadoEncerrar}
                        >
                          <Power size={16} className="mr-2" />
                          Encerrar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProtocolos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum protocolo encontrado
          </div>
        )}
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
      />
    </div>
  );
}
