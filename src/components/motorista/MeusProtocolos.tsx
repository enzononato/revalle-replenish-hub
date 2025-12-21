import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Motorista, Produto } from '@/types';
import { cn } from '@/lib/utils';

interface MeusProtocolosProps {
  motorista: Motorista;
}

interface ProtocoloSimples {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: 'aberto' | 'em_andamento' | 'encerrado';
  tipo_reposicao: string | null;
  causa: string | null;
  codigo_pdv: string | null;
  nota_fiscal: string | null;
  produtos: unknown;
  created_at: string | null;
}

export function MeusProtocolos({ motorista }: MeusProtocolosProps) {
  const [protocolos, setProtocolos] = useState<ProtocoloSimples[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'em_andamento' | 'encerrados'>('abertos');

  const fetchProtocolos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, tipo_reposicao, causa, codigo_pdv, nota_fiscal, produtos, created_at')
        .eq('motorista_codigo', motorista.codigo)
        .or('oculto.is.null,oculto.eq.false');
      
      // Aplicar filtro de status
      if (filtroStatus === 'abertos') {
        query = query.eq('status', 'aberto');
      } else if (filtroStatus === 'em_andamento') {
        query = query.eq('status', 'em_andamento');
      } else if (filtroStatus === 'encerrados') {
        query = query.eq('status', 'encerrado');
      }
      
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setProtocolos((data || []) as ProtocoloSimples[]);
    } catch (err) {
      console.error('Erro ao buscar protocolos:', err);
      setError('Não foi possível carregar seus protocolos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocolos();
  }, [motorista.codigo, filtroStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-[10px] px-1.5 py-0.5">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            Aberto
          </Badge>
        );
      case 'em_andamento':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] px-1.5 py-0.5">
            <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
            Em Andamento
          </Badge>
        );
      case 'encerrado':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0.5">
            <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Tenta parsear como ISO primeiro
      const date = parseISO(dateStr);
      if (!isNaN(date.getTime())) {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
      // Se já está no formato dd/MM/yyyy, retorna como está
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-base text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={fetchProtocolos}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (protocolos.length === 0) {
    return (
      <Card className="p-6 text-center">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-base text-muted-foreground">Você ainda não tem protocolos registrados</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtros de Status */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={filtroStatus === 'abertos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('abertos')}
          className="shrink-0 h-8 text-xs"
        >
          <Clock className="w-3 h-3 mr-1" />
          Abertos
        </Button>
        <Button
          variant={filtroStatus === 'em_andamento' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('em_andamento')}
          className="shrink-0 h-8 text-xs"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Em Atendimento
        </Button>
        <Button
          variant={filtroStatus === 'encerrados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('encerrados')}
          className="shrink-0 h-8 text-xs"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Encerrados
        </Button>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {protocolos.length} protocolo{protocolos.length !== 1 ? 's' : ''} encontrado{protocolos.length !== 1 ? 's' : ''}
        </p>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={fetchProtocolos}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {protocolos.map((protocolo) => {
        const isExpanded = expandedId === protocolo.id;
        const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : null;

        return (
          <Card 
            key={protocolo.id} 
            className={cn(
              "transition-all cursor-pointer hover:shadow-md",
              isExpanded && "ring-2 ring-primary/20"
            )}
            onClick={() => setExpandedId(isExpanded ? null : protocolo.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-sm font-medium truncate">
                      {protocolo.numero}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{formatDate(protocolo.data)} às {protocolo.hora}</p>
                    {protocolo.tipo_reposicao && (
                      <p className="capitalize">{protocolo.tipo_reposicao.toLowerCase()}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(protocolo.status)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {protocolo.codigo_pdv && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">PDV:</span>
                      <span className="font-medium">{protocolo.codigo_pdv}</span>
                    </div>
                  )}
                  {protocolo.nota_fiscal && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Nota Fiscal:</span>
                      <span className="font-medium">{protocolo.nota_fiscal}</span>
                    </div>
                  )}
                  {protocolo.causa && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Causa:</span>
                      <span className="font-medium">{protocolo.causa}</span>
                    </div>
                  )}
                  
                  {produtos && produtos.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Package className="w-3.5 h-3.5" />
                        <span>Produtos ({produtos.length})</span>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2 space-y-0.5">
                        {produtos.map((prod, idx) => (
                          <div key={idx} className="text-[11px] flex justify-between">
                            <span className="truncate">{prod.codigo} - {prod.nome}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {prod.quantidade} {prod.unidade}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
