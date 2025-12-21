import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Hash, Building2, Users, Loader2, Store, FileText } from 'lucide-react';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { supabase } from '@/integrations/supabase/client';

export default function Unidades() {
  const { unidades, isLoading, addUnidade, updateUnidade, deleteUnidade } = useUnidadesDB();
  const { motoristas, isLoading: isLoadingMotoristas } = useMotoristasDB();
  const [clientesPorUnidade, setClientesPorUnidade] = useState<Record<string, number>>({});
  const [protocolosPorUnidade, setProtocolosPorUnidade] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoadingCounts(true);
      try {
        // Buscar contagem de PDVs (clientes) por unidade
        const { data: pdvsData } = await supabase
          .from('pdvs')
          .select('unidade');
        
        const pdvCounts: Record<string, number> = {};
        pdvsData?.forEach(pdv => {
          pdvCounts[pdv.unidade] = (pdvCounts[pdv.unidade] || 0) + 1;
        });
        setClientesPorUnidade(pdvCounts);

        // Buscar contagem de protocolos por unidade
        const { data: protocolosData } = await supabase
          .from('protocolos')
          .select('motorista_unidade');
        
        const protocoloCounts: Record<string, number> = {};
        protocolosData?.forEach(p => {
          if (p.motorista_unidade) {
            protocoloCounts[p.motorista_unidade] = (protocoloCounts[p.motorista_unidade] || 0) + 1;
          }
        });
        setProtocolosPorUnidade(protocoloCounts);
      } catch (error) {
        console.error('Erro ao buscar contagens:', error);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    fetchCounts();
  }, []);
  
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
      } else {
        await addUnidade(formData);
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
      await deleteUnidade(id);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="text-primary" size={24} />
            Unidades
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie as unidades cadastradas</p>
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

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, código ou CNPJ..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="bg-card rounded-xl p-4 shadow-md animate-fade-in overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left p-2.5 text-[11px] rounded-tl-lg">Nome</th>
              <th className="text-left p-2.5 text-[11px]">Código</th>
              <th className="text-left p-2.5 text-[11px]">CNPJ</th>
              <th className="text-center p-2.5 text-[11px]">Motoristas</th>
              <th className="text-center p-2.5 text-[11px]">Clientes</th>
              <th className="text-center p-2.5 text-[11px]">Solicitações</th>
              <th className="text-right p-2.5 text-[11px] rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnidades.map((unidade) => (
              <tr 
                key={unidade.id} 
                className="border-b border-border"
              >
                <td className="p-2.5 font-medium text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={14} className="text-muted-foreground" />
                    {unidade.nome}
                  </span>
                </td>
                <td className="p-2.5">
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                    <Hash size={12} />
                    {unidade.codigo}
                  </span>
                </td>
                <td className="p-2.5 text-muted-foreground font-mono text-xs">
                  {unidade.cnpj || '-'}
                </td>
                <td className="p-2.5 text-center">
                  {isLoadingMotoristas ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                      <Users size={12} />
                      {getMotoristaCount(unidade.nome)}
                    </span>
                  )}
                </td>
                <td className="p-2.5 text-center">
                  {isLoadingCounts ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                      <Store size={12} />
                      {clientesPorUnidade[unidade.nome] || 0}
                    </span>
                  )}
                </td>
                <td className="p-2.5 text-center">
                  {isLoadingCounts ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                      <FileText size={12} />
                      {protocolosPorUnidade[unidade.nome] || 0}
                    </span>
                  )}
                </td>
                <td className="p-2.5">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(unidade)}
                      className="text-primary hover:text-primary/80 h-6 w-6 p-0"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(unidade.id)}
                      className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUnidades.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma unidade encontrada
          </div>
        )}
      </div>
    </div>
  );
}
