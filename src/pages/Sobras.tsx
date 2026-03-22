import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { ContentHeader } from '@/components/layout/ContentHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { TablePagination } from '@/components/ui/TablePagination';
import { Package, RefreshCw, Clock, CheckCircle, AlertTriangle, MapPin, FileText, Truck, Eye, ImageIcon, Warehouse, MessageSquare, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ObservacaoLog } from '@/types';
import { getDirectStorageUrl } from '@/utils/urlHelpers';
import { Textarea } from '@/components/ui/textarea';

interface SobraProtocolo {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: string;
  causa: string | null;
  mapa: string | null;
  nota_fiscal: string | null;
  codigo_pdv: string | null;
  motorista_nome: string;
  motorista_unidade: string | null;
  motorista_codigo: string | null;
  observacao_geral: string | null;
  created_at: string | null;
  observacoes_log: unknown;
  fotos_protocolo: unknown;
}

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Pendente' },
  { value: 'em_andamento', label: 'Em Tratamento' },
  { value: 'encerrado', label: 'Resolvido' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aberto':
      return <Badge variant="outline" className="whitespace-nowrap border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    case 'em_andamento':
      return <Badge variant="outline" className="whitespace-nowrap border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10"><AlertTriangle className="w-3 h-3 mr-1" />Em Tratamento</Badge>;
    case 'encerrado':
      return <Badge variant="outline" className="whitespace-nowrap border-green-500 text-green-600 bg-green-50 dark:bg-green-500/10"><CheckCircle className="w-3 h-3 mr-1" />Resolvido</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getTipoFromCausa = (causa: string | null): string => {
  if (!causa) return '-';
  const upper = causa.toUpperCase();
  if (upper.includes('INVERSÃO') || upper.includes('INVERSAO')) return 'Inversão';
  if (upper.includes('AVARIA')) return 'Avaria';
  if (upper.includes('ERRO DE CARREGAMENTO')) return 'Erro Carregamento';
  if (upper.includes('ERRO DE ENTREGA')) return 'Erro Entrega';
  return causa;
};

const getTipoBadgeColor = (causa: string | null): string => {
  if (!causa) return '';
  const upper = causa.toUpperCase();
  if (upper.includes('INVERSÃO') || upper.includes('INVERSAO')) return 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10';
  if (upper.includes('AVARIA')) return 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-500/10';
  if (upper.includes('ERRO DE CARREGAMENTO')) return 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-500/10';
  if (upper.includes('ERRO DE ENTREGA')) return 'border-red-500 text-red-600 bg-red-50 dark:bg-red-500/10';
  return '';
};

const ITEMS_PER_PAGE = 20;

export default function Sobras() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { registrarLog } = useAuditLog();
  const [sobras, setSobras] = useState<SobraProtocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(() => searchParams.get('status') || 'todos');
  const [filtroUnidade, setFiltroUnidade] = useState(() => {
    const unidadeParam = searchParams.get('unidade');
    return unidadeParam ? decodeURIComponent(unidadeParam).split(',')[0] : 'todas';
  });
  const [busca, setBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { unidades } = useUnidadesDB();
  const [totalCount, setTotalCount] = useState(0);
  const [contadores, setContadores] = useState({ pendente: 0, tratamento: 0, resolvido: 0 });
  const [detalheSobra, setDetalheSobra] = useState<SobraProtocolo | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const fetchContadores = useCallback(async () => {
    const [pRes, tRes, rRes] = await Promise.all([
      supabase.from('protocolos').select('*', { count: 'exact', head: true }).eq('tipo_reposicao', 'pos_rota').eq('status', 'aberto'),
      supabase.from('protocolos').select('*', { count: 'exact', head: true }).eq('tipo_reposicao', 'pos_rota').eq('status', 'em_andamento'),
      supabase.from('protocolos').select('*', { count: 'exact', head: true }).eq('tipo_reposicao', 'pos_rota').eq('status', 'encerrado'),
    ]);
    setContadores({
      pendente: pRes.count || 0,
      tratamento: tRes.count || 0,
      resolvido: rRes.count || 0,
    });
  }, []);

  const fetchSobras = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, causa, mapa, nota_fiscal, codigo_pdv, motorista_nome, motorista_unidade, motorista_codigo, observacao_geral, created_at, observacoes_log, fotos_protocolo', { count: 'exact' })
        .eq('tipo_reposicao', 'pos_rota')
        .order('created_at', { ascending: false });

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      if (filtroUnidade !== 'todas') {
        query = query.eq('motorista_unidade', filtroUnidade);
      }

      if (busca.trim()) {
        query = query.or(`numero.ilike.%${busca.trim()}%,motorista_nome.ilike.%${busca.trim()}%,mapa.ilike.%${busca.trim()}%,codigo_pdv.ilike.%${busca.trim()}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      setSobras((data || []) as SobraProtocolo[]);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erro ao buscar sobras:', err);
      toast.error('Erro ao carregar sobras');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroUnidade, busca, currentPage]);

  useEffect(() => {
    fetchSobras();
    fetchContadores();
  }, [fetchSobras, fetchContadores]);

  const handleStatusChange = async (sobra: SobraProtocolo, novoStatus: string) => {
    setUpdatingStatus(sobra.id);
    try {
      const logs = Array.isArray(sobra.observacoes_log) ? sobra.observacoes_log as ObservacaoLog[] : [];
      const novoLog: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: user?.nome || user?.email || 'Admin',
        usuarioId: user?.id || '',
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: novoStatus === 'em_andamento' ? 'Iniciou tratamento da sobra' : 'Marcou sobra como resolvida',
        texto: `Status alterado para ${novoStatus === 'em_andamento' ? 'Em Tratamento' : 'Resolvido'}`,
      };

      const { error } = await supabase
        .from('protocolos')
        .update({
          status: novoStatus,
          observacoes_log: JSON.stringify([...logs, novoLog]),
        })
        .eq('id', sobra.id);

      if (error) throw error;

      await registrarLog({
        acao: 'alterou_status_sobra',
        tabela: 'protocolos',
        registro_id: sobra.numero,
        registro_dados: { status_anterior: sobra.status, novo_status: novoStatus },
        usuario_nome: user?.nome || user?.email || 'Admin',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });

      toast.success(`Status atualizado para ${novoStatus === 'em_andamento' ? 'Em Tratamento' : 'Resolvido'}`);
      fetchSobras();
      fetchContadores();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const isErroCarregamento = (causa: string | null) => {
    return causa?.toUpperCase().includes('ERRO DE CARREGAMENTO') ?? false;
  };

  const handleDevolverEstoque = async (sobra: SobraProtocolo) => {
    setUpdatingStatus(sobra.id);
    try {
      const logs = Array.isArray(sobra.observacoes_log) ? sobra.observacoes_log as ObservacaoLog[] : [];
      const novoLog: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: user?.nome || user?.email || 'Admin',
        usuarioId: user?.id || '',
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: 'Produto devolvido ao estoque',
        texto: 'Erro de carregamento — produto retornado ao armazém',
      };

      const { error } = await supabase
        .from('protocolos')
        .update({
          status: 'encerrado',
          observacoes_log: JSON.stringify([...logs, novoLog]),
        })
        .eq('id', sobra.id);

      if (error) throw error;

      await registrarLog({
        acao: 'devolvido_estoque',
        tabela: 'protocolos',
        registro_id: sobra.numero,
        registro_dados: { causa: sobra.causa, status_anterior: sobra.status },
        usuario_nome: user?.nome || user?.email || 'Admin',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });

      toast.success('Produto devolvido ao estoque com sucesso');
      fetchSobras();
      fetchContadores();
    } catch (err) {
      console.error('Erro ao devolver ao estoque:', err);
      toast.error('Erro ao devolver ao estoque');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAdicionarComentario = async () => {
    if (!detalheSobra || !comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      const logs = Array.isArray(detalheSobra.observacoes_log) ? detalheSobra.observacoes_log as ObservacaoLog[] : [];
      const novoLog: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: user?.nome || user?.email || 'Admin',
        usuarioId: user?.id || '',
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: 'Comentário',
        texto: comentario.trim(),
      };

      const novoLogs = [...logs, novoLog];
      const { error } = await supabase
        .from('protocolos')
        .update({ observacoes_log: JSON.stringify(novoLogs) })
        .eq('id', detalheSobra.id);

      if (error) throw error;

      setDetalheSobra({ ...detalheSobra, observacoes_log: novoLogs });
      setComentario('');
      toast.success('Comentário adicionado');

      await registrarLog({
        acao: 'comentou_sobra',
        tabela: 'protocolos',
        registro_id: detalheSobra.numero,
        registro_dados: { comentario: comentario.trim() },
        usuario_nome: user?.nome || user?.email || 'Admin',
        usuario_role: user?.nivel || undefined,
        usuario_unidade: user?.unidade || undefined,
      });
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sobras em Rota</h1>
        <p className="text-sm text-muted-foreground">Gerencie os registros de pós-rota dos motoristas</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFiltroStatus('aberto'); setCurrentPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contadores.pendente}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFiltroStatus('em_andamento'); setCurrentPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contadores.tratamento}</p>
              <p className="text-sm text-muted-foreground">Em Tratamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFiltroStatus('encerrado'); setCurrentPage(1); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contadores.resolvido}</p>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por nº, motorista, mapa ou PDV..."
          className="w-full sm:max-w-xs"
        />
        <Select value={filtroStatus} onValueChange={(v) => { setFiltroStatus(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroUnidade} onValueChange={(v) => { setFiltroUnidade(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Unidades</SelectItem>
            {unidades.map(u => (
              <SelectItem key={u.id} value={u.nome}>{u.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => { fetchSobras(); fetchContadores(); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Nº Protocolo</TableHead>
                <TableHead className="min-w-[120px]">Data</TableHead>
                <TableHead className="min-w-[100px]">Mapa</TableHead>
                <TableHead className="min-w-[120px]">Tipo</TableHead>
                <TableHead className="min-w-[150px]">Motorista</TableHead>
                <TableHead className="min-w-[80px]">PDV</TableHead>
                <TableHead className="min-w-[80px]">NF</TableHead>
                <TableHead className="min-w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sobras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhuma sobra encontrada
                  </TableCell>
                </TableRow>
              ) : (
                sobras.map(sobra => (
                  <TableRow key={sobra.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-sm font-bold text-primary">
                      {sobra.numero}
                    </TableCell>
                    <TableCell className="text-sm">
                      {sobra.created_at ? format(parseISO(sobra.created_at), 'dd/MM/yy HH:mm') : sobra.data}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      <span className="flex items-center gap-1.5">
                        {sobra.mapa || '-'}
                        {(() => {
                          const fotos = sobra.fotos_protocolo as Record<string, unknown> | null;
                          const fotosSobra = fotos?.fotosSobra as string[] | undefined;
                          return fotosSobra && fotosSobra.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-primary" title={`${fotosSobra.length} foto(s)`}>
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span className="text-xs">{fotosSobra.length}</span>
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTipoBadgeColor(sobra.causa)}>
                        {getTipoFromCausa(sobra.causa)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{sobra.motorista_nome}</TableCell>
                    <TableCell className="font-mono text-sm">{sobra.codigo_pdv || '-'}</TableCell>
                    <TableCell className="text-sm">{sobra.nota_fiscal || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetalheSobra(sobra)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {sobra.status === 'aberto' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={updatingStatus === sobra.id}
                            onClick={() => handleStatusChange(sobra, 'em_andamento')}
                          >
                            Tratar
                          </Button>
                        )}
                        {isErroCarregamento(sobra.causa) && sobra.status !== 'encerrado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                            disabled={updatingStatus === sobra.id}
                            onClick={() => handleDevolverEstoque(sobra)}
                          >
                            <Warehouse className="w-3.5 h-3.5 mr-1" />
                            Estoque
                          </Button>
                        )}
                        {(sobra.status === 'aberto' || sobra.status === 'em_andamento') && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-green-600 hover:bg-green-700"
                            disabled={updatingStatus === sobra.id}
                            onClick={() => handleStatusChange(sobra, 'encerrado')}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={ITEMS_PER_PAGE}
          totalItems={totalCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={() => {}}
        />
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!detalheSobra} onOpenChange={(open) => { if (!open) { setDetalheSobra(null); setComentario(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Detalhes da Sobra
            </DialogTitle>
          </DialogHeader>
          {detalheSobra && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Número</p>
                  <p className="text-sm font-mono font-medium">{detalheSobra.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm">{detalheSobra.created_at ? format(parseISO(detalheSobra.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : detalheSobra.data}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mapa</p>
                  <p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{detalheSobra.mapa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className={getTipoBadgeColor(detalheSobra.causa)}>
                    {getTipoFromCausa(detalheSobra.causa)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="text-sm flex items-center gap-1"><Truck className="w-3.5 h-3.5" />{detalheSobra.motorista_nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="text-sm">{detalheSobra.motorista_unidade || '-'}</p>
                </div>
                {detalheSobra.codigo_pdv && (
                  <div>
                    <p className="text-xs text-muted-foreground">PDV</p>
                    <p className="text-sm font-mono">{detalheSobra.codigo_pdv}</p>
                  </div>
                )}
                {detalheSobra.nota_fiscal && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nota Fiscal</p>
                    <p className="text-sm font-mono">{detalheSobra.nota_fiscal}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(detalheSobra.status)}</div>
                </div>
              </div>

              {detalheSobra.observacao_geral && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observação</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">{detalheSobra.observacao_geral}</p>
                </div>
              )}

              {/* Fotos das sobras */}
              {(() => {
                const fotos = detalheSobra.fotos_protocolo as Record<string, unknown> | null;
                const fotosSobra = fotos?.fotosSobra as string[] | undefined;
                if (!fotosSobra || fotosSobra.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Fotos da Sobra ({fotosSobra.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {fotosSobra.map((url, i) => (
                        <a
                          key={i}
                          href={getDirectStorageUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                        >
                          <img
                            src={getDirectStorageUrl(url)}
                            alt={`Foto sobra ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Histórico */}
              {Array.isArray(detalheSobra.observacoes_log) && (detalheSobra.observacoes_log as ObservacaoLog[]).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Histórico</p>
                  <div className="space-y-2">
                    {(detalheSobra.observacoes_log as ObservacaoLog[]).map((log, i) => (
                      <div key={i} className="text-xs bg-muted/30 rounded-lg p-2.5 border border-border/30">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold">{log.acao}</span>
                          <span className="text-muted-foreground">{log.data} {log.hora}</span>
                        </div>
                        {log.texto && <p className="text-muted-foreground">{log.texto}</p>}
                        <p className="text-muted-foreground mt-0.5">por {log.usuarioNome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar comentário */}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Adicionar Comentário
                </p>
                <div className="flex gap-2">
                  <Textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Escreva um comentário sobre esta sobra..."
                    className="min-h-[60px] text-sm resize-none flex-1"
                  />
                  <Button
                    size="icon"
                    className="h-[60px] w-10 shrink-0"
                    disabled={!comentario.trim() || enviandoComentario}
                    onClick={handleAdicionarComentario}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Ações */}
              {detalheSobra.status !== 'encerrado' && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <div className="flex gap-2">
                    {detalheSobra.status === 'aberto' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={updatingStatus === detalheSobra.id}
                        onClick={() => {
                          handleStatusChange(detalheSobra, 'em_andamento');
                          setDetalheSobra(null);
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1.5" />
                        Iniciar Tratamento
                      </Button>
                    )}
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={updatingStatus === detalheSobra.id}
                      onClick={() => {
                        handleStatusChange(detalheSobra, 'encerrado');
                        setDetalheSobra(null);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Marcar como Resolvido
                    </Button>
                  </div>
                  {isErroCarregamento(detalheSobra.causa) && (
                    <Button
                      variant="outline"
                      className="w-full border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                      disabled={updatingStatus === detalheSobra.id}
                      onClick={() => {
                        handleDevolverEstoque(detalheSobra);
                        setDetalheSobra(null);
                      }}
                    >
                      <Warehouse className="w-4 h-4 mr-1.5" />
                      Enviar Produto p/ Estoque
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
