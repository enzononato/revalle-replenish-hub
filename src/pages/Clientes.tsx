import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TablePagination } from '@/components/ui/TablePagination';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, Hash, Store, Loader2, Download, Pencil, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImportarPdvsDialog } from '@/components/ImportarPdvsDialog';
// Mapeamento de códigos para nomes de unidades
const UNIDADES_MAP: { codigo: string; nome: string }[] = [
  { codigo: 'JZ', nome: 'Revalle Juazeiro' },
  { codigo: 'BF', nome: 'Revalle Bonfim' },
  { codigo: 'PE', nome: 'Revalle Petrolina' },
  { codigo: 'RP', nome: 'Revalle Ribeira do Pombal' },
  { codigo: 'PA', nome: 'Revalle Paulo Afonso' },
  { codigo: 'AL', nome: 'Revalle Alagoinhas' },
  { codigo: 'SE', nome: 'Revalle Serrinha' },
];

const getUnidadeNome = (codigo: string | null): string => {
  if (!codigo) return '-';
  const unidade = UNIDADES_MAP.find(u => u.codigo === codigo);
  return unidade ? unidade.nome : codigo;
};

// Função para formatar CNPJ (XX.XXX.XXX/XXXX-XX)
const formatCNPJ = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 14 dígitos
  const limited = numbers.slice(0, 14);
  
  // Aplica a máscara
  return limited
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

interface Pdv {
  id: string;
  codigo: string;
  nome: string;
  bairro: string | null;
  cidade: string | null;
  endereco: string | null;
  cnpj: string | null;
  unidade: string | null;
}

