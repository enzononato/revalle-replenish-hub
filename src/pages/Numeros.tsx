import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/TablePagination';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Pencil, Trash2, Phone, Building2, Loader2, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGestoresDB, Gestor } from '@/hooks/useGestoresDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function Numeros() {
  const { gestores, isLoading, addGestor, updateGestor, deleteGestor, isAdding, isUpdating, isDeleting, refetch } = useGestoresDB();
  const { unidades, isLoading: isLoadingUnidades } = useUnidadesDB();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGestor, setEditingGestor] = useState<Gestor | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [gestorToDelete, setGestorToDelete] = useState<Gestor | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    unidades: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredGestores = gestores.filter(g => {
    const matchesSearch = 
      g.nome.toLowerCase().includes(search.toLowerCase()) ||
      g.whatsapp.includes(search) ||
      g.unidades.some(u => u.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredGestores.length / pageSize);
  const paginatedGestores = filteredGestores.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const resetForm = () => {
    setFormData({
      nome: '',
      whatsapp: '',
      unidades: [],
    });
    setFormErrors({});
    setEditingGestor(null);
  };

  const openEditDialog = (gestor: Gestor) => {
    setEditingGestor(gestor);
    setFormData({
      nome: gestor.nome,
      whatsapp: gestor.whatsapp,
      unidades: gestor.unidades,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 3) {
      errors.nome = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp é obrigatório';
    } else if (formData.whatsapp.trim().length < 10) {
      errors.whatsapp = 'WhatsApp deve ter pelo menos 10 dígitos';
    }

    if (formData.unidades.length === 0) {
      errors.unidades = 'Selecione pelo menos uma unidade';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (editingGestor) {
        await updateGestor({
          id: editingGestor.id,
          updates: {
            nome: formData.nome.trim().toUpperCase(),
            whatsapp: formData.whatsapp.trim(),
            unidades: formData.unidades,
          },
        });
      } else {
        await addGestor({
          nome: formData.nome.trim().toUpperCase(),
          whatsapp: formData.whatsapp.trim(),
          unidades: formData.unidades,
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteClick = (gestor: Gestor) => {
    setGestorToDelete(gestor);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!gestorToDelete) return;
    
    try {
      await deleteGestor(gestorToDelete.id);
      await refetch();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setDeleteConfirmOpen(false);
      setGestorToDelete(null);
    }
  };

  const toggleUnidade = (unidadeNome: string) => {
    setFormData(prev => ({
      ...prev,
      unidades: prev.unidades.includes(unidadeNome)
        ? prev.unidades.filter(u => u !== unidadeNome)
        : [...prev.unidades, unidadeNome]
    }));
    if (formErrors.unidades) {
      setFormErrors(prev => ({ ...prev, unidades: '' }));
    }
  };

  const selectAllUnidades = () => {
    setFormData(prev => ({
      ...prev,
      unidades: unidades.map(u => u.nome)
    }));
    if (formErrors.unidades) {
      setFormErrors(prev => ({ ...prev, unidades: '' }));
    }
  };

  const clearUnidades = () => {
    setFormData(prev => ({
      ...prev,
      unidades: []
    }));
  };

  const isSaving = isAdding || isUpdating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <UserCog className="text-primary" size={32} />
            Números
          </h1>
          <p className="text-muted-foreground mt-1">Gestores e números para alertas de SLA</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-accent-gradient">
              <Plus size={20} className="mr-2" />
              Novo Gestor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl flex items-center gap-2">
                {editingGestor ? (
                  <>
                    <Pencil size={20} className="text-primary" />
                    Editar Gestor
                  </>
                ) : (
                  <>
                    <Plus size={20} className="text-primary" />
                    Novo Gestor
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-1">
                  Nome do Gestor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, nome: e.target.value }));
                    if (formErrors.nome) setFormErrors(prev => ({ ...prev, nome: '' }));
                  }}
                  placeholder="Digite o nome do gestor"
                  className={formErrors.nome ? 'border-destructive' : ''}
                />
                {formErrors.nome && (
                  <p className="text-destructive text-xs">{formErrors.nome}</p>
                )}
              </div>
              
              {/* WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-1">
                  <Phone size={14} className="text-muted-foreground" />
                  WhatsApp <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ddd"
                    value={formData.whatsapp.slice(0, 2)}
                    onChange={(e) => {
                      const ddd = e.target.value.replace(/\D/g, '').slice(0, 2);
                      const numero = formData.whatsapp.slice(2);
                      setFormData(prev => ({ ...prev, whatsapp: ddd + numero }));
                      if (formErrors.whatsapp) setFormErrors(prev => ({ ...prev, whatsapp: '' }));
                    }}
                    placeholder="DDD"
                    className={cn("w-20", formErrors.whatsapp ? 'border-destructive' : '')}
                    maxLength={2}
                  />
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp.slice(2)}
                    onChange={(e) => {
                      const numero = e.target.value.replace(/\D/g, '').slice(0, 9);
                      const ddd = formData.whatsapp.slice(0, 2);
                      setFormData(prev => ({ ...prev, whatsapp: ddd + numero }));
                      if (formErrors.whatsapp) setFormErrors(prev => ({ ...prev, whatsapp: '' }));
                    }}
                    placeholder="999999999"
                    className={cn("flex-1", formErrors.whatsapp ? 'border-destructive' : '')}
                    maxLength={9}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  DDD + número (ex: 11 + 999999999)
                </p>
                {formErrors.whatsapp && (
                  <p className="text-destructive text-xs">{formErrors.whatsapp}</p>
                )}
              </div>
              
              {/* Unidades */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Building2 size={14} className="text-muted-foreground" />
                    Unidades <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({formData.unidades.length} selecionada{formData.unidades.length !== 1 ? 's' : ''})
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllUnidades}
                      className="text-xs h-7"
                    >
                      Selecionar todas
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearUnidades}
                      className="text-xs h-7"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                <ScrollArea className={cn(
                  "h-32 rounded-md border p-3",
                  formErrors.unidades ? 'border-destructive' : 'border-input'
                )}>
                  {isLoadingUnidades ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  ) : unidades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma unidade cadastrada
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {unidades.map(unidade => (
                        <label
                          key={unidade.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                            formData.unidades.includes(unidade.nome)
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted"
                          )}
                        >
                          <Checkbox
                            checked={formData.unidades.includes(unidade.nome)}
                            onCheckedChange={() => toggleUnidade(unidade.nome)}
                          />
                          <span className="text-sm">{unidade.nome}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {formErrors.unidades && (
                  <p className="text-destructive text-xs">{formErrors.unidades}</p>
                )}
              </div>
              
              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 btn-accent-gradient"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Salvando...
                    </>
                  ) : editingGestor ? 'Salvar Alterações' : 'Adicionar Gestor'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, número ou unidade..."
          className="flex-1"
        />
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Exibindo {paginatedGestores.length} de {filteredGestores.length} gestor(es)
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left p-4 font-semibold">Nome</th>
                <th className="text-left p-4 font-semibold">WhatsApp</th>
                <th className="text-left p-4 font-semibold">Unidades</th>
                <th className="text-right p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedGestores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    <UserCog size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum gestor encontrado</p>
                    <p className="text-sm">Adicione gestores para receber alertas de SLA</p>
                  </td>
                </tr>
              ) : (
                paginatedGestores.map((gestor) => (
                  <tr 
                    key={gestor.id} 
                    className="border-b border-border hover:bg-primary/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="text-primary" size={20} />
                        </div>
                        <span className="font-medium">{gestor.nome}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone size={16} />
                        <span>({gestor.whatsapp.slice(0, 2)}) {gestor.whatsapp.slice(2)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {gestor.unidades.slice(0, 3).map((unidade, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary"
                            className="text-xs"
                          >
                            {unidade}
                          </Badge>
                        ))}
                        {gestor.unidades.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{gestor.unidades.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(gestor)}
                          className="h-8"
                        >
                          <Pencil size={14} className="mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(gestor)}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isDeleting}
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
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          totalItems={filteredGestores.length}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o gestor "{gestorToDelete?.nome}"?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Excluindo...
                </>
              ) : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
