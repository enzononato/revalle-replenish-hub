import { useState, useEffect, useCallback, useMemo } from 'react';
import { Unidade } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Pencil, Trash2, Hash, Building2, Users, Loader2, Store, FileText, CalendarIcon, X } from 'lucide-react';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function Unidades() {
  const { isAdmin, isDistribuicao, user } = useAuth();
  const { unidades, isLoading, addUnidade, updateUnidade, deleteUnidade } = useUnidadesDB();
  const { registrarLog } = useAuditLog();
  const { motoristas, isLoading: isLoadingMotoristas } = useMotoristasDB();
  const [clientesPorUnidade, setClientesPorUnidade] = useState<Record<string, number>>({});
  const [protocolosPorUnidade, setProtocolosPorUnidade] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  
  // Só admin e distribuição podem ver clientes
  const canViewClientes = isAdmin || isDistribuicao;
  
  // Filtro de período
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  const fetchCounts = useCallback(async () => {
    setIsLoadingCounts(true);
    try {
      // Mapeamento de siglas PDV -> código da unidade
      const pdvToUnidadeMap: Record<string, string[]> = {
        'AL': ['RAL', 'REVALLE ALAGOINHAS'],
        'PE': ['RPE', 'REVALLE PETROLINA'],
        'SE': ['RSE', 'REVALLE SERRINHA'],
        'PA': ['RPA', 'REVALLE PAULO AFONSO'],
        'JZ': ['RJZ', 'REVALLE JUAZEIRO'],
        'BF': ['RBO', 'REVALLE BONFIM'],
        'RP': ['RNE', 'REVALLE RIBEIRA DO POMBAL'],
      };

      // Buscar contagem de PDVs usando função RPC (muito mais rápido!)
      const { data: pdvCounts, error: pdvError } = await supabase
        .rpc('count_pdvs_por_unidade');
      
      if (pdvError) throw pdvError;

      const pdvCountsRaw: Record<string, number> = {};
      (pdvCounts || []).forEach((row: { unidade: string; total: number }) => {
        pdvCountsRaw[row.unidade] = row.total;
      });

      // Mapeia a contagem para o nome da unidade
      const pdvCountsByNome: Record<string, number> = {};
      unidades.forEach((u) => {
        const codigo = (u.codigo || '').trim().toUpperCase();
        const nome = (u.nome || '').trim().toUpperCase();
        
        let count = 0;
        for (const [siglaPdv, codigosUnidade] of Object.entries(pdvToUnidadeMap)) {
          if (codigosUnidade.includes(codigo) || codigosUnidade.includes(nome)) {
            count += pdvCountsRaw[siglaPdv] || 0;
          }
        }

        // Fallback: tenta match direto pelo código sem R
        if (count === 0) {
          const codigoSemPrefixo = codigo.startsWith('R') ? codigo.slice(1) : codigo;
          count = pdvCountsRaw[codigoSemPrefixo] || pdvCountsRaw[codigo] || pdvCountsRaw[nome] || 0;
        }

        pdvCountsByNome[u.nome] = count;
      });

      setClientesPorUnidade(pdvCountsByNome);

      // Buscar contagem de protocolos usando função RPC (com filtro de data)
      const dataInicioStr = dataInicio ? format(dataInicio, 'yyyy-MM-dd') : null;
      const dataFimStr = dataFim ? format(dataFim, 'yyyy-MM-dd') : null;

      const { data: protocoloCounts, error: protocoloError } = await supabase
        .rpc('count_protocolos_por_unidade', {
          data_inicio: dataInicioStr,
          data_fim: dataFimStr
        });

      if (protocoloError) throw protocoloError;

      const protocoloCountsByNome: Record<string, number> = {};
      (protocoloCounts || []).forEach((row: { unidade: string; total: number }) => {
        if (row.unidade) {
          protocoloCountsByNome[row.unidade] = row.total;
        }
      });

      setProtocolosPorUnidade(protocoloCountsByNome);
    } catch (error) {
      console.error('Erro ao buscar contagens:', error);
    } finally {
      setIsLoadingCounts(false);
    }
  }, [dataInicio, dataFim, unidades]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const limparFiltro = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
  };
  
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    cnpj: '',
  });

  const filteredUnidades = unidades.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.codigo.toLowerCase().includes(search.toLowerCase()) ||
    u.cnpj.includes(search)
  );

  const getMotoristaCount = (unidadeNome: string) => {
    return motoristas.filter(m => m.unidade === unidadeNome).length;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      cnpj: '',
    });
    setEditingUnidade(null);
  };

  const openEditDialog = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      codigo: unidade.codigo,
      cnpj: unidade.cnpj,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingUnidade) {
        await updateUnidade(editingUnidade.id, formData);
        await registrarLog({
          acao: 'edicao',
          tabela: 'unidades',
          registro_id: editingUnidade.id,
          registro_dados: { nome: formData.nome, codigo: formData.codigo, antes: { nome: editingUnidade.nome, codigo: editingUnidade.codigo } },
          usuario_nome: user?.nome || 'Desconhecido',
          usuario_role: user?.nivel || undefined,
          usuario_unidade: user?.unidade || undefined,
        });
      } else {
        await addUnidade(formData);
        await registrarLog({
          acao: 'criacao',
          tabela: 'unidades',
          registro_id: formData.codigo,
          registro_dados: { nome: formData.nome, codigo: formData.codigo },
          usuario_nome: user?.nome || 'Desconhecido',
          usuario_role: user?.nivel || undefined,
          usuario_unidade: user?.unidade || undefined,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const unidadeExcluida = unidades.find(u => u.id === id);
      await deleteUnidade(id);
      if (unidadeExcluida) {
        await registrarLog({
          acao: 'exclusao',
          tabela: 'unidades',
          registro_id: id,
          registro_dados: { nome: unidadeExcluida.nome, codigo: unidadeExcluida.codigo },
          usuario_nome: user?.nome || 'Desconhecido',
          usuario_role: user?.nivel || undefined,
          usuario_unidade: user?.unidade || undefined,
        });
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calcular totais para os cards de resumo
  const totalMotoristas = motoristas.length;
  const totalClientes = Object.values(clientesPorUnidade).reduce((acc, val) => acc + val, 0);
  const totalSolicitacoes = Object.values(protocolosPorUnidade).reduce((acc, val) => acc + val, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="text-primary" size={32} />
            Unidades
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as unidades, motoristas e clientes cadastrados</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-accent-gradient">
              <Plus size={20} className="mr-2" />
              Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="nome">Nome da Unidade</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                    placeholder="Ex: JUA"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary-gradient" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingUnidade ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Building2 size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Unidades</p>
              <p className="text-2xl font-bold text-foreground">{unidades.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-info/10">
              <Users size={20} className="text-info" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Motoristas</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoadingMotoristas ? <Loader2 className="h-4 w-4 animate-spin" /> : totalMotoristas}
              </p>
            </div>
          </div>
        </div>
        
        {canViewClientes && (
          <div className="bg-card rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Store size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">Clientes</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : totalClientes}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-card rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <FileText size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Solicitações</p>
              <p className="text-2xl font-bold text-foreground">
                {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : totalSolicitacoes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Date Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, código ou CNPJ..."
          className="flex-1"
        />
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Solicitações:</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 text-xs justify-start text-left font-normal",
                  !dataInicio && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={setDataInicio}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 text-xs justify-start text-left font-normal",
                  !dataFim && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={setDataFim}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(dataInicio || dataFim) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltro}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <X size={14} className="mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-md animate-fade-in overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">CNPJ</th>
                <th className="text-center p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Motoristas</th>
                {canViewClientes && <th className="text-center p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Clientes</th>}
                <th className="text-center p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Solicitações</th>
                <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnidades.map((unidade, index) => (
                <tr 
                  key={unidade.id} 
                  className="border-b border-border hover:bg-muted/40 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-primary" />
                      </div>
                      <span className="font-medium text-sm">{unidade.nome}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm font-mono">
                      <Hash size={13} />
                      {unidade.codigo}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-sm">
                    {unidade.cnpj || '-'}
                  </td>
                  <td className="p-4 text-center">
                    {isLoadingMotoristas ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                        <Users size={13} />
                        {getMotoristaCount(unidade.nome)}
                      </span>
                    )}
                  </td>
                  {canViewClientes && (
                    <td className="p-4 text-center">
                      {isLoadingCounts ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                      ) : (
                        (isAdmin || unidade.nome === user?.unidade) ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium">
                            <Store size={13} />
                            {clientesPorUnidade[unidade.nome] || 0}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )
                      )}
                    </td>
                  )}
                  <td className="p-4 text-center">
                    {isLoadingCounts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium">
                        <FileText size={13} />
                        {protocolosPorUnidade[unidade.nome] || 0}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(unidade)}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10 h-8 w-8 p-0"
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(unidade.id)}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={3} className="p-4 text-sm font-bold">
                  TOTAL
                </td>
                <td className="p-4 text-center">
                  {isLoadingMotoristas ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                      <Users size={13} />
                      {motoristas.length}
                    </span>
                  )}
                </td>
                {canViewClientes && (
                  <td className="p-4 text-center">
                    {isLoadingCounts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium">
                        <Store size={13} />
                        {isAdmin 
                          ? Object.values(clientesPorUnidade).reduce((acc, val) => acc + val, 0)
                          : clientesPorUnidade[user?.unidade || ''] || 0
                        }
                      </span>
                    )}
                  </td>
                )}
                <td className="p-4 text-center">
                  {isLoadingCounts ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium">
                      <FileText size={13} />
                      {Object.values(protocolosPorUnidade).reduce((acc, val) => acc + val, 0)}
                    </span>
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {filteredUnidades.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma unidade encontrada
          </div>
        )}
      </div>
    </div>
  );
}
