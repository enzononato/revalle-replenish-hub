import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Send, StopCircle, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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

function parseCSV(text: string): PedidoRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim());

  const colMap = {
    cod_pdv: headers.findIndex(h => /cod.*pdv/i.test(h)),
    nome_pdv: headers.findIndex(h => /nome.*pdv/i.test(h)),
    telefone_pdv: headers.findIndex(h => /telefone/i.test(h)),
    status_pedido: headers.findIndex(h => /status/i.test(h)),
    mensagem_cliente: headers.findIndex(h => /mensagem/i.test(h)),
  };

  const rows: PedidoRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim());
    if (cols.every(c => c === '')) continue;

    rows.push({
      cod_pdv: cols[colMap.cod_pdv] || '',
      nome_pdv: cols[colMap.nome_pdv] || '',
      telefone_pdv: cols[colMap.telefone_pdv] || '',
      status_pedido: cols[colMap.status_pedido] || '',
      mensagem_cliente: cols[colMap.mensagem_cliente] || '',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        .select('id, cod_pdv, nome_pdv, sucesso, erro_mensagem, created_at')
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

  const handleSend = async () => {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setLogRows([]);
    setBatchIds([]);

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

        // 1. Inserir registro no banco
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

        // 2. Enviar ao webhook com o id do registro
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rows[i], log_id: logId }),
          signal: controller.signal,
        });

        if (i < rows.length - 1) {
          await sleep(10000, controller.signal);
        }
      }

      setBatchIds(ids);
      toast.success('Todos os dados foram enviados! Consulte o status abaixo.');
      setFile(null);
      setProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';

      // 3. Buscar logs após envio
      await fetchLogs(ids);
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
            Selecione um arquivo .csv com separador ponto e vírgula (;)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop zone */}
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

          {/* Progress */}
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

          {/* Actions */}
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

      {/* Resumo de status */}
      {batchIds.length > 0 && !isSending && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {failedRows.length > 0 ? (
                  <AlertTriangle size={18} className="text-destructive" />
                ) : (
                  <CheckCircle2 size={18} className="text-green-500" />
                )}
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
            </div>
            <CardDescription>
              {successRows.length} sucesso(s) · {failedRows.length} erro(s) · {logRows.length} total
            </CardDescription>
          </CardHeader>

          {failedRows.length > 0 && (
            <CardContent>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {failedRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          PDV: {row.cod_pdv} {row.nome_pdv ? `— ${row.nome_pdv}` : ''}
                        </p>
                        {row.erro_mensagem && (
                          <p className="text-xs text-muted-foreground mt-0.5">{row.erro_mensagem}</p>
                        )}
                      </div>
                      <Badge variant="destructive" className="shrink-0">Erro</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          )}

          {failedRows.length === 0 && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Todos os registros foram processados com sucesso. Clique em "Atualizar Status" para verificar se o n8n reportou algum erro.
              </p>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
