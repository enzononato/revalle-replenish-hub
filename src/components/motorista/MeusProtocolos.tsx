import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Package, Plus, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Motorista, Produto, ObservacaoLog, FotosProtocolo } from '@/types';
import { cn } from '@/lib/utils';
import { BuscarProtocoloPdv } from './BuscarProtocoloPdv';
import { EncerrarProtocoloModal } from './EncerrarProtocoloModal';

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
  observacoes_log: unknown;
  mapa: string | null;
  motorista_nome: string;
  motorista_codigo: string | null;
  motorista_whatsapp: string | null;
  motorista_email: string | null;
  motorista_unidade: string | null;
  observacao_geral: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  cliente_telefone: string | null;
  fotos_protocolo: unknown;
}

// Verificar se protocolo foi reaberto
const foiReaberto = (observacoesLog?: ObservacaoLog[]): boolean => {
  return !!observacoesLog?.some(log => log.acao === 'Reabriu o protocolo');
};

export function MeusProtocolos({ motorista }: MeusProtocolosProps) {
  const [protocolos, setProtocolos] = useState<ProtocoloSimples[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'em_andamento' | 'encerrados'>('abertos');
  const [contadores, setContadores] = useState({ abertos: 0, em_andamento: 0, encerrados: 0 });
  const [loadingContadores, setLoadingContadores] = useState(true);
  
  // Modal states
  const [showBuscaPdv, setShowBuscaPdv] = useState(false);
  const [showEncerrarModal, setShowEncerrarModal] = useState(false);
  const [protocoloParaEncerrar, setProtocoloParaEncerrar] = useState<ProtocoloSimples | null>(null);

  // Buscar contadores de todos os status
  const fetchContadores = async () => {
    setLoadingContadores(true);
    try {
      const [abertosRes, emAndamentoRes, encerradosRes] = await Promise.all([
        supabase
          .from('protocolos')
          .select('id', { count: 'exact', head: true })
          .eq('motorista_codigo', motorista.codigo)
          .eq('status', 'aberto')
          .or('oculto.is.null,oculto.eq.false'),
        supabase
          .from('protocolos')
          .select('id', { count: 'exact', head: true })
          .eq('motorista_codigo', motorista.codigo)
          .eq('status', 'em_andamento')
          .or('oculto.is.null,oculto.eq.false'),
        supabase
          .from('protocolos')
          .select('id', { count: 'exact', head: true })
          .eq('motorista_codigo', motorista.codigo)
          .eq('status', 'encerrado')
          .or('oculto.is.null,oculto.eq.false'),
      ]);

      setContadores({
        abertos: abertosRes.count || 0,
        em_andamento: emAndamentoRes.count || 0,
        encerrados: encerradosRes.count || 0,
      });
    } catch (err) {
      console.error('Erro ao buscar contadores:', err);
    } finally {
      setLoadingContadores(false);
    }
  };

  const fetchProtocolos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, tipo_reposicao, causa, codigo_pdv, nota_fiscal, produtos, created_at, observacoes_log, mapa, motorista_nome, motorista_codigo, motorista_whatsapp, motorista_email, motorista_unidade, observacao_geral, contato_whatsapp, contato_email, cliente_telefone, fotos_protocolo')
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
    fetchContadores();
  }, [motorista.codigo]);

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
        {/* Skeleton dos filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-28 shrink-0 rounded-md" />
          ))}
        </div>
        {/* Skeleton do contador */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        {/* Skeleton dos cards */}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-4" />
              </div>
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

  const renderContent = () => {
    if (protocolos.length === 0) {
      return (
        <Card className="p-6 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base text-muted-foreground">
            Nenhum protocolo {filtroStatus === 'abertos' ? 'aberto' : filtroStatus === 'em_andamento' ? 'em atendimento' : 'encerrado'} encontrado
          </p>
        </Card>
      );
    }

    return protocolos.map((protocolo) => {
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
                <div className="flex flex-col gap-0.5 mb-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-mono text-sm font-medium truncate">
                      {protocolo.numero}
                    </span>
                  </div>
                  {foiReaberto(protocolo.observacoes_log as ObservacaoLog[]) && (
                    <span 
                      className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full w-fit ml-6"
                      title="Protocolo reaberto"
                    >
                      <RefreshCw size={9} />
                      Reaberto
                    </span>
                  )}
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

                {/* Botão Encerrar - apenas para protocolos em_andamento */}
                {protocolo.status === 'em_andamento' && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProtocoloParaEncerrar(protocolo);
                        setShowEncerrarModal(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Encerrar Reposição
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  const handleProtocoloEncontrado = (protocolo: ProtocoloSimples) => {
    setProtocoloParaEncerrar(protocolo);
    setShowEncerrarModal(true);
  };

  const handleEncerrarSuccess = () => {
    fetchProtocolos();
    fetchContadores();
    setProtocoloParaEncerrar(null);
  };

  return (
    <div className="space-y-3">
      {/* Filtros de Status com contadores */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={filtroStatus === 'abertos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('abertos')}
          className="shrink-0 h-8 text-xs"
        >
          <Clock className="w-3 h-3 mr-1" />
          Abertos
          {!loadingContadores && (
            <span className="ml-1.5 bg-background/20 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
              {contadores.abertos}
            </span>
          )}
        </Button>
        <Button
          variant={filtroStatus === 'em_andamento' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('em_andamento')}
          className="shrink-0 h-8 text-xs"
        >
          <AlertCircle className="w-3 h-3 mr-1" />
          Em Atendimento
          {!loadingContadores && (
            <span className="ml-1.5 bg-background/20 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
              {contadores.em_andamento}
            </span>
          )}
        </Button>
        <Button
          variant={filtroStatus === 'encerrados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('encerrados')}
          className="shrink-0 h-8 text-xs"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Encerrados
          {!loadingContadores && (
            <span className="ml-1.5 bg-background/20 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
              {contadores.encerrados}
            </span>
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {protocolos.length} protocolo{protocolos.length !== 1 ? 's' : ''} encontrado{protocolos.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1">
          {filtroStatus === 'em_andamento' && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowBuscaPdv(true)}
              title="Buscar por PDV"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              fetchProtocolos();
              fetchContadores();
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {renderContent()}

      {/* Modal de Busca por PDV */}
      <BuscarProtocoloPdv
        isOpen={showBuscaPdv}
        onClose={() => setShowBuscaPdv(false)}
        onSelectProtocolo={handleProtocoloEncontrado as any}
        motorista={motorista}
      />

      {/* Modal de Encerramento */}
      <EncerrarProtocoloModal
        isOpen={showEncerrarModal}
        protocolo={protocoloParaEncerrar}
        motorista={motorista}
        onClose={() => {
          setShowEncerrarModal(false);
          setProtocoloParaEncerrar(null);
        }}
        onSuccess={handleEncerrarSuccess}
      />
    </div>
  );
}
