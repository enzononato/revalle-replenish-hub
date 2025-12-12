import { useState } from 'react';
import { mockMotoristas, unidades } from '@/data/mockData';
import { Motorista } from '@/types';
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
import { Plus, Pencil, Trash2, Phone, MapPin, Hash } from 'lucide-react';
import { toast } from 'sonner';

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>(mockMotoristas);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState<Motorista | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    dataNascimento: '',
    unidade: '',
    senha: '',
    whatsapp: '',
    codigoPdv: '',
  });

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase()) ||
    m.whatsapp.includes(search) ||
    m.codigoPdv?.includes(search)
  );

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      dataNascimento: '',
      unidade: '',
      senha: '',
      whatsapp: '',
      codigoPdv: '',
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
      senha: '',
      whatsapp: motorista.whatsapp,
      codigoPdv: motorista.codigoPdv || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMotorista) {
      setMotoristas(prev => prev.map(m => 
        m.id === editingMotorista.id 
          ? { ...m, ...formData }
          : m
      ));
      toast.success('Motorista atualizado com sucesso!');
    } else {
      const newMotorista: Motorista = {
        id: String(Date.now()),
        ...formData,
        createdAt: new Date().toISOString(),
      };
      setMotoristas(prev => [...prev, newMotorista]);
      toast.success('Motorista cadastrado com sucesso!');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setMotoristas(prev => prev.filter(m => m.id !== id));
    toast.success('Motorista excluído com sucesso!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Motoristas</h1>
          <p className="text-muted-foreground mt-1">Gerencie os motoristas cadastrados</p>
        </div>
        
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
                  <Label htmlFor="codigo">Código do Motorista</Label>
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
                    required
                  />
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
                
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="11999998888"
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
                    required={!editingMotorista}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codigoPdv">Código do PDV (opcional)</Label>
                  <Input
                    id="codigoPdv"
                    value={formData.codigoPdv}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigoPdv: e.target.value }))}
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

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome, código, WhatsApp ou PDV..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="card-stats animate-fade-in overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left p-4 rounded-tl-lg">Nome</th>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">Unidade</th>
              <th className="text-left p-4">WhatsApp</th>
              <th className="text-left p-4">Código PDV</th>
              <th className="text-right p-4 rounded-tr-lg">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredMotoristas.map((motorista) => (
              <tr 
                key={motorista.id} 
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="p-4 font-medium">{motorista.nome}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Hash size={14} />
                    {motorista.codigo}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin size={14} />
                    {motorista.unidade}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Phone size={14} />
                    {motorista.whatsapp}
                  </span>
                </td>
                <td className="p-4">{motorista.codigoPdv || '-'}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(motorista)}
                      className="text-primary hover:text-primary/80"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(motorista.id)}
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
        
        {filteredMotoristas.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum motorista encontrado
          </div>
        )}
      </div>
    </div>
  );
}
