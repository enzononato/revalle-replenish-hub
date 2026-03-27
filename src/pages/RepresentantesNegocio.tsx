import { useState, useEffect } from 'react';
import { unidades } from '@/data/mockData';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/TablePagination';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Briefcase, Loader2 } from 'lucide-react';
import { useRepresentantesDB, RepresentanteDB } from '@/hooks/useRepresentantesDB';
import { useAuth } from '@/contexts/AuthContext';
import { ImportarRepresentantesCSV } from '@/components/ImportarRepresentantesCSV';

export default function RepresentantesNegocio() {
  const { representantes, isLoading, addRepresentante, updateRepresentante, deleteRepresentante } = useRepresentantesDB();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState('todas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RepresentanteDB | null>(null);
  const [formData, setFormData] = useState({ nome: '', cpf: '', unidade: '', senha: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = representantes
    .filter(r => unidadeFiltro === 'todas' || r.unidade === unidadeFiltro)
    .filter(r => {
      const s = search.toLowerCase().replace(/[.\-]/g, '');
      return r.nome.toLowerCase().includes(s) || r.cpf.replace(/[.\-]/g, '').includes(s);
    });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, unidadeFiltro, pageSize]);

  const resetForm = () => { setFormData({ nome: '', cpf: '', unidade: '', senha: '' }); setEditing(null); };

  const openEdit = (rn: RepresentanteDB) => {
    setEditing(rn);
    setFormData({ nome: rn.nome, cpf: rn.cpf, unidade: rn.unidade, senha: '' });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const updateData: Record<string, unknown> = { nome: formData.nome, cpf: formData.cpf.replace(/\D/g, ''), unidade: formData.unidade };
      if (formData.senha) updateData.senha = formData.senha;
      await updateRepresentante(editing.id, updateData);
    } else {
      await addRepresentante({ ...formData, cpf: formData.cpf.replace(/\D/g, '') });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRepresentante(deleteId); setDeleteId(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="text-primary" size={32} />
            Representantes de Negócio
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os RN's e suas unidades</p>
        </div>
        <div className="flex gap-2">
          <ImportarRepresentantesCSV />
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-accent-gradient"><Plus size={20} className="mr-2" />Novo RN</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{editing ? 'Editar RN' : 'Novo RN'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={formData.cpf} onChange={e => setFormData(p => ({ ...p, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="Somente números" required />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={formData.unidade} onValueChange={v => setFormData(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Senha{editing && <span className="text-xs text-muted-foreground ml-2">(deixe em branco para manter)</span>}</Label>
                <Input type="password" value={formData.senha} onChange={e => setFormData(p => ({ ...p, senha: e.target.value }))} required={!editing} />
              </div>
              <Button type="submit" className="w-full">{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou CPF..." className="flex-1" />
        {isAdmin && (
          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Unidades</SelectItem>
              {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">CPF</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unidade</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr></thead>
                <tbody>
                  {paginated.map(rn => (
                    <tr key={rn.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{rn.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{rn.cpf}</td>
                      <td className="px-4 py-3 text-muted-foreground">{rn.unidade}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(rn)}><Pencil size={16} /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(rn.id)}><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum RN encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} totalItems={filtered.length} />
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir RN?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
