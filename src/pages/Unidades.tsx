import { useState } from 'react';
import { mockUnidades } from '@/data/mockData';
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
import { Plus, Pencil, Trash2, Hash, Building2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';

export default function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>(mockUnidades);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    cnpj: '',
  });

  const { motoristas, isLoading: isLoadingMotoristas } = useMotoristasDB();

  const filteredUnidades = unidades.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.codigo.toLowerCase().includes(search.toLowerCase()) ||
    u.cnpj.includes(search)
  );

  // Conta motoristas + ajudantes por unidade
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUnidade) {
      setUnidades(prev => prev.map(u => 
        u.id === editingUnidade.id 
          ? { ...u, ...formData }
          : u
      ));
      toast.success('Unidade atualizada com sucesso!');
    } else {
      const newUnidade: Unidade = {
        id: String(Date.now()),
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setUnidades(prev => [...prev, newUnidade]);
      toast.success('Unidade cadastrada com sucesso!');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setUnidades(prev => prev.filter(u => u.id !== id));
    toast.success('Unidade excluída com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="text-primary" size={32} />
            Unidades
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as unidades cadastradas</p>
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
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary-gradient">
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
      <div className="bg-card rounded-xl p-6 shadow-md animate-fade-in overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left p-4 rounded-tl-lg">Nome</th>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">CNPJ</th>
              <th className="text-center p-4">Motoristas</th>
              <th className="text-right p-4 rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnidades.map((unidade) => (
              <tr 
                key={unidade.id} 
                className="border-b border-border"
              >
                <td className="p-4 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Building2 size={16} className="text-muted-foreground" />
                    {unidade.nome}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Hash size={14} />
                    {unidade.codigo}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground font-mono text-sm">
                  {unidade.cnpj}
                </td>
                <td className="p-4 text-center">
                  {isLoadingMotoristas ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground inline" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm font-medium">
                      <Users size={14} />
                      {getMotoristaCount(unidade.nome)}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(unidade)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(unidade.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={16} />
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