import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Send, StopCircle, RefreshCw, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  cod_pdv: string;
  nome_pdv: string | null;
  telefone_pdv: string | null;
  status_pedido: string | null;
  mensagem_cliente: string | null;
  sucesso: boolean;
  erro_mensagem: string | null;
  created_at: string;
}

const WEBHOOK_URL = 'https://n8n.revalle.com.br/webhook/alteracao_pedidos';

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): PedidoRow[] {
  // Remove BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(line => line.trim() !== '');
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
    
    // If the entire row was wrapped in quotes (single field containing all data),
    // re-parse the unwrapped content
    if (cols.length === 1 && cols[0].includes(',')) {
      cols = parseCSVLine(cols[0]);
    }
    
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

export default function AlteracaoPedidos() {
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [logRows, setLogRows] = useState<LogRow[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Auto-polling: after send completes, poll every 5s for 60s to catch async n8n updates
  const startPolling = useCallback((ids: string[]) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setIsPolling(true);
    let elapsed = 0;
    const interval = setInterval(async () => {
      elapsed += 5000;
      if (elapsed > 60000) {
        clearInterval(interval);
        pollIntervalRef.current = null;
        setIsPolling(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('alteracao_pedidos_log')
          .select('id, cod_pdv, nome_pdv, telefone_pdv, status_pedido, mensagem_cliente, sucesso, erro_mensagem, created_at')
          .in('id', ids);
        if (data) setLogRows(data as LogRow[]);
      } catch (e) {
        console.error('Erro no polling:', e);
      }
    }, 5000);
    pollIntervalRef.current = interval;
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo .csv');
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current?.classList.remove('border-primary');
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragRef.current?.classList.add('border-primary');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragRef.current?.classList.remove('border-primary');
  }, []);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const fetchLogs = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('alteracao_pedidos_log')
        .select('id, cod_pdv, nome_pdv, telefone_pdv, status_pedido, mensagem_cliente, sucesso, erro_mensagem, created_at')
        .in('id', ids);

      if (error) {
        console.error('Erro ao buscar logs:', error);
        return;
      }
      setLogRows((data as LogRow[]) || []);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleResend = async (row: LogRow) => {
    setResendingId(row.id);
    try {
      const telefone = editingPhone[row.id] ?? row.telefone_pdv ?? '';

      // Update phone in DB if changed
      if (editingPhone[row.id] && editingPhone[row.id] !== row.telefone_pdv) {
        await supabase
          .from('alteracao_pedidos_log')
          .update({ telefone_pdv: telefone, sucesso: true, erro_mensagem: null })
          .eq('id', row.id);
      } else {
        // Reset status for retry
        await supabase
          .from('alteracao_pedidos_log')
          .update({ sucesso: true, erro_mensagem: null })
          .eq('id', row.id);
      }

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_pdv: row.cod_pdv,
          nome_pdv: row.nome_pdv,
          telefone_pdv: telefone,
          status_pedido: row.status_pedido,
          mensagem_cliente: row.mensagem_cliente,
          log_id: row.id,
          id_alteracao: row.id,
        }),
      });

      toast.success(`Reenvio do PDV ${row.cod_pdv} realizado!`);

      // Refresh this row
      if (batchIds.length > 0) {
        await fetchLogs(batchIds);
      }
    } catch (err) {
      console.error('Erro ao reenviar:', err);
      toast.error(`Erro ao reenviar PDV ${row.cod_pdv}`);
    } finally {
      setResendingId(null);
    }
  };

  const handleSend = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setLogRows([]);
    setBatchIds([]);
    setEditingPhone({});

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('Nenhuma linha válida encontrada no CSV.');
        setIsSending(false);
        return;
      }

      setProgress({ current: 0, total: rows.length });
      const ids: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        setProgress({ current: i + 1, total: rows.length });

        const { data: logData, error: logError } = await supabase
          .from('alteracao_pedidos_log')
          .insert({
            cod_pdv: rows[i].cod_pdv,
            nome_pdv: rows[i].nome_pdv,
            telefone_pdv: rows[i].telefone_pdv,
            status_pedido: rows[i].status_pedido,
            mensagem_cliente: rows[i].mensagem_cliente,
            sucesso: true,
          })
          .select('id')
          .single();

        if (logError) {
          console.error('Erro ao inserir log:', logError);
          toast.error(`Erro ao registrar linha ${i + 1} no banco.`);
          continue;
        }

        const logId = logData.id;
        ids.push(logId);

        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rows[i], log_id: logId, id_alteracao: logId }),
          signal: controller.signal,
        });

        if (i < rows.length - 1) {
          await sleep(10000, controller.signal);
        }
      }

      setBatchIds(ids);
      toast.success('Envio concluído! Atualizando status automaticamente...');
      setFile(null);
      setProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchLogs(ids);
      // Start auto-polling to catch async webhook results
      startPolling(ids);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.warning(`Envio interrompido. ${progress.current} de ${progress.total} enviado(s).`);
      } else {
        console.error('Erro ao enviar:', err);
        toast.error('Erro ao enviar dados. Verifique o console.');
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const handleClear = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const failedRows = logRows.filter(r => !r.sucesso);
  const successRows = logRows.filter(r => r.sucesso);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Send className="text-primary" size={24} />
          Alteração nos Pedidos
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Envie alterações de pedidos via CSV para o webhook
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isSending && fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              disabled={isSending}
            />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground flex items-center justify-center gap-2">
                  <FileText size={16} className="text-primary" />
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
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

          {isSending && progress.total > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">
                Enviando {progress.current} de {progress.total}...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Intervalo de 10s entre cada envio
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSend}
              disabled={!file || isSending}
              className="btn-primary-gradient"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando {progress.current}/{progress.total}...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Processar e Enviar Mensagens
                </>
              )}
            </Button>

            {isSending && (
              <Button variant="destructive" onClick={handleStop}>
                <StopCircle className="mr-2 h-4 w-4" />
                Parar Envio
              </Button>
            )}

            {file && !isSending && (
              <Button variant="outline" onClick={handleClear}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado do envio */}
      {batchIds.length > 0 && !isSending && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                Resultado do Envio
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(batchIds)}
                disabled={isLoadingLogs}
              >
                {isLoadingLogs ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Atualizar Status
              </Button>
              {isPolling && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Atualizando automaticamente...
                </span>
              )}
            </div>
            <CardDescription>
              <span className="text-green-600 font-medium">{successRows.length} sucesso(s)</span>
              {' · '}
              <span className="text-destructive font-medium">{failedRows.length} erro(s)</span>
              {' · '}
              {logRows.length} total
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {/* Erros primeiro */}
                {failedRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={16} className="text-destructive shrink-0" />
                        <p className="text-sm font-medium text-foreground truncate">
                          PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}
                        </p>
                        <Badge variant="destructive" className="shrink-0">Erro</Badge>
                      </div>
                    </div>
                    {row.erro_mensagem && (
                      <p className="text-xs text-muted-foreground ml-6">{row.erro_mensagem}</p>
                    )}
                    <div className="flex items-center gap-2 ml-6">
                      <Input
                        placeholder="Telefone"
                        className="h-8 text-xs w-44"
                        value={editingPhone[row.id] ?? row.telefone_pdv ?? ''}
                        onChange={(e) =>
                          setEditingPhone((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={resendingId === row.id}
                        onClick={() => handleResend(row)}
                      >
                        {resendingId === row.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        Reenviar
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Sucessos */}
                {successRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">
                        PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}
                      </p>
                      <Badge className="shrink-0 bg-green-600 hover:bg-green-700 text-white">OK</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Histórico completo */}
      <HistoricoEnvios />
    </div>
  );
}
