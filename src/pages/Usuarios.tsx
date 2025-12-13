import { useState } from 'react';
import { User } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, Shield, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { unidades } from '@/data/mockData';
import { cn } from '@/lib/utils';

const mockUsuarios: User[] = [
  { id: '1', nome: 'Administrador', email: 'admin@revalle.com', nivel: 'admin', unidade: 'Matriz' },
  { id: '2', nome: 'Operador', email: 'operador@revalle.com', nivel: 'comum', unidade: 'Filial 01' },
  { id: '3', nome: 'Maria Silva', email: 'maria@revalle.com', nivel: 'comum', unidade: 'Filial 02' },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<User[]>(mockUsuarios);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    nivel: 'comum' as 'admin' | 'comum',
    unidade: '',
  });

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      nivel: 'comum',
      unidade: '',
    });
    setEditingUsuario(null);
  };

  const openEditDialog = (usuario: User) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      nivel: usuario.nivel,
      unidade: usuario.unidade,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUsuario) {
      setUsuarios(prev => prev.map(u => 
        u.id === editingUsuario.id 
          ? { ...u, ...formData }
          : u
      ));
      toast.success('Usuário atualizado com sucesso!');
    } else {
      const newUsuario: User = {
        id: String(Date.now()),
        ...formData,
      };
      setUsuarios(prev => [...prev, newUsuario]);
      toast.success('Usuário cadastrado com sucesso!');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (id === '1') {
      toast.error('Não é possível excluir o administrador principal');
      return;
    }
    setUsuarios(prev => prev.filter(u => u.id !== id));
    toast.success('Usuário excluído com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie os usuários do sistema</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-accent-gradient">
              <Plus size={20} className="mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  required={!editingUsuario}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel">Nível</Label>
                  <Select
                    value={formData.nivel}
                    onValueChange={(value: 'admin' | 'comum') => setFormData(prev => ({ ...prev, nivel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="comum">Comum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
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
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-primary-gradient">
                  {editingUsuario ? 'Salvar' : 'Cadastrar'}
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
        placeholder="Buscar por nome ou email..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="card-stats animate-fade-in overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left p-4 rounded-tl-lg">Usuário</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Nível</th>
              <th className="text-left p-4">Unidade</th>
              <th className="text-right p-4 rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map((usuario) => (
              <tr 
                key={usuario.id} 
                className="border-b border-border"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      usuario.nivel === 'admin' ? "bg-primary/10" : "bg-muted"
                    )}>
                      {usuario.nivel === 'admin' ? (
                        <Shield className="text-primary" size={18} />
                      ) : (
                        <UserCircle className="text-muted-foreground" size={18} />
                      )}
                    </div>
                    <span className="font-medium">{usuario.nome}</span>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{usuario.email}</td>
                <td className="p-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium",
                    usuario.nivel === 'admin' 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {usuario.nivel === 'admin' ? 'Administrador' : 'Comum'}
                  </span>
                </td>
                <td className="p-4">{usuario.unidade}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(usuario)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(usuario.id)}
                      className="text-destructive hover:text-destructive/80"
                      disabled={usuario.id === '1'}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
