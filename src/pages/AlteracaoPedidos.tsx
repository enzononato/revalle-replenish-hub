import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Send, AlertTriangle, CheckCircle2, RotateCcw, Clock, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import HistoricoEnvios from '@/components/HistoricoEnvios';

interface PedidoRow {
  cod_pdv: string;
  nome_pdv: string;
  telefone_pdv: string;
  status_pedido: string;
  mensagem_cliente: string;
}

interface LogRow {
  id: string;
  lote_id: string | null;
  cod_pdv: string;
  nome_pdv: string | null;
  telefone_pdv: string | null;
  status_pedido: string | null;
  mensagem_cliente: string | null;
  sucesso: boolean;
  erro_mensagem: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface LoteRow {
  id: string;
  nome_arquivo: string | null;
  total: number;
  enviados: number;
  falhas: number;
  status: string;
  enviado_por: string | null;
  created_at: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { current += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { fields.push(current.trim()); current = ''; i++; }
      else { current += ch; i++; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): PedidoRow[] {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const colMap = {
    cod_pdv: headers.findIndex(h => /cod.*pdv/i.test(h)),
    nome_pdv: headers.findIndex(h => /nome.*pdv/i.test(h)),
    telefone_pdv: headers.findIndex(h => /telefone/i.test(h)),
    status_pedido: headers.findIndex(h => /status/i.test(h)),
    mensagem_cliente: headers.findIndex(h => /mensagem/i.test(h)),
  };
  const rows: PedidoRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    let cols = parseCSVLine(lines[i]);
    if (cols.length === 1 && cols[0].includes(',')) cols = parseCSVLine(cols[0]);
    if (cols.every(c => c === '')) continue;
    rows.push({
      cod_pdv: cols[colMap.cod_pdv]?.trim() || '',
      nome_pdv: cols[colMap.nome_pdv]?.trim() || '',
      telefone_pdv: cols[colMap.telefone_pdv]?.trim() || '',
      status_pedido: cols[colMap.status_pedido]?.trim() || '',
      mensagem_cliente: cols[colMap.mensagem_cliente]?.trim() || '',
    });
  }
  return rows;
}

const LOG_FIELDS = 'id, lote_id, cod_pdv, nome_pdv, telefone_pdv, status_pedido, mensagem_cliente, sucesso, erro_mensagem, status, scheduled_at, created_at';

export default function AlteracaoPedidos() {
  const [file, setFile] = useState<File | null>(null);
  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [currentLoteId, setCurrentLoteId] = useState<string | null>(null);
  const [lote, setLote] = useState<LoteRow | null>(null);
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [recentLotes, setRecentLotes] = useState<LoteRow[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const fetchLote = useCallback(async (loteId: string) => {
    const { data } = await supabase.from('alteracao_pedidos_lote').select('*').eq('id', loteId).single();
    if (data) setLote(data as LoteRow);
  }, []);

  const fetchLogs = useCallback(async (loteId: string) => {
    const { data } = await supabase
      .from('alteracao_pedidos_log')
      .select(LOG_FIELDS)
      .eq('lote_id', loteId)
      .order('scheduled_at', { ascending: true });
    if (data) setLogRows(data as LogRow[]);
  }, []);

  const fetchRecentLotes = useCallback(async () => {
    const { data } = await supabase
      .from('alteracao_pedidos_lote')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentLotes(data as LoteRow[]);
  }, []);

  useEffect(() => { fetchRecentLotes(); }, [fetchRecentLotes]);

  // Realtime subscription on the active lote
  useEffect(() => {
    if (!currentLoteId) return;
    fetchLote(currentLoteId);
    fetchLogs(currentLoteId);

    const channel = supabase
      .channel(`lote-${currentLoteId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'alteracao_pedidos_log',
        filter: `lote_id=eq.${currentLoteId}`,
      }, () => fetchLogs(currentLoteId))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'alteracao_pedidos_lote',
        filter: `id=eq.${currentLoteId}`,
      }, (payload) => {
        setLote(payload.new as LoteRow);
        fetchRecentLotes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentLoteId, fetchLote, fetchLogs, fetchRecentLotes]);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) { toast.error('Selecione um arquivo .csv'); return; }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragRef.current?.classList.remove('border-primary');
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleEnqueue = async () => {
    if (!file) return;
    setIsEnqueuing(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error('Nenhuma linha válida no CSV.'); return; }

      const { data, error } = await supabase.functions.invoke('enfileirar-alteracoes', {
        body: { rows, nome_arquivo: file.name },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao enfileirar');

      toast.success(`Lote enfileirado (${data.total} mensagens). Processando em segundo plano.`);
      setCurrentLoteId(data.lote_id);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecentLotes();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enfileirar: ' + (err as Error).message);
    } finally {
      setIsEnqueuing(false);
    }
  };

  const handleResend = async (row: LogRow) => {
    setResendingId(row.id);
    try {
      const telefone = editingPhone[row.id] ?? row.telefone_pdv ?? '';
      // Re-queue this single item: mark pending again with scheduled_at=now and update phone if changed
      const updates: Record<string, unknown> = {
        status: 'pending',
        sucesso: true,
        erro_mensagem: null,
        scheduled_at: new Date().toISOString(),
      };
      if (editingPhone[row.id] && editingPhone[row.id] !== row.telefone_pdv) {
        updates.telefone_pdv = telefone;
      }
      await supabase.from('alteracao_pedidos_log').update(updates).eq('id', row.id);
      toast.success(`Reenvio do PDV ${row.cod_pdv} agendado.`);
      // Optionally trigger immediate processing
      supabase.functions.invoke('processar-fila-alteracoes').catch(() => {});
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reagendar reenvio.');
    } finally {
      setResendingId(null);
    }
  };

  const handleClear = () => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const sentRows = logRows.filter(r => r.status === 'sent');
  const failedRows = logRows.filter(r => r.status === 'failed');
  const pendingRows = logRows.filter(r => r.status === 'pending');

  const total = lote?.total ?? logRows.length;
  const done = (lote?.enviados ?? sentRows.length) + (lote?.falhas ?? failedRows.length);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const etaSec = pendingRows.length * 10;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Send className="text-primary" size={24} />
          Alteração nos Pedidos
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Envie o CSV e feche a página — o sistema processa em segundo plano com intervalo de 10 segundos por mensagem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload size={18} />
            Upload do Arquivo CSV
          </CardTitle>
          <CardDescription>
            Selecione um arquivo .csv com separador vírgula e campos entre aspas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            ref={dragRef}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); dragRef.current?.classList.add('border-primary'); }}
            onDragLeave={(e) => { e.preventDefault(); dragRef.current?.classList.remove('border-primary'); }}
            onClick={() => !isEnqueuing && fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              disabled={isEnqueuing}
            />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                  <FileText size={16} className="text-primary" />
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Arraste um arquivo CSV aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Colunas: Cod. PDV, Nome PDV, Telefone PDV, Status final do pedido, Mensagem Cliente
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleEnqueue} disabled={!file || isEnqueuing} className="btn-primary-gradient">
              {isEnqueuing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar</>
              )}
            </Button>
            {file && !isEnqueuing && (
              <Button variant="outline" onClick={handleClear}>Limpar</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active batch progress */}
      {currentLoteId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Lote em andamento
              {lote?.status === 'concluido' && <Badge className="bg-green-600 hover:bg-green-700 text-white">Concluído</Badge>}
              {lote?.status === 'processando' && <Badge variant="secondary">Processando</Badge>}
            </CardTitle>
            <CardDescription>
              {lote?.nome_arquivo && <span className="font-medium">{lote.nome_arquivo} · </span>}
              <span className="text-green-600 font-medium">{sentRows.length} enviados</span>{' · '}
              <span className="text-destructive font-medium">{failedRows.length} erros</span>{' · '}
              <span>{pendingRows.length} na fila</span>
              {pendingRows.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                  <Clock size={12} /> ~{Math.ceil(etaSec / 60)} min restantes
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground text-center">{done} de {total} ({pct}%)</p>

            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {failedRows.map(row => (
                  <div key={row.id} className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle size={16} className="text-destructive shrink-0" />
                      <p className="text-sm font-medium truncate">PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}</p>
                      <Badge variant="destructive" className="shrink-0">Erro</Badge>
                    </div>
                    {row.erro_mensagem && <p className="text-xs text-muted-foreground ml-6">{row.erro_mensagem}</p>}
                    <div className="flex items-center gap-2 ml-6">
                      <Input
                        placeholder="Telefone"
                        className="h-8 text-xs w-44"
                        value={editingPhone[row.id] ?? row.telefone_pdv ?? ''}
                        onChange={(e) => setEditingPhone(prev => ({ ...prev, [row.id]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs"
                        disabled={resendingId === row.id} onClick={() => handleResend(row)}>
                        {resendingId === row.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                        Reenviar
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingRows.slice(0, 20).map(row => (
                  <div key={row.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <Clock size={16} className="text-muted-foreground shrink-0" />
                    <p className="text-sm truncate flex-1">PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}</p>
                    <Badge variant="outline" className="shrink-0">Na fila</Badge>
                  </div>
                ))}
                {pendingRows.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center">+{pendingRows.length - 20} aguardando…</p>
                )}
                {sentRows.map(row => (
                  <div key={row.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                    <p className="text-sm font-medium truncate flex-1">PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}</p>
                    <Badge className="shrink-0 bg-green-600 hover:bg-green-700 text-white">OK</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Recent batches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks size={18} />
            Lotes recentes
          </CardTitle>
          <CardDescription>Clique em um lote para acompanhar o progresso.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentLotes.map(l => {
                const lpct = l.total > 0 ? Math.round(((l.enviados + l.falhas) / l.total) * 100) : 0;
                return (
                  <button
                    key={l.id}
                    onClick={() => setCurrentLoteId(l.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${currentLoteId === l.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{l.nome_arquivo || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(l.created_at).toLocaleString('pt-BR')} · {l.enviados}/{l.total} enviados · {l.falhas} erros
                        </p>
                      </div>
                      {l.status === 'concluido'
                        ? <Badge className="bg-green-600 hover:bg-green-700 text-white">Concluído</Badge>
                        : <Badge variant="secondary">Processando</Badge>}
                    </div>
                    <Progress value={lpct} className="mt-2 h-1.5" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <HistoricoEnvios />
    </div>
  );
}
