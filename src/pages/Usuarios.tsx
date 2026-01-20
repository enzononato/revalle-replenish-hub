import { useState, useEffect } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/TablePagination';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Pencil, Trash2, Shield, UserCircle, Truck, Users, Loader2, Mail, Building2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUsuariosDB, Usuario } from '@/hooks/useUsuariosDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

type UserRole = 'admin' | 'distribuicao' | 'conferente';

const nivelLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  distribuicao: 'Distribuição',
  conferente: 'Conferente',
};

const nivelDescriptions: Record<UserRole, string> = {
  admin: 'Acesso total ao sistema',
  distribuicao: 'Gerencia protocolos e distribuição',
  conferente: 'Confere e valida protocolos',
};

export default function Usuarios() {
  const { usuarios, isLoading, addUsuario, updateUsuario, deleteUsuario, isAdding, isUpdating, isDeleting, refetch } = useUsuariosDB();
  const { unidades, isLoading: isLoadingUnidades } = useUnidadesDB();
  const { isAdmin, user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState<string>('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    nivel: 'conferente' as UserRole,
    unidades: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredUsuarios = usuarios.filter(u => {
    const matchesSearch = 
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesNivel = filterNivel === 'todos' || u.nivel === filterNivel;
    return matchesSearch && matchesNivel;
  });

  const totalPages = Math.ceil(filteredUsuarios.length / pageSize);
  const paginatedUsuarios = filteredUsuarios.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterNivel, pageSize]);

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      nivel: 'conferente',
      unidades: [],
    });
    setFormErrors({});
    setEditingUsuario(null);
    setShowPassword(false);
  };

  const openEditDialog = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      nivel: usuario.nivel,
      unidades: usuario.unidades,
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

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!editingUsuario && !formData.senha.trim()) {
      errors.senha = 'Senha é obrigatória para novos usuários';
    } else if (!editingUsuario && formData.senha.length < 6) {
      errors.senha = 'Senha deve ter pelo menos 6 caracteres';
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
      if (editingUsuario) {
        await updateUsuario({
          id: editingUsuario.id,
          updates: {
            nome: formData.nome.trim(),
            email: formData.email.trim(),
            nivel: formData.nivel,
            unidades: formData.unidades,
          },
          newPassword: formData.senha.trim() || undefined,
        });
      } else {
        await addUsuario({
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          senha: formData.senha,
          nivel: formData.nivel,
          unidades: formData.unidades,
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!usuarioToDelete) return;
    
    try {
      await deleteUsuario(usuarioToDelete.id);
      // Forçar refresh da lista após exclusão
      await refetch();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setDeleteConfirmOpen(false);
      setUsuarioToDelete(null);
    }
  };

  const toggleUnidade = (unidadeNome: string) => {
    setFormData(prev => ({
      ...prev,
      unidades: prev.unidades.includes(unidadeNome)
        ? prev.unidades.filter(u => u !== unidadeNome)
        : [...prev.unidades, unidadeNome]
    }));
    // Clear error when user selects
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

  const getNivelIcon = (nivel: UserRole) => {
    switch (nivel) {
      case 'admin':
        return <Shield className="text-primary" size={18} />;
      case 'distribuicao':
        return <Truck className="text-info" size={18} />;
      default:
        return <UserCircle className="text-muted-foreground" size={18} />;
    }
  };

  const getNivelBadgeStyle = (nivel: UserRole) => {
    switch (nivel) {
      case 'admin':
        return "bg-primary/10 text-primary border-primary/20";
      case 'distribuicao':
        return "bg-info/10 text-info border-info/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const isSaving = isAdding || isUpdating;

  return (
    <div className="space-y-6">
      {/* Alerta para não-admins */}
      {!isAdmin && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para criar ou excluir usuários. Apenas administradores podem gerenciar usuários.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="text-primary" size={32} />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os acessos ao sistema</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-accent-gradient" disabled={!isAdmin}>
              <Plus size={20} className="mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl flex items-center gap-2">
                {editingUsuario ? (
                  <>
                    <Pencil size={20} className="text-primary" />
                    Editar Usuário
                  </>
                ) : (
                  <>
                    <Plus size={20} className="text-primary" />
                    Novo Acesso ao Sistema
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome" className="flex items-center gap-1">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, nome: e.target.value }));
                    if (formErrors.nome) setFormErrors(prev => ({ ...prev, nome: '' }));
                  }}
                  placeholder="Digite o nome completo"
                  className={formErrors.nome ? 'border-destructive' : ''}
                />
                {formErrors.nome && (
                  <p className="text-destructive text-xs">{formErrors.nome}</p>
                )}
              </div>
              
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail size={14} className="text-muted-foreground" />
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="usuario@email.com"
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-destructive text-xs">{formErrors.email}</p>
                )}
              </div>
              
              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="senha" className="flex items-center gap-1">
                  Senha {!editingUsuario && <span className="text-destructive">*</span>}
                  {editingUsuario && <span className="text-muted-foreground text-xs">(deixe em branco para manter)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, senha: e.target.value }));
                      if (formErrors.senha) setFormErrors(prev => ({ ...prev, senha: '' }));
                    }}
                    placeholder={editingUsuario ? '••••••••' : 'Mínimo 6 caracteres'}
                    className={cn("pr-10", formErrors.senha ? 'border-destructive' : '')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                {formErrors.senha && (
                  <p className="text-destructive text-xs">{formErrors.senha}</p>
                )}
              </div>
              
              {/* Nível de Acesso */}
              <div className="space-y-2">
                <Label htmlFor="nivel" className="flex items-center gap-1">
                  Nível de Acesso <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.nivel}
                  onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, nivel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'distribuicao', 'conferente'] as UserRole[]).map(nivel => (
                      <SelectItem key={nivel} value={nivel}>
                        <div className="flex items-center gap-2">
                          {getNivelIcon(nivel)}
                          <div>
                            <span className="font-medium">{nivelLabels[nivel]}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              - {nivelDescriptions[nivel]}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Nenhuma unidade cadastrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {unidades.map(unidade => (
                        <div
                          key={unidade.id}
                          className="flex items-center space-x-2 py-1"
                        >
                          <Checkbox
                            id={`unidade-${unidade.id}`}
                            checked={formData.unidades.includes(unidade.nome)}
                            onCheckedChange={() => toggleUnidade(unidade.nome)}
                          />
                          <label
                            htmlFor={`unidade-${unidade.id}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1"
                          >
                            {unidade.nome}
                            <span className="text-muted-foreground text-xs ml-2">
                              ({unidade.codigo})
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {formErrors.unidades && (
                  <p className="text-destructive text-xs">{formErrors.unidades}</p>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary-gradient" disabled={isSaving}>
                  {isSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {editingUsuario ? 'Salvar Alterações' : 'Cadastrar Usuário'}
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
          placeholder="Buscar por nome ou email..."
          className="max-w-md"
        />
        <Select value={filterNivel} onValueChange={setFilterNivel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os níveis</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="distribuicao">Distribuição</SelectItem>
            <SelectItem value="conferente">Conferentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="text-2xl font-bold">{usuarios.length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Shield size={14} className="text-primary" /> Admins
          </p>
          <p className="text-2xl font-bold text-primary">
            {usuarios.filter(u => u.nivel === 'admin').length}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Truck size={14} className="text-info" /> Distribuição
          </p>
          <p className="text-2xl font-bold text-info">
            {usuarios.filter(u => u.nivel === 'distribuicao').length}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <UserCircle size={14} /> Conferentes
          </p>
          <p className="text-2xl font-bold">
            {usuarios.filter(u => u.nivel === 'conferente').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-md animate-fade-in overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuário</th>
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nível</th>
                <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Unidades</th>
                <th className="text-right p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    {search || filterNivel !== 'todos' ? 'Nenhum usuário encontrado com os filtros aplicados' : 'Nenhum usuário cadastrado'}
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((usuario) => (
                  <tr 
                    key={usuario.id} 
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          usuario.nivel === 'admin' ? "bg-primary/10" : 
                          usuario.nivel === 'distribuicao' ? "bg-info/10" : "bg-muted"
                        )}>
                          {getNivelIcon(usuario.nivel)}
                        </div>
                        <span className="font-medium">{usuario.nome}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail size={12} />
                        {usuario.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border",
                        getNivelBadgeStyle(usuario.nivel)
                      )}>
                        {nivelLabels[usuario.nivel]}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {usuario.unidades.length === 0 ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : usuario.unidades.length <= 2 ? (
                          usuario.unidades.map((unidade, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-0.5 bg-muted rounded text-xs"
                            >
                              {unidade}
                            </span>
                          ))
                        ) : (
                          <>
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">
                              {usuario.unidades[0]}
                            </span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              +{usuario.unidades.length - 1} mais
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(usuario)}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10"
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(usuario)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          disabled={isDeleting || !isAdmin || usuario.email === user?.email}
                          title={
                            !isAdmin 
                              ? 'Apenas administradores podem excluir' 
                              : usuario.email === user?.email 
                                ? 'Você não pode excluir seu próprio usuário'
                                : 'Excluir usuário'
                          }
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredUsuarios.length > 0 && (
          <div className="border-t">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredUsuarios.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita e o acesso ao sistema será revogado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 size={16} className="mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
