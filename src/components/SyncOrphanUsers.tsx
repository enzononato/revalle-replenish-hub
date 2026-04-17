import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, UserPlus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { MultiSelectUnidade } from '@/components/ui/MultiSelectUnidade';

interface OrphanUser {
  id: string;
  email: string;
  created_at?: string;
  last_sign_in_at?: string;
}

interface SyncErrorRow {
  id: string;
  user_email: string | null;
  error_message: string;
  error_context: string | null;
  created_at: string;
}

export function SyncOrphanUsers() {
  const { unidades } = useUnidadesDB();
  const [orphans, setOrphans] = useState<OrphanUser[]>([]);
  const [errors, setErrors] = useState<SyncErrorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total_auth: number; total_profiles: number } | null>(null);
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [selected, setSelected] = useState<OrphanUser | null>(null);
  const [nome, setNome] = useState('');
  const [nivel, setNivel] = useState<'admin' | 'distribuicao' | 'conferente' | 'controle'>('conferente');
  const [unidadesSel, setUnidadesSel] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<OrphanUser | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOrphans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-orphan-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOrphans(data.orphans || []);
      setStats({ total_auth: data.total_auth, total_profiles: data.total_profiles });

      // Load trigger errors
      const { data: errs } = await supabase
        .from('auth_sync_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setErrors((errs as SyncErrorRow[]) || []);
    } catch (e: unknown) {
      toast.error('Erro ao carregar: ' + (e instanceof Error ? e.message : 'desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const openAdopt = (o: OrphanUser) => {
    setSelected(o);
    setNome(o.email.split('@')[0]);
    setNivel('conferente');
    setUnidadesSel([]);
    setAdoptOpen(true);
  };

  const handleAdopt = async () => {
    if (!selected || !nome.trim() || unidadesSel.length === 0) {
      toast.error('Preencha nome e selecione ao menos uma unidade');
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-orphan-users', {
        body: {
          action: 'adopt',
          user_id: selected.id,
          email: selected.email,
          nome: nome.trim(),
          nivel,
          unidades: unidadesSel,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário adotado com sucesso!');
      setAdoptOpen(false);
      await loadOrphans();
    } catch (e: unknown) {
      toast.error('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-orphan-users', {
        body: { action: 'delete', user_id: confirmDelete.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Usuário removido do Auth');
      setConfirmDelete(null);
      await loadOrphans();
    } catch (e: unknown) {
      toast.error('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'));
    } finally {
      setBusy(false);
    }
  };

  const clearErrors = async () => {
    const { error } = await supabase
      .from('auth_sync_errors')
      .delete()
      .gte('created_at', '1900-01-01');
    if (error) {
      toast.error('Erro ao limpar log');
      return;
    }
    setErrors([]);
    toast.success('Log limpo');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            Sincronização de Usuários Órfãos
          </CardTitle>
          <CardDescription>
            Localize contas que existem no sistema de autenticação mas não possuem perfil cadastrado, e decida se devem ser adotadas ou removidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={loadOrphans} disabled={loading} variant="default">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Verificar agora
            </Button>
            {stats && (
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">Auth: {stats.total_auth}</Badge>
                <Badge variant="secondary">Perfis: {stats.total_profiles}</Badge>
                <Badge variant={orphans.length > 0 ? 'destructive' : 'outline'}>
                  Órfãos: {orphans.length}
                </Badge>
              </div>
            )}
          </div>

          {orphans.length > 0 && (
            <div className="border rounded-md divide-y">
              {orphans.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 p-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{o.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado: {o.created_at ? format(new Date(o.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                      {o.last_sign_in_at ? ` · Último login: ${format(new Date(o.last_sign_in_at), 'dd/MM/yyyy')}` : ' · Nunca logou'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => openAdopt(o)}>
                      <UserPlus size={14} /> Adotar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(o)}>
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {orphans.length === 0 && stats && (
            <p className="text-sm text-muted-foreground">Nenhum usuário órfão encontrado. ✅</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={18} />
            Falhas no Trigger de Criação ({errors.length})
          </CardTitle>
          <CardDescription>
            Erros capturados quando o sistema tentou criar perfis automaticamente. Útil para diagnóstico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>
          ) : (
            <>
              <div className="border rounded-md divide-y max-h-96 overflow-auto">
                {errors.map((e) => (
                  <div key={e.id} className="p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{e.user_email || '(sem email)'}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(e.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-destructive mt-1">{e.error_message}</p>
                    {e.error_context && <p className="text-muted-foreground mt-1">{e.error_context}</p>}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={clearErrors}>
                Limpar log
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Adopt dialog */}
      <Dialog open={adoptOpen} onOpenChange={setAdoptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adotar usuário órfão</DialogTitle>
            <DialogDescription>
              Cria o perfil e a permissão para <strong>{selected?.email}</strong>. Após salvar, ele poderá fazer login normalmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <Label>Nível</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as typeof nivel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="distribuicao">Distribuição</SelectItem>
                  <SelectItem value="conferente">Conferente</SelectItem>
                  <SelectItem value="controle">Controle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidades</Label>
              <MultiSelectUnidade
                unidades={unidades.map(u => ({ id: u.id, nome: u.nome }))}
                selected={unidadesSel}
                onChange={setUnidadesSel}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdoptOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdopt} disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={14} />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir do sistema de autenticação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente <strong>{confirmDelete?.email}</strong> do Auth. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={14} />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
