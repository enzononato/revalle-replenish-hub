import { useState } from 'react';
import { mockProtocolos, mockMotoristas } from '@/data/mockData';
import { Protocolo } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProtocoloDetails } from '@/components/ProtocoloDetails';
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
import { Eye, CheckCircle, XCircle, Send, Filter, X, MoreVertical, Edit, Power } from 'lucide-react';
import { toast } from 'sonner';

export default function Protocolos() {
  const [protocolos, setProtocolos] = useState<Protocolo[]>(mockProtocolos);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [motoristaFilter, setMotoristaFilter] = useState<string>('todos');
  const [dataFilter, setDataFilter] = useState('');
  const [selectedProtocolo, setSelectedProtocolo] = useState<Protocolo | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredProtocolos = protocolos.filter(p => {
    const searchMatch = 
      p.numero.toLowerCase().includes(search.toLowerCase()) ||
      p.motorista.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.motorista.whatsapp.includes(search) ||
      p.motorista.codigoPdv?.includes(search) ||
      p.codigoPdv?.includes(search) ||
      p.mapa?.includes(search);
    
    const statusMatch = statusFilter === 'todos' || p.status === statusFilter;
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
    setProtocolos(prev => prev.map(p => 
      p.id === id ? { ...p, lancado: !p.lancado, status: !p.lancado ? 'em_andamento' as const : p.status } : p
    ));
    toast.success('Status de lançamento atualizado!');
  };

  const handleToggleValidacao = (id: string) => {
    setProtocolos(prev => prev.map(p => 
      p.id === id ? { ...p, validacao: !p.validacao } : p
    ));
    toast.success('Validação atualizada!');
  };

  const clearFilters = () => {
    setStatusFilter('todos');
    setMotoristaFilter('todos');
    setDataFilter('');
  };

  const hasActiveFilters = statusFilter !== 'todos' || motoristaFilter !== 'todos' || dataFilter;

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

      {/* Filters */}
      {showFilters && (
        <div className="card-stats animate-scale-in">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[180px]">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredProtocolos.length} protocolo(s) encontrado(s)
      </p>

      {/* Table */}
      <div className="card-stats animate-fade-in overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left p-4 rounded-tl-lg">Data/Hora</th>
              <th className="text-left p-4">Protocolo</th>
              <th className="text-left p-4">Motorista</th>
              <th className="text-left p-4">WhatsApp</th>
              <th className="text-left p-4">SLA</th>
              <th className="text-center p-4">Validação</th>
              <th className="text-center p-4">Lançado</th>
              <th className="text-center p-4">Env. Lançar</th>
              <th className="text-center p-4">Env. Encerrar</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4 rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProtocolos.map((protocolo) => (
              <tr 
                key={protocolo.id} 
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="p-4">
                  <div className="text-sm">
                    <p className="font-medium">{protocolo.data}</p>
                    <p className="text-muted-foreground">{protocolo.hora}</p>
                  </div>
                </td>
                <td className="p-4 font-medium">{protocolo.numero}</td>
                <td className="p-4">{protocolo.motorista.nome}</td>
                <td className="p-4 text-muted-foreground">{protocolo.motorista.whatsapp}</td>
                <td className="p-4">{protocolo.sla}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleValidacao(protocolo.id)}
                    className="inline-flex"
                  >
                    {protocolo.validacao ? (
                      <CheckCircle className="text-success" size={20} />
                    ) : (
                      <XCircle className="text-muted-foreground" size={20} />
                    )}
                  </button>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleToggleLancado(protocolo.id)}
                    className="inline-flex"
                  >
                    {protocolo.lancado ? (
                      <CheckCircle className="text-success" size={20} />
                    ) : (
                      <XCircle className="text-muted-foreground" size={20} />
                    )}
                  </button>
                </td>
                <td className="p-4 text-center">
                  {protocolo.enviadoLancar ? (
                    <CheckCircle className="text-success mx-auto" size={20} />
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
                <td className="p-4 text-center">
                  {protocolo.enviadoEncerrar ? (
                    <CheckCircle className="text-success mx-auto" size={20} />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEnviarEncerrar(protocolo.id)}
                      className="text-success hover:text-success/80"
                      disabled={!protocolo.lancado}
                    >
                      <Send size={16} />
                    </Button>
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge status={protocolo.status} />
                </td>
                <td className="p-4">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedProtocolo(protocolo)}>
                          <Eye size={16} className="mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit size={16} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleEnviarEncerrar(protocolo.id)}
                          disabled={!protocolo.lancado || protocolo.enviadoEncerrar}
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
        open={!!selectedProtocolo}
        onClose={() => setSelectedProtocolo(null)}
      />
    </div>
  );
}
