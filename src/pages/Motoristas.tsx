import { useState, useEffect } from 'react';
import { unidades } from '@/data/mockData';
import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, MapPin, Hash, Truck, Users, Building, Loader2 } from 'lucide-react';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';

export default function Motoristas() {
  const { motoristas, isLoading, addMotorista, updateMotorista, deleteMotorista, importMotoristas } = useMotoristasDB();
  const [search, setSearch] = useState('');
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

  const filteredMotoristas = motoristas.filter(m => 
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
  }, [search, pageSize]);

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
      await updateMotorista(editingMotorista.id, formData);
    } else {
      await addMotorista(formData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteMotorista(id);
  };

  const handleImportCSV = async (importedMotoristas: Motorista[]) => {
    await importMotoristas(importedMotoristas);
  };

  const getFuncaoLabel = (funcao: FuncaoMotorista) => {
    return funcao === 'ajudante_entrega' ? 'Ajudante' : 'Motorista';
  };

  const getSetorLabel = (setor: SetorMotorista) => {
    return setor === 'interior' ? 'Interior' : 'Sede';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <Truck className="text-primary" size={32} />
            Motoristas
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os motoristas cadastrados</p>
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

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome ou código..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="bg-card rounded-xl p-6 shadow-md animate-fade-in overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-4 rounded-tl-lg">Nome</th>
                  <th className="text-left p-4">Código</th>
                  <th className="text-left p-4">Função</th>
                  <th className="text-left p-4">Setor</th>
                  <th className="text-left p-4">Unidade</th>
                  <th className="text-right p-4 rounded-tr-lg">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMotoristas.map((motorista) => (
                  <tr 
                    key={motorista.id} 
                    className="border-b border-border"
                  >
                    <td className="p-4 font-medium">{motorista.nome}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Hash size={14} />
                        {motorista.codigo}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        motorista.funcao === 'ajudante_entrega' 
                          ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' 
                          : 'bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}>
                        <Users size={12} />
                        {getFuncaoLabel(motorista.funcao)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        motorista.setor === 'interior' 
                          ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' 
                          : 'bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}>
                        <Building size={12} />
                        {getSetorLabel(motorista.setor)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin size={14} />
                        {motorista.unidade}
                      </span>
                    </td>
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
    </div>
  );
}