export default function Clientes() {
  const { isAdmin, user } = useAuth();
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<Pdv | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    bairro: '',
    cidade: '',
    endereco: '',
    cnpj: '',
    unidade: '',
  });

  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPdvId, setDeletingPdvId] = useState<string | null>(null);
  const [isDeleteMultipleDialogOpen, setIsDeleteMultipleDialogOpen] = useState(false);

  // Create dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    codigo: '',
    nome: '',
    bairro: '',
    cidade: '',
    endereco: '',
    cnpj: '',
    unidade: '',
  });

  // Fetch PDVs
  const fetchPdvs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('pdvs')
        .select('*')
        .order('nome');

      // Filtro por unidade
      if (!isAdmin && user?.unidade) {
        query = query.eq('unidade', user.unidade);
      } else if (isAdmin && unidadeFiltro !== 'todas') {
        query = query.eq('unidade', unidadeFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPdvs(data || []);
    } catch (error) {
      console.error('Erro ao buscar PDVs:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, user?.unidade, unidadeFiltro]);

  useEffect(() => {
    fetchPdvs();
  }, [fetchPdvs, refreshKey]);

  const handleImportSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter by search
  const filteredPdvs = pdvs.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (p.bairro && p.bairro.toLowerCase().includes(search.toLowerCase())) ||
    (p.cidade && p.cidade.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredPdvs.length / pageSize);
  const paginatedPdvs = filteredPdvs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, pageSize, unidadeFiltro]);

  // Selection handlers
  const isAllSelected = paginatedPdvs.length > 0 && paginatedPdvs.every(p => selectedIds.has(p.id));
  const isPartialSelected = paginatedPdvs.some(p => selectedIds.has(p.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds);
      paginatedPdvs.forEach(p => newSelected.delete(p.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedPdvs.forEach(p => newSelected.add(p.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Delete handlers
  const openDeleteConfirmation = (id: string) => {
    setDeletingPdvId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPdvId) return;
    
    try {
      const { error } = await supabase.from('pdvs').delete().eq('id', deletingPdvId);
      if (error) throw error;
      toast.success('Cliente excluído com sucesso!');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir cliente');
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingPdvId(null);
    }
  };

  const openDeleteMultipleConfirmation = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteMultipleDialogOpen(true);
  };

  const handleConfirmDeleteMultiple = async () => {
    try {
      const promises = Array.from(selectedIds).map(id => 
        supabase.from('pdvs').delete().eq('id', id)
      );
      await Promise.all(promises);
      const count = selectedIds.size;
      setSelectedIds(new Set());
      toast.success(`${count} clientes excluídos com sucesso!`);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir clientes');
    } finally {
      setIsDeleteMultipleDialogOpen(false);
    }
  };

  // Edit handlers
  const openEditDialog = (pdv: Pdv) => {
    setEditingPdv(pdv);
    setFormData({
      codigo: pdv.codigo,
      nome: pdv.nome,
      bairro: pdv.bairro || '',
      cidade: pdv.cidade || '',
      endereco: pdv.endereco || '',
      cnpj: pdv.cnpj || '',
      unidade: pdv.unidade || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPdv) return;

    try {
      const { error } = await supabase
        .from('pdvs')
        .update({
          codigo: formData.codigo,
          nome: formData.nome,
          bairro: formData.bairro || null,
          cidade: formData.cidade || null,
          endereco: formData.endereco || null,
          cnpj: formData.cnpj || null,
          unidade: formData.unidade || null,
        })
        .eq('id', editingPdv.id);

      if (error) throw error;
      
      toast.success('Cliente atualizado com sucesso!');
      setIsEditDialogOpen(false);
      setEditingPdv(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  // Export functions
  const exportToCSV = () => {
    if (filteredPdvs.length === 0) {
      toast.error('Nenhum cliente para exportar');
      return;
    }

    const headers = ['Código', 'Nome', 'CNPJ', 'Endereço', 'Bairro', 'Cidade', 'Unidade'];
    const csvContent = [
      headers.join(';'),
      ...filteredPdvs.map(p => [
        p.codigo,
        p.nome,
        p.cnpj || '',
        p.endereco || '',
        p.bairro || '',
        p.cidade || '',
        getUnidadeNome(p.unidade)
      ].map(field => `"${field}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${unidadeFiltro === 'todas' ? 'todos' : unidadeFiltro}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${filteredPdvs.length} clientes exportados para CSV`);
  };

  // Create handler
  const openCreateDialog = () => {
    setCreateFormData({
      codigo: '',
      nome: '',
      bairro: '',
      cidade: '',
      endereco: '',
      cnpj: '',
      unidade: !isAdmin && user?.unidade ? user.unidade : '',
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.codigo.trim() || !createFormData.nome.trim()) {
      toast.error('Código e nome são obrigatórios');
      return;
    }

    if (!createFormData.unidade) {
      toast.error('Selecione uma unidade');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('pdvs')
        .insert({
          codigo: createFormData.codigo.trim(),
          nome: createFormData.nome.trim(),
          bairro: createFormData.bairro.trim() || null,
          cidade: createFormData.cidade.trim() || null,
          endereco: createFormData.endereco.trim() || null,
          cnpj: createFormData.cnpj.trim() || null,
          unidade: createFormData.unidade,
        });

      if (error) throw error;
      
      toast.success('Cliente criado com sucesso!');
      setIsCreateDialogOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      console.error('Erro ao criar:', error);
      if (error.code === '23505') {
        toast.error('Já existe um cliente com este código nesta unidade');
      } else {
        toast.error('Erro ao criar cliente');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Store className="text-primary" size={24} />
            Clientes (PDVs)
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Gerencie os pontos de venda cadastrados ({filteredPdvs.length} registros)
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={openCreateDialog}>
            <Plus size={16} className="mr-2" />
            Novo Cliente
          </Button>
          <ImportarPdvsDialog onSuccess={handleImportSuccess} />
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, código, bairro ou cidade..."
          className="flex-1 max-w-md"
        />
        
        {isAdmin && (
          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <MapPin size={14} className="mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {UNIDADES_MAP.map(u => (
                <SelectItem key={u.codigo} value={u.codigo}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selection Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedIds.size} cliente(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={openDeleteMultipleConfirmation}
            >
              <Trash2 size={16} className="mr-2" />
              Excluir selecionados
            </Button>
          </div>
        </div>
      )}

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
                  <th className="text-left p-2.5 text-[11px] rounded-tl-lg w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                      className={isPartialSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </th>
                  <th className="text-left p-2.5 text-[11px]">Código</th>
                  <th className="text-left p-2.5 text-[11px]">Nome</th>
                  <th className="text-left p-2.5 text-[11px]">Bairro</th>
                  <th className="text-left p-2.5 text-[11px]">Cidade</th>
                  <th className="text-left p-2.5 text-[11px]">Unidade</th>
                  <th className="text-right p-2.5 text-[11px] rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPdvs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  paginatedPdvs.map((pdv) => (
                    <tr 
                      key={pdv.id} 
                      className={`border-b border-border hover:bg-muted/30 ${selectedIds.has(pdv.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-2.5">
                        <Checkbox
                          checked={selectedIds.has(pdv.id)}
                          onCheckedChange={() => toggleSelect(pdv.id)}
                          aria-label={`Selecionar ${pdv.nome}`}
                        />
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <Hash size={12} />
                          {pdv.codigo}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-xs">{pdv.nome}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{pdv.bairro || '-'}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{pdv.cidade || '-'}</td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin size={12} />
                          {getUnidadeNome(pdv.unidade)}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(pdv)}
                            className="text-primary hover:text-primary/80 h-6 w-6 p-0"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteConfirmation(pdv.id)}
                            className="text-destructive hover:text-destructive/80 h-6 w-6 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              totalItems={filteredPdvs.length}
            />
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, unidade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MAP.map(u => (
                      <SelectItem key={u.codigo} value={u.codigo}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-primary-gradient">
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Multiple Confirmation Dialog */}
      <AlertDialog open={isDeleteMultipleDialogOpen} onOpenChange={setIsDeleteMultipleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} cliente(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteMultiple} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir {selectedIds.size} cliente(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-codigo">Código *</Label>
                <Input
                  id="create-codigo"
                  value={createFormData.codigo}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, codigo: e.target.value }))}
                  required
                  placeholder="Ex: 12345"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-unidade">Unidade *</Label>
                <Select 
                  value={createFormData.unidade} 
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, unidade: value }))}
                  disabled={!isAdmin && !!user?.unidade}
                >
                  <SelectTrigger id="create-unidade">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES_MAP.map(u => (
                      <SelectItem key={u.codigo} value={u.codigo}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="create-nome">Nome *</Label>
                <Input
                  id="create-nome"
                  value={createFormData.nome}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                  placeholder="Nome do cliente/PDV"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-cnpj">CNPJ</Label>
                <Input
                  id="create-cnpj"
                  value={createFormData.cnpj}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-cidade">Cidade</Label>
                <Input
                  id="create-cidade"
                  value={createFormData.cidade}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="create-endereco">Endereço</Label>
                <Input
                  id="create-endereco"
                  value={createFormData.endereco}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Rua, número, complemento"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label htmlFor="create-bairro">Bairro</Label>
                <Input
                  id="create-bairro"
                  value={createFormData.bairro}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, bairro: e.target.value }))}
                  placeholder="Bairro"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Cliente'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
