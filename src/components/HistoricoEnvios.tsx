import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, RefreshCw, Loader2, AlertTriangle, CheckCircle2, RotateCcw, History, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryLogRow {
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

export default function HistoricoEnvios() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [successLogs, setSuccessLogs] = useState<HistoryLogRow[]>([]);
  const [errorLogs, setErrorLogs] = useState<HistoryLogRow[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<Record<string, string>>({});
  const [isClearing, setIsClearing] = useState(false);

  const handleClearErrors = async () => {
    if (errorLogs.length === 0) return;
    setIsClearing(true);
    try {
      const ids = errorLogs.map(r => r.id);
      const { error } = await supabase
        .from('alteracao_pedidos_log')
        .update({ sucesso: true, erro_mensagem: 'LIMPO_MANUALMENTE' })
        .in('id', ids);

      if (error) {
        console.error('Erro ao limpar erros:', error);
        toast.error('Erro ao limpar registros');
        return;
      }

      toast.success(`${ids.length} erro(s) limpos do histórico!`);
      await fetchHistory();
    } catch (err) {
      console.error('Erro ao limpar:', err);
      toast.error('Erro ao limpar registros');
    } finally {
      setIsClearing(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('alteracao_pedidos_log')
        .select('id, cod_pdv, nome_pdv, telefone_pdv, status_pedido, mensagem_cliente, sucesso, erro_mensagem, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (dateFrom) {
        query = query.gte('created_at', format(dateFrom, 'yyyy-MM-dd') + 'T00:00:00');
      }
      if (dateTo) {
        query = query.lte('created_at', format(dateTo, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar histórico:', error);
        toast.error('Erro ao buscar histórico');
        return;
      }

      const rows = (data as HistoryLogRow[]) || [];
      setSuccessLogs(rows.filter(r => r.sucesso));
      setErrorLogs(rows.filter(r => !r.sucesso));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleResend = async (row: HistoryLogRow) => {
    setResendingId(row.id);
    try {
      const telefone = editingPhone[row.id] ?? row.telefone_pdv ?? '';

      await supabase
        .from('alteracao_pedidos_log')
        .update({
          telefone_pdv: telefone,
          sucesso: true,
          erro_mensagem: null,
        })
        .eq('id', row.id);

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
      await fetchHistory();
    } catch (err) {
      console.error('Erro ao reenviar:', err);
      toast.error(`Erro ao reenviar PDV ${row.cod_pdv}`);
    } finally {
      setResendingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const handleDownloadErrorsCsv = () => {
    if (errorLogs.length === 0) {
      toast.error('Nenhum erro para exportar');
      return;
    }
    const headers = ['Data', 'Cod. PDV', 'Nome PDV', 'Telefone PDV', 'Status Pedido', 'Mensagem Cliente', 'Erro'];
    const rows = errorLogs.map(r => [
      formatDate(r.created_at),
      r.cod_pdv,
      r.nome_pdv || '',
      r.telefone_pdv || '',
      r.status_pedido || '',
      r.mensagem_cliente || '',
      r.erro_mensagem || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erros_envio_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV de erros baixado!');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History size={18} />
            Histórico de Envios
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-[150px] justify-start text-left font-normal h-8 text-xs',
                    !dateFrom && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-[150px] justify-start text-left font-normal h-8 text-xs',
                    !dateTo && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>

            <Button size="sm" variant="outline" className="h-8" onClick={fetchHistory} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
              Buscar
            </Button>

            {(dateFrom || dateTo) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tabela de Erros */}
          <Card className="border-destructive/30">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle size={14} className="text-destructive" />
                  Erros
                  <Badge variant="destructive" className="text-xs">{errorLogs.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={handleDownloadErrorsCsv}
                    disabled={errorLogs.length === 0}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        disabled={errorLogs.length === 0 || isClearing}
                      >
                        {isClearing ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        Limpar erros
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar erros do histórico?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover {errorLogs.length} registro(s) com erro da lista. Os registros não serão excluídos do banco, apenas marcados como resolvidos. Deseja continuar?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearErrors}>
                          Sim, limpar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="h-[400px]">
                {errorLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum erro encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Cod. PDV</TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Telefone</TableHead>
                        <TableHead className="text-xs">Erro</TableHead>
                        <TableHead className="text-xs w-[90px]">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                          <TableCell className="text-xs font-medium">{row.cod_pdv}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{row.nome_pdv || '—'}</TableCell>
                          <TableCell className="text-xs">
                            <Input
                              className="h-7 text-xs w-32"
                              value={editingPhone[row.id] ?? row.telefone_pdv ?? ''}
                              onChange={(e) =>
                                setEditingPhone((prev) => ({ ...prev, [row.id]: e.target.value }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate text-destructive">
                            {row.erro_mensagem || '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={resendingId === row.id}
                              onClick={() => handleResend(row)}
                            >
                              {resendingId === row.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tabela de Sucessos */}
          <Card className="border-green-500/30">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                Enviados com Sucesso
                <Badge className="text-xs bg-green-600 hover:bg-green-700 text-white">{successLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="h-[400px]">
                {successLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum envio com sucesso encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Cod. PDV</TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Telefone</TableHead>
                        <TableHead className="text-xs">Status Pedido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successLogs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                          <TableCell className="text-xs font-medium">{row.cod_pdv}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{row.nome_pdv || '—'}</TableCell>
                          <TableCell className="text-xs">{row.telefone_pdv || '—'}</TableCell>
                          <TableCell className="text-xs">{row.status_pedido || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
