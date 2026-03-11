import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, Send } from 'lucide-react';

interface PedidoRow {
  cod_pdv: string;
  nome_pdv: string;
  telefone_pdv: string;
  status_pedido: string;
  mensagem_cliente: string;
}

const WEBHOOK_URL = 'https://n8n.revalle.com.br/webhook/alteracao_pedidos';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const allEmpty = cols.every(c => c === '');
    if (allEmpty) continue;

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

export function AlteracaoPedidosTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!file) return;
    setIsSending(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error('Nenhuma linha válida encontrada no CSV.');
        setIsSending(false);
        return;
      }

      setProgress({ current: 0, total: rows.length });

      for (let i = 0; i < rows.length; i++) {
        setProgress({ current: i + 1, total: rows.length });

        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows[i]),
        });

        // Delay de 10s entre envios (exceto após o último)
        if (i < rows.length - 1) {
          await sleep(10000);
        }
      }

      toast.success('Todos os dados foram enviados com sucesso!');
      setFile(null);
      setProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Erro ao enviar:', err);
      toast.error('Erro ao enviar dados. Verifique o console.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="text-primary" size={20} />
          Alteração nos Pedidos
        </CardTitle>
        <CardDescription>
          Faça upload de um arquivo CSV para enviar alterações de pedidos via webhook
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
                Apenas arquivos .csv (separador: ponto e vírgula)
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

          {file && !isSending && (
            <Button variant="outline" onClick={handleClear}>
              Limpar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
