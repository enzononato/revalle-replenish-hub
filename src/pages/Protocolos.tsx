import { useState } from 'react';
import { mockProtocolos, mockMotoristas } from '@/data/mockData';
import { Protocolo } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, CheckCircle, XCircle, Send, Filter, X } from 'lucide-react';
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
      p.motorista.codigoPdv?.includes(search);
    
    const statusMatch = statusFilter === 'todos' || p.status === statusFilter;
    const motoristaMatch = motoristaFilter === 'todos' || p.motorista.id === motoristaFilter;
    const dataMatch = !dataFilter || p.data === dataFilter;
    
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
          placeholder="Buscar por Código PDV, Motorista ou WhatsApp..."
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProtocolo(protocolo)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Eye size={16} />
                    </Button>
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
      <Dialog open={!!selectedProtocolo} onOpenChange={() => setSelectedProtocolo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">
              Detalhes do Protocolo
            </DialogTitle>
          </DialogHeader>
          {selectedProtocolo && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{selectedProtocolo.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedProtocolo.status} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{selectedProtocolo.data} às {selectedProtocolo.hora}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SLA</p>
                  <p className="font-medium">{selectedProtocolo.sla}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Motorista</p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">{selectedProtocolo.motorista.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Código: {selectedProtocolo.motorista.codigo}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp: {selectedProtocolo.motorista.whatsapp}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Unidade: {selectedProtocolo.motorista.unidade}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  {selectedProtocolo.validacao ? (
                    <CheckCircle className="text-success" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Validação</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedProtocolo.lancado ? (
                    <CheckCircle className="text-success" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Lançado</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
