import { useState, useEffect } from 'react';
import { unidades } from '@/data/mockData';
import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TablePagination } from '@/components/ui/TablePagination';
import { ImportarMotoristasCSV } from '@/components/ImportarMotoristasCSV';
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, MapPin, Hash, Truck, Users, Building, Loader2 } from 'lucide-react';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export default function Motoristas() {
  const { motoristas, isLoading, addMotorista, updateMotorista, deleteMotorista, importMotoristas } = useMotoristasDB();
  const { isAdmin, user } = useAuth();
  const { registrarLog } = useAuditLog();
  const [search, setSearch] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    dataNascimento: '',
    unidade: '',
    funcao: 'motorista' as FuncaoMotorista,
    setor: 'sede' as SetorMotorista,
    senha: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Delete confirmation states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMotoristaId, setDeletingMotoristaId] = useState<string | null>(null);
  const [isDeleteMultipleDialogOpen, setIsDeleteMultipleDialogOpen] = useState(false);

  // Filtrar motoristas por unidade do usuário (exceto admin)
  const motoristasFiltradosPorUnidade = isAdmin 
    ? (unidadeFiltro === 'todas' ? motoristas : motoristas.filter(m => m.unidade === unidadeFiltro))
    : motoristas.filter(m => m.unidade === user?.unidade);

  const filteredMotoristas = motoristasFiltradosPorUnidade.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredMotoristas.length / pageSize);
  const paginatedMotoristas = filteredMotoristas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, pageSize, unidadeFiltro]);

  // Selection handlers
  const isAllSelected = paginatedMotoristas.length > 0 && paginatedMotoristas.every(m => selectedIds.has(m.id));
  const isPartialSelected = paginatedMotoristas.some(m => selectedIds.has(m.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedIds);
      paginatedMotoristas.forEach(m => newSelected.delete(m.id));
      setSelectedIds(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedIds);
      paginatedMotoristas.forEach(m => newSelected.add(m.id));
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

  // Open delete confirmation dialog for single motorista
  const openDeleteConfirmation = (id: string) => {
    setDeletingMotoristaId(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm single delete
  const handleConfirmDelete = async () => {
    if (!deletingMotoristaId) return;
    
    // Buscar dados do motorista antes de excluir
    const motoristaExcluido = motoristas.find(m => m.id === deletingMotoristaId);
    
    await deleteMotorista(deletingMotoristaId);
    
    // Registrar log de auditoria
    if (motoristaExcluido) {
      await registrarLog({
        acao: 'exclusao',
        tabela: 'motoristas',
        registro_id: deletingMotoristaId,
        registro_dados: {
          nome: motoristaExcluido.nome,
          codigo: motoristaExcluido.codigo,
          unidade: motoristaExcluido.unidade,
        },
        usuario_nome: user?.nome || 'Desconhecido',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });
    }
    
    toast.success('Motorista excluído com sucesso!');
    setIsDeleteDialogOpen(false);
    setDeletingMotoristaId(null);
  };

  // Open delete confirmation dialog for multiple motoristas
  const openDeleteMultipleConfirmation = () => {
    if (selectedIds.size === 0) return;
    setIsDeleteMultipleDialogOpen(true);
  };

  // Confirm multiple delete
  const handleConfirmDeleteMultiple = async () => {
    const count = selectedIds.size;
    
    // Buscar dados dos motoristas antes de excluir
    const motoristasExcluidos = motoristas.filter(m => selectedIds.has(m.id));
    
    const promises = Array.from(selectedIds).map(id => deleteMotorista(id));
    await Promise.all(promises);
    
    // Registrar logs de auditoria para cada motorista
    for (const motorista of motoristasExcluidos) {
      await registrarLog({
        acao: 'exclusao',
        tabela: 'motoristas',
        registro_id: motorista.id,
        registro_dados: {
          nome: motorista.nome,
          codigo: motorista.codigo,
          unidade: motorista.unidade,
        },
        usuario_nome: user?.nome || 'Desconhecido',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });
    }
    
    setSelectedIds(new Set());
    toast.success(`${count} motorista(s) excluído(s) com sucesso!`);
    setIsDeleteMultipleDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      dataNascimento: '',
      unidade: '',
      funcao: 'motorista',
      setor: 'sede',
      senha: '',
    });
    setEditingMotorista(null);
  };

  const openEditDialog = (motorista: Motorista) => {
    setEditingMotorista(motorista);
    setFormData({
      nome: motorista.nome,
      codigo: motorista.codigo,
      dataNascimento: motorista.dataNascimento,
      unidade: motorista.unidade,
      funcao: motorista.funcao,
      setor: motorista.setor,
      senha: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMotorista) {
      // Salvar dados anteriores para o log
      const dadosAnteriores = {
        nome: editingMotorista.nome,
        codigo: editingMotorista.codigo,
        unidade: editingMotorista.unidade,
        funcao: editingMotorista.funcao,
        setor: editingMotorista.setor,
      };
      
      const success = await updateMotorista(editingMotorista.id, formData);
      
      if (success) {
        // Registrar log de edição
        await registrarLog({
          acao: 'edicao',
          tabela: 'motoristas',
          registro_id: editingMotorista.id,
          registro_dados: {
            antes: dadosAnteriores,
            depois: {
              nome: formData.nome,
              codigo: formData.codigo,
              unidade: formData.unidade,
              funcao: formData.funcao,
              setor: formData.setor,
            },
          },
          usuario_nome: user?.nome || 'Desconhecido',
          usuario_role: user?.nivel || undefined,
          usuario_unidade: user?.unidade || undefined,
        });
      }
    } else {
      const success = await addMotorista(formData);
      
      if (success) {
        // Registrar log de criação
        await registrarLog({
          acao: 'criacao',
          tabela: 'motoristas',
          registro_id: formData.codigo,
          registro_dados: {
            nome: formData.nome,
            codigo: formData.codigo,
            unidade: formData.unidade,
            funcao: formData.funcao,
            setor: formData.setor,
          },
          usuario_nome: user?.nome || 'Desconhecido',
          usuario_role: user?.nivel || undefined,
          usuario_unidade: user?.unidade || undefined,
        });
      }
    }
    
    setIsDialogOpen(false);
    resetForm();
  };


  const handleImportCSV = async (importedMotoristas: Motorista[]) => {
    const success = await importMotoristas(importedMotoristas);
    
    if (success) {
      // Registrar log de importação
      await registrarLog({
        acao: 'importacao',
        tabela: 'motoristas',
        registro_id: `lote-${Date.now()}`,
        registro_dados: {
          quantidade: importedMotoristas.length,
          motoristas: importedMotoristas.slice(0, 10).map(m => ({
            nome: m.nome,
            codigo: m.codigo,
            unidade: m.unidade,
          })),
          total_importado: importedMotoristas.length,
        },
        usuario_nome: user?.nome || 'Desconhecido',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });
    }
  };

  const getFuncaoLabel = (funcao: FuncaoMotorista) => {
    return funcao === 'ajudante_entrega' ? 'Ajudante' : 'Motorista';
  };

  const getSetorLabel = (setor: SetorMotorista) => {
    return setor === 'interior' ? 'Interior' : 'Sede';
  };

  // Estatísticas para cards de resumo
  const totalMotoristas = motoristas.length;
  const totalPorFuncao = {
    motorista: motoristas.filter(m => m.funcao === 'motorista').length,
    ajudante: motoristas.filter(m => m.funcao === 'ajudante_entrega').length,
  };
  const totalPorSetor = {
    sede: motoristas.filter(m => m.setor === 'sede').length,
    interior: motoristas.filter(m => m.setor === 'interior').length,
  };
  const unidadesAtivas = new Set(motoristas.map(m => m.unidade)).size;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="text-primary" size={24} />
            Motoristas
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie os motoristas cadastrados</p>
        </div>
        
        <div className="flex gap-2">
          <ImportarMotoristasCSV onImport={handleImportCSV} />
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-accent-gradient">
                <Plus size={20} className="mr-2" />
                Novo Motorista
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">
                  {editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código Promax</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataNascimento: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="funcao">Função</Label>
                    <Select
                      value={formData.funcao}
                      onValueChange={(value: FuncaoMotorista) => setFormData(prev => ({ ...prev, funcao: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="motorista">Motorista</SelectItem>
                        <SelectItem value="ajudante_entrega">Ajudante de Entrega</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="setor">Setor</Label>
                    <Select
                      value={formData.setor}
                      onValueChange={(value: SetorMotorista) => setFormData(prev => ({ ...prev, setor: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sede">Sede</SelectItem>
                        <SelectItem value="interior">Interior</SelectItem>
                      </SelectContent>
                    </Select>
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
                        {unidades.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <Input
                      id="senha"
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                      required={!editingMotorista}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-primary-gradient">
                    {editingMotorista ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-lg font-bold text-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalMotoristas}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Truck size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Motoristas</p>
              <p className="text-lg font-bold text-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalPorFuncao.motorista}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Users size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ajudantes</p>
              <p className="text-lg font-bold text-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalPorFuncao.ajudante}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-3 shadow-sm border border-border animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unidades</p>
              <p className="text-lg font-bold text-foreground">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : unidadesAtivas}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou código..."
          className="flex-1 max-w-md"
        />
        
        {isAdmin && (
          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <MapPin size={14} className="mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selection Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedIds.size} motorista(s) selecionado(s)
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
                  <th className="text-left p-2.5 text-[11px]">Nome</th>
                  <th className="text-left p-2.5 text-[11px]">Código</th>
                  <th className="text-left p-2.5 text-[11px]">Função</th>
                  <th className="text-left p-2.5 text-[11px]">Setor</th>
                  <th className="text-left p-2.5 text-[11px]">Unidade</th>
                  <th className="text-right p-2.5 text-[11px] rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMotoristas.map((motorista, index) => (
                  <tr 
                    key={motorista.id} 
                    className={`border-b border-border hover:bg-muted/50 transition-colors ${selectedIds.has(motorista.id) ? 'bg-primary/5' : ''}`}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <td className="p-2.5">
                      <Checkbox
                        checked={selectedIds.has(motorista.id)}
                        onCheckedChange={() => toggleSelect(motorista.id)}
                        aria-label={`Selecionar ${motorista.nome}`}
                      />
                    </td>
                    <td className="p-2.5 font-medium text-xs">{motorista.nome}</td>
                    <td className="p-2.5">
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <Hash size={12} />
                        {motorista.codigo}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        motorista.funcao === 'ajudante_entrega' 
                          ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' 
                          : 'bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}>
                        <Users size={10} />
                        {getFuncaoLabel(motorista.funcao)}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        motorista.setor === 'interior' 
                          ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' 
                          : 'bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}>
                        <Building size={10} />
                        {getSetorLabel(motorista.setor)}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin size={12} />
                        {motorista.unidade}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(motorista)}
                          className="text-primary hover:text-primary/80 h-6 w-6 p-0"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteConfirmation(motorista.id)}
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
            
            {filteredMotoristas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum motorista encontrado
              </div>
            )}

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredMotoristas.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este motorista? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              Tem certeza que deseja excluir {selectedIds.size} motorista(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteMultiple} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedIds.size} motorista(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
