import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { TablePagination } from '@/components/ui/TablePagination';
import { Repeat, Eye, Package, MapPin, Phone, Mail, Calendar, Clock, FileText, ImageIcon, MessageSquare, Send, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getDirectStorageUrl } from '@/utils/urlHelpers';

interface TrocaProtocolo {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: string;
  causa: string | null;
  codigo_pdv: string | null;
  motorista_nome: string;
  motorista_unidade: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  observacao_geral: string | null;
  created_at: string | null;
  observacoes_log: unknown;
  fotos_protocolo: unknown;
  produtos: unknown;
}

const parseProdutos = (raw: unknown): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseLogs = (raw: unknown): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseFotos = (raw: unknown): string[] => {
  if (!raw) return [];
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const arr = obj.fotosTroca;
    if (Array.isArray(arr)) return arr as string[];
  }
  return [];
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aberto':
      return <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10">Aberto</Badge>;
    case 'em_andamento':
      return <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10">Em andamento</Badge>;
    case 'encerrado':
      return <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10">Encerrado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Trocas() {
  const { user, isAdmin } = useAuth();
  const { unidades } = useUnidadesDB();
  const { registrarLog } = useAuditLog();
  const [trocas, setTrocas] = useState<TrocaProtocolo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('aberto');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');
  const [selected, setSelected] = useState<TrocaProtocolo | null>(null);
  const [encerramentoMsg, setEncerramentoMsg] = useState('');
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchTrocas = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, causa, codigo_pdv, motorista_nome, motorista_unidade, contato_whatsapp, contato_email, observacao_geral, created_at, observacoes_log, fotos_protocolo, produtos')
        .eq('tipo_reposicao', 'troca')
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      setTrocas((data || []) as TrocaProtocolo[]);
    } catch (err) {
      console.error('Erro ao buscar trocas:', err);
      toast.error('Erro ao carregar trocas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrocas();
  }, [fetchTrocas]);

  const userUnidades = useMemo(
    () => (user?.unidade || '').split(',').map(u => u.trim()).filter(Boolean),
    [user?.unidade]
  );

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return trocas.filter(t => {
      // unidade visibility
      if (!isAdmin) {
        if (!userUnidades.includes(t.motorista_unidade || '')) return false;
      }
      if (unidadeFiltro !== 'todas' && t.motorista_unidade !== unidadeFiltro) return false;
      if (activeTab !== 'todos' && t.status !== activeTab) return false;
      if (s) {
        const match =
          t.numero.toLowerCase().includes(s) ||
          (t.motorista_nome || '').toLowerCase().includes(s) ||
          (t.codigo_pdv || '').toLowerCase().includes(s) ||
          (t.causa || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [trocas, isAdmin, userUnidades, unidadeFiltro, activeTab, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, unidadeFiltro, pageSize]);

  const counts = useMemo(() => {
    const visible = trocas.filter(t => isAdmin || userUnidades.includes(t.motorista_unidade || ''));
    return {
      aberto: visible.filter(t => t.status === 'aberto').length,
      em_andamento: visible.filter(t => t.status === 'em_andamento').length,
      encerrado: visible.filter(t => t.status === 'encerrado').length,
    };
  }, [trocas, isAdmin, userUnidades]);

  const buildLog = (acao: string, texto: string) => ({
    id: Date.now().toString(),
    usuarioNome: user?.nome || 'Sistema',
    usuarioId: user?.id || '',
    data: format(new Date(), 'dd/MM/yyyy'),
    hora: format(new Date(), 'HH:mm'),
    acao,
    texto,
  });

  const handleMarcarAndamento = async () => {
    if (!selected) return;
    setAcaoLoading(true);
    try {
      const logs = parseLogs(selected.observacoes_log);
      const novoLog = buildLog('Marcou como em andamento', 'Troca movida para em andamento');
      const { error } = await supabase
        .from('protocolos')
        .update({ status: 'em_andamento', observacoes_log: [...logs, novoLog] as any })
        .eq('id', selected.id);
      if (error) throw error;
      await registrarLog({
        acao: 'edicao',
        tabela: 'protocolos',
        registro_id: selected.id,
        registro_dados: { numero: selected.numero, status: 'em_andamento', tipo: 'troca' },
        usuario_nome: user?.nome || '',
        usuario_role: user?.nivel,
        usuario_unidade: user?.unidade,
      });
      toast.success('Troca marcada como em andamento');
      setSelected(null);
      fetchTrocas();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status');
    } finally {
      setAcaoLoading(false);
    }
  };

  const handleEncerrar = async () => {
    if (!selected) return;
    setAcaoLoading(true);
    try {
      const logs = parseLogs(selected.observacoes_log);
      const novoLog = buildLog(
        'Encerrou o protocolo',
        encerramentoMsg.trim() || 'Troca encerrada'
      );
      const { error } = await supabase
        .from('protocolos')
        .update({
          status: 'encerrado',
          observacoes_log: [...logs, novoLog] as any,
          mensagem_encerramento: encerramentoMsg.trim() || null,
        })
        .eq('id', selected.id);
      if (error) throw error;
      await registrarLog({
        acao: 'encerramento',
        tabela: 'protocolos',
        registro_id: selected.id,
        registro_dados: { numero: selected.numero, tipo: 'troca' },
        usuario_nome: user?.nome || '',
        usuario_role: user?.nivel,
        usuario_unidade: user?.unidade,
      });
      toast.success('Troca encerrada');
      setEncerramentoMsg('');
      setSelected(null);
      fetchTrocas();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao encerrar');
    } finally {
      setAcaoLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!selected) return;
    if (!isAdmin) {
      toast.error('Apenas admin pode excluir');
      return;
    }
    if (!confirm('Excluir esta troca?')) return;
    setAcaoLoading(true);
    try {
      const { error } = await supabase
        .from('protocolos')
        .update({ ativo: false })
        .eq('id', selected.id);
      if (error) throw error;
      await registrarLog({
        acao: 'exclusao',
        tabela: 'protocolos',
        registro_id: selected.id,
        registro_dados: { numero: selected.numero, tipo: 'troca' },
        usuario_nome: user?.nome || '',
        usuario_role: user?.nivel,
        usuario_unidade: user?.unidade,
      });
      toast.success('Troca excluída');
      setSelected(null);
      fetchTrocas();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir');
    } finally {
      setAcaoLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6 text-primary" /> Trocas
          </h1>
          <p className="text-sm text-muted-foreground">Protocolos de troca abertos pelos RNs</p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1.5">
            <span className="text-muted-foreground">Abertos:</span> <span className="font-bold text-amber-600">{counts.aberto}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg px-3 py-1.5">
            <span className="text-muted-foreground">Em andamento:</span> <span className="font-bold text-blue-600">{counts.em_andamento}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-1.5">
            <span className="text-muted-foreground">Encerrados:</span> <span className="font-bold text-emerald-600">{counts.encerrado}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número, RN, PDV ou causa..."
          className="flex-1 min-w-[240px]"
        />
        {isAdmin && (
          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as unidades</SelectItem>
              {unidades.map(u => (
                <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="aberto">Abertos</TabsTrigger>
          <TabsTrigger value="em_andamento">Em andamento</TabsTrigger>
          <TabsTrigger value="encerrado">Encerrados</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Repeat className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Nenhuma troca encontrada</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {paginated.map(t => {
            const prods = parseProdutos(t.produtos);
            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                onClick={() => setSelected(t)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-bold text-sm">#{t.numero}</span>
                        {getStatusBadge(t.status)}
                        {t.causa && <Badge variant="secondary" className="text-[10px]">{t.causa}</Badge>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>RN: <span className="text-foreground">{t.motorista_nome}</span></span>
                        <span>PDV: <span className="text-foreground">{t.codigo_pdv || '—'}</span></span>
                        <span>Unidade: <span className="text-foreground">{t.motorista_unidade || '—'}</span></span>
                        <span>Data: <span className="text-foreground">{t.data} {t.hora}</span></span>
                        <span>Produtos: <span className="text-foreground">{prods.length}</span></span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye size={14} /> Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length > pageSize && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (() => {
            const prods = parseProdutos(selected.produtos);
            const logs = parseLogs(selected.observacoes_log);
            const fotos = parseFotos(selected.fotos_protocolo);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <Repeat className="w-5 h-5 text-primary" />
                    <span className="font-mono">#{selected.numero}</span>
                    {getStatusBadge(selected.status)}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">RN:</span> <span className="font-medium">{selected.motorista_nome}</span></div>
                    <div><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{selected.motorista_unidade || '—'}</span></div>
                    <div><span className="text-muted-foreground">PDV:</span> <span className="font-medium">{selected.codigo_pdv || '—'}</span></div>
                    <div><span className="text-muted-foreground">Causa:</span> <span className="font-medium">{selected.causa || '—'}</span></div>
                    <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{selected.data} {selected.hora}</span></div>
                    <div><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{selected.contato_whatsapp || '—'}</span></div>
                    {selected.contato_email && (
                      <div className="col-span-2"><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{selected.contato_email}</span></div>
                    )}
                    {selected.observacao_geral && (
                      <div className="col-span-2"><span className="text-muted-foreground">Obs:</span> <span className="font-medium">{selected.observacao_geral}</span></div>
                    )}
                  </div>

                  {prods.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Package size={14} /> Produtos ({prods.length})</h4>
                      <div className="border border-border rounded-lg divide-y divide-border">
                        {prods.map((p, i) => (
                          <div key={i} className="p-2 text-sm flex items-center justify-between">
                            <span>{p.codigo ? `${p.codigo} - ` : ''}{p.nome || p.produto}</span>
                            <Badge variant="outline">{p.quantidade} {p.unidade || ''}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {fotos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Fotos ({fotos.length})</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {fotos.map((url, i) => (
                          <a key={i} href={getDirectStorageUrl(url)} target="_blank" rel="noopener noreferrer" className="aspect-square block rounded-lg overflow-hidden border border-border hover:opacity-80">
                            <img src={getDirectStorageUrl(url)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {logs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> Histórico</h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {logs.map((l, i) => (
                          <div key={i} className="text-xs bg-muted/40 rounded p-2">
                            <div className="font-medium">{l.acao} <span className="text-muted-foreground font-normal">por {l.usuarioNome}</span></div>
                            <div className="text-muted-foreground">{l.data} {l.hora} — {l.texto}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.status !== 'encerrado' && (
                    <div className="border-t border-border pt-3 space-y-2">
                      {selected.status === 'aberto' && (
                        <Button onClick={handleMarcarAndamento} disabled={acaoLoading} variant="outline" className="w-full gap-2">
                          <Clock size={14} /> Marcar como em andamento
                        </Button>
                      )}
                      <Textarea
                        placeholder="Mensagem de encerramento (opcional)"
                        value={encerramentoMsg}
                        onChange={e => setEncerramentoMsg(e.target.value)}
                        rows={2}
                      />
                      <Button onClick={handleEncerrar} disabled={acaoLoading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle size={14} /> Encerrar troca
                      </Button>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="border-t border-border pt-3">
                      <Button onClick={handleExcluir} disabled={acaoLoading} variant="destructive" size="sm" className="gap-2">
                        <Trash2 size={14} /> Excluir
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
