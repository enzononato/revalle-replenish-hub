import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Package, Plus, XCircle, MessageSquare, MessageCircle, Copy, Check, History, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Motorista, Produto, ObservacaoLog, FotosProtocolo } from '@/types';
import { cn } from '@/lib/utils';
import { BuscarProtocoloPdv, ProtocoloEncontrado } from './BuscarProtocoloPdv';
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
  mensagem_encerramento: string | null;
  foto_nota_fiscal_encerramento: string | null;
}

// Verificar se protocolo foi reaberto
const isObservacaoLog = (value: unknown): value is ObservacaoLog => {
  if (!value || typeof value !== 'object') return false;
  const log = value as Partial<ObservacaoLog>;
  return typeof log.acao === 'string';
};

const normalizarObservacoesLog = (observacoesLog?: unknown): ObservacaoLog[] => {
  try {
    if (!observacoesLog) return [];
    
    let data = observacoesLog;
    
    // Se for string, tentar parsear
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }
    
    // Se for array, filtrar
    if (Array.isArray(data)) {
      return data.filter(isObservacaoLog);
    }
    
    return [];
  } catch {
    return [];
  }
};

const foiReaberto = (observacoesLog?: unknown): boolean => {
  const logs = normalizarObservacoesLog(observacoesLog);
  return logs.some((log) => log.acao === 'Reabriu o protocolo');
};

const HISTORICO_MOTORISTA_ACOES = [
  'Abriu protocolo',
  'Criou protocolo',
  'Alterou produtos',
  'Alterou produtos do protocolo',
  'Entrega parcial',
  'Encerrou o protocolo (entrega final)',
] as const;

const getHistoricoMotorista = (observacoesLog?: unknown, status?: ProtocoloSimples['status']) => {
  const logs = normalizarObservacoesLog(observacoesLog);

  return logs.filter((log) => {
    if (status === 'encerrado') return false;

    if (log.acao === 'Encerrou o protocolo (entrega final)') {
      return status === 'em_andamento';
    }

    return HISTORICO_MOTORISTA_ACOES.includes(log.acao as typeof HISTORICO_MOTORISTA_ACOES[number]);
  });
};

const formatarTextoHistoricoMotorista = (log: ObservacaoLog) => {
  const texto = typeof log.texto === 'string' ? log.texto.trim() : '';

  if (log.acao !== 'Alterou produtos do protocolo' && log.acao !== 'Alterou produtos') {
    return {
      titulo: log.acao,
      detalhes: texto ? [texto] : [],
    };
  }

  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const titulo = linhas[0]?.replace(/[:-]+$/, '') || 'Produtos alterados';
  const detalhes = linhas.slice(1);

  return {
    titulo,
    detalhes: detalhes.length > 0 ? detalhes : (texto ? [texto] : []),
  };
};

// Constrói a mensagem de texto para o protocolo
const buildMensagemProtocolo = (protocolo: ProtocoloSimples, motoristaInfo: { nome: string; unidade?: string | null }): string => {
  const fotos = protocolo.fotos_protocolo as Record<string, string> | null;
  const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : [];

  const linhas = [
    `*PROTOCOLO ABERTO*`,
    ``,
    `*Protocolo:* ${protocolo.numero}`,
    ``,
    protocolo.tipo_reposicao ? `*Tipo:* ${protocolo.tipo_reposicao}` : null,
    ``,
    protocolo.causa ? `*Causa:* ${protocolo.causa}` : null,
    ``,
    `*Data:* ${protocolo.data} \u00E0s ${protocolo.hora}`,
    protocolo.mapa ? `\n*MAPA:* ${protocolo.mapa}` : null,
    protocolo.codigo_pdv ? `\n*C\u00F3d. PDV:* ${protocolo.codigo_pdv}` : null,
    protocolo.nota_fiscal ? `\n*NF:* ${protocolo.nota_fiscal}` : null,
    ``,
    `*Motorista:* ${motoristaInfo.nome}`,
    motoristaInfo.unidade ? `*Unidade:* ${motoristaInfo.unidade}` : null,
    ``,
    protocolo.contato_whatsapp || protocolo.contato_email
      ? `${protocolo.contato_whatsapp || ''}${protocolo.contato_email ? '\n' + protocolo.contato_email : ''}`
      : null,
    produtos.length > 0
      ? [`\n*ITENS SOLICITADOS:*`, ``, ...produtos.map(p =>
          `- *${p.nome}*\n   C\u00F3d: ${p.codigo} | Qtd: ${p.quantidade} ${p.unidade}${p.validade ? '\n   Validade: ' + p.validade : ''}`
        )].join('\n')
      : null,
    protocolo.observacao_geral ? `\n*Obs:* ${protocolo.observacao_geral}` : null,
    fotos?.fotoMotoristaPdv ? `\n*Foto Motorista:*\n${fotos.fotoMotoristaPdv}` : null,
    fotos?.fotoLoteProduto ? `\n*Foto Lote:*\n${fotos.fotoLoteProduto}` : null,
    fotos?.fotoAvaria ? `\n*Foto Avaria:*\n${fotos.fotoAvaria}` : null,
    ``,
    `_- Reposi\u00E7\u00E3o Revalle_`,
  ];

  return linhas.filter(l => l !== null).join('\n');
};

const getTelefoneCliente = (protocolo: ProtocoloSimples): string => {
  return protocolo.cliente_telefone || protocolo.contato_whatsapp || '';
};

const buildWhatsAppLinkProtocolo = (protocolo: ProtocoloSimples, motoristaInfo: { nome: string; unidade?: string | null }): string => {
  const numeroLimpo = getTelefoneCliente(protocolo).replace(/\D/g, '');
  const telefone = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(buildMensagemProtocolo(protocolo, motoristaInfo))}`;
};

const buildMensagemEncerramento = (protocolo: ProtocoloSimples, motoristaInfo: { nome: string; unidade?: string | null }): string => {
  const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : [];

  const linhas = [
    `*PROTOCOLO ENCERRADO*`,
    ``,
    `*Protocolo:* ${protocolo.numero}`,
    `*Status:* Encerrado com sucesso`,
    `*Data:* ${protocolo.data} as ${protocolo.hora}`,
    protocolo.tipo_reposicao ? `*Tipo:* ${protocolo.tipo_reposicao}` : null,
    protocolo.causa ? `*Causa:* ${protocolo.causa}` : null,
    protocolo.mapa ? `*MAPA:* ${protocolo.mapa}` : null,
    protocolo.codigo_pdv ? `*Cod. PDV:* ${protocolo.codigo_pdv}` : null,
    protocolo.foto_nota_fiscal_encerramento ? `*Assinatura do canhoto:* ${protocolo.foto_nota_fiscal_encerramento}` : null,
    `*Motorista:* ${motoristaInfo.nome}`,
    motoristaInfo.unidade ? `*Unidade:* ${motoristaInfo.unidade}` : null,
    protocolo.contato_whatsapp ? protocolo.contato_whatsapp : null,
    protocolo.contato_email ? protocolo.contato_email : null,
    ``,
    produtos.length > 0
      ? [`*ITENS CONFERIDOS:*`, ``, ...produtos.map(p =>
          `- *${p.nome}*\n   Cod: ${p.codigo} | Qtd: ${p.quantidade} ${p.unidade}${p.validade ? '\n   Validade: ' + p.validade : ''}`
        )].join('\n')
      : null,
    ``,
    `*Mensagem Final:* ${protocolo.mensagem_encerramento || 'Nenhuma'}`,
    ``,
    `_- Reposicao Revalle_`,
  ];

  return linhas.filter(l => l !== null).join('\n');
};

const buildWhatsAppLinkEncerramento = (protocolo: ProtocoloSimples, motoristaInfo: { nome: string; unidade?: string | null }): string => {
  const numeroLimpo = getTelefoneCliente(protocolo).replace(/\D/g, '');
  const telefone = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(buildMensagemEncerramento(protocolo, motoristaInfo))}`;
};

export function MeusProtocolos({ motorista }: MeusProtocolosProps) {
  const [protocolos, setProtocolos] = useState<ProtocoloSimples[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'em_andamento' | 'encerrados'>('abertos');
  const [contadores, setContadores] = useState({ abertos: 0, em_andamento: 0, encerrados: 0 });
  const [loadingContadores, setLoadingContadores] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [copiadoIdEncerramento, setCopiadoIdEncerramento] = useState<string | null>(null);
  
  // Paginação universal
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 5;
  
  // Modal states
  const [showBuscaPdv, setShowBuscaPdv] = useState(false);
  const [showEncerrarModal, setShowEncerrarModal] = useState(false);
  const [modoBuscaPdv, setModoBuscaPdv] = useState<'select' | 'view'>('select');
  const [protocoloParaEncerrar, setProtocoloParaEncerrar] = useState<ProtocoloSimples | null>(null);

  const handleCopiarMensagem = (protocolo: ProtocoloSimples) => {
    const texto = buildMensagemProtocolo(protocolo, { nome: motorista.nome, unidade: motorista.unidade });
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoId(protocolo.id);
      setTimeout(() => setCopiadoId(null), 2500);
    });
  };

  const handleCopiarMensagemEncerramento = (protocolo: ProtocoloSimples) => {
    const texto = buildMensagemEncerramento(protocolo, { nome: motorista.nome, unidade: motorista.unidade });
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoIdEncerramento(protocolo.id);
      setTimeout(() => setCopiadoIdEncerramento(null), 2500);
    });
  };

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
          .eq('ativo', true)
          .neq('tipo_reposicao', 'pos_rota')
          .or('oculto.is.null,oculto.eq.false'),
        supabase
          .from('protocolos')
          .select('id', { count: 'exact', head: true })
          .eq('motorista_codigo', motorista.codigo)
          .eq('status', 'em_andamento')
          .eq('ativo', true)
          .neq('tipo_reposicao', 'pos_rota')
          .or('oculto.is.null,oculto.eq.false'),
        supabase
          .from('protocolos')
          .select('id', { count: 'exact', head: true })
          .eq('motorista_codigo', motorista.codigo)
          .eq('status', 'encerrado')
          .eq('ativo', true)
          .neq('tipo_reposicao', 'pos_rota')
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
      console.log('[MeusProtocolos] Buscando protocolos para motorista:', motorista.codigo, 'filtro:', filtroStatus);
      let query = supabase
        .from('protocolos')
        .select('id, numero, data, hora, status, tipo_reposicao, causa, codigo_pdv, nota_fiscal, produtos, created_at, observacoes_log, mapa, motorista_nome, motorista_codigo, motorista_whatsapp, motorista_email, motorista_unidade, observacao_geral, contato_whatsapp, contato_email, cliente_telefone, fotos_protocolo, mensagem_encerramento, foto_nota_fiscal_encerramento')
        .eq('motorista_codigo', motorista.codigo)
        .eq('ativo', true)
        .neq('tipo_reposicao', 'pos_rota')
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

      console.log('[MeusProtocolos] Resultado:', { data: data?.length, error: fetchError });

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
    setPaginaAtual(1);
  }, [motorista.codigo, filtroStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return (
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/40 text-[11px] px-2.5 py-1 font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            Aberto
          </Badge>
        );
      case 'em_andamento':
        return (
          <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/40 text-[11px] px-2.5 py-1 font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        );
      case 'encerrado':
        return (
          <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/40 text-[11px] px-2.5 py-1 font-semibold">
            <CheckCircle className="w-3 h-3 mr-1" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[11px] px-2.5 py-1">{status}</Badge>;
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

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
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

  if (error && !isLoading) {
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
    if (isLoading) {
      return <div className="animate-fade-in">{renderLoadingSkeleton()}</div>;
    }
    if (protocolos.length === 0) {
      return (
        <Card className="p-6 text-center animate-fade-in">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base text-muted-foreground">
            Nenhum protocolo {filtroStatus === 'abertos' ? 'aberto' : filtroStatus === 'em_andamento' ? 'em atendimento' : 'encerrado'} encontrado
          </p>
        </Card>
      );
    }

    // Aplicar paginação para todas as abas
    const listaExibida = protocolos.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

    return listaExibida.map((protocolo, index) => {
      const isExpanded = expandedId === protocolo.id;
      const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : null;
      const historicoFiltrado = getHistoricoMotorista(protocolo.observacoes_log, protocolo.status);

      return (
        <Card 
          key={protocolo.id} 
          className={cn(
            "transition-all cursor-pointer hover:shadow-md border-border/60 overflow-hidden animate-fade-in",
            isExpanded && "ring-2 ring-primary/20 shadow-md"
          )}
          style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
          onClick={() => setExpandedId(isExpanded ? null : protocolo.id)}
        >
          {/* Barra lateral colorida por status */}
          <div className={cn(
            "flex",
          )}>
            <div className={cn(
              "w-1 shrink-0 rounded-l-xl",
              protocolo.status === 'aberto' && "bg-yellow-500",
              protocolo.status === 'em_andamento' && "bg-blue-500",
              protocolo.status === 'encerrado' && "bg-green-500",
            )} />
            <CardContent className="p-4 flex-1 min-w-0">
              {/* Header do card */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      protocolo.status === 'aberto' && "bg-yellow-500/10",
                      protocolo.status === 'em_andamento' && "bg-blue-500/10",
                      protocolo.status === 'encerrado' && "bg-green-500/10",
                    )}>
                      <FileText className={cn(
                        "w-4 h-4",
                        protocolo.status === 'aberto' && "text-yellow-600",
                        protocolo.status === 'em_andamento' && "text-blue-600",
                        protocolo.status === 'encerrado' && "text-green-600",
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-sm font-bold text-foreground block truncate">
                        {protocolo.numero}
                      </span>
                      {foiReaberto(protocolo.observacoes_log) && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full mt-0.5">
                          <RefreshCw size={9} />
                          Reaberto
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground ml-10">
                    {protocolo.codigo_pdv && (
                      <span className="flex items-center gap-1 font-semibold text-foreground/80">
                        <MapPin className="w-3 h-3" />
                        PDV {protocolo.codigo_pdv}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(protocolo.data)} às {protocolo.hora}
                    </span>
                    {protocolo.tipo_reposicao && (
                      <span className="capitalize font-medium text-foreground/70 bg-muted/60 px-2 py-0.5 rounded text-[12px]">{protocolo.tipo_reposicao.toLowerCase()}</span>
                    )}
                    {protocolo.mapa && (
                      <span className="font-medium text-foreground/70 bg-muted/60 px-2 py-0.5 rounded text-[12px]">Mapa {protocolo.mapa}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {getStatusBadge(protocolo.status)}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

            {/* Conteúdo expandido */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                {/* Dados do protocolo */}
                <div className="grid grid-cols-2 gap-2">
                  {protocolo.codigo_pdv && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">PDV</p>
                      <p className="text-[13px] font-medium">{protocolo.codigo_pdv}</p>
                    </div>
                  )}
                  {protocolo.nota_fiscal && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Nota Fiscal</p>
                      <p className="text-[13px] font-medium">{protocolo.nota_fiscal}</p>
                    </div>
                  )}
                  {protocolo.causa && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2 col-span-2">
                      <p className="text-[11px] text-muted-foreground">Causa</p>
                      <p className="text-[13px] font-medium">{protocolo.causa}</p>
                    </div>
                  )}
                </div>
                
                {protocolo.observacao_geral && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Observação</span>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-[13px] text-foreground leading-relaxed">{protocolo.observacao_geral}</p>
                    </div>
                  </div>
                )}

                {/* Produtos */}
                {produtos && produtos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1">
                      <Package className="w-3.5 h-3.5" />
                      <span>Produtos ({produtos.length})</span>
                      {(() => {
                        const entregues = produtos.filter(p => p.entregue).length;
                        if (entregues > 0) {
                          return (
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              entregues === produtos.length
                                ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                                : "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                            )}>
                              {entregues}/{produtos.length} entregues
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
                      {produtos.map((prod, idx) => (
                        <div key={idx} className="text-[13px] flex justify-between items-center">
                          <span className="truncate flex items-center gap-1.5">
                            {prod.entregue && <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                            <span className="font-mono text-[12px] text-muted-foreground">{prod.codigo}</span>
                            <span className="truncate">{prod.nome}</span>
                          </span>
                          <span className="text-muted-foreground shrink-0 ml-2 text-[12px]">
                            {prod.quantidade} {prod.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico */}
                {(protocolo.status === 'aberto' || protocolo.status === 'em_andamento') && historicoFiltrado.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1">
                      <History className="w-3.5 h-3.5" />
                      <span>Histórico da reposição</span>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3 space-y-2.5">
                      {historicoFiltrado.map((log) => {
                        const historicoFormatado = formatarTextoHistoricoMotorista(log);
                        return (
                          <div key={log.id} className="border-l-2 border-primary/30 pl-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-medium text-foreground">{historicoFormatado.titulo}</p>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {log.data} {log.hora}
                              </span>
                            </div>
                            {historicoFormatado.detalhes.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {historicoFormatado.detalhes.map((detalhe, index) => (
                                  <p key={`${log.id}-${index}`} className="text-[12px] leading-relaxed text-muted-foreground">
                                    {/^[-•]/.test(detalhe) ? detalhe : `• ${detalhe}`}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Botões WhatsApp/Copiar */}
                {(protocolo.status === 'aberto' || protocolo.status === 'em_andamento') && (
                  <div className="pt-2 mt-1 border-t border-border/50 space-y-2">
                    {getTelefoneCliente(protocolo) ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full h-10 text-[13px]"
                        style={{ backgroundColor: '#22c55e', color: '#fff' }}
                        onClick={(e) => e.stopPropagation()}
                        asChild
                      >
                        <a
                          href={buildWhatsAppLinkProtocolo(protocolo, { nome: motorista.nome, unidade: motorista.unidade })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Enviar no WhatsApp do Cliente
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full h-10 text-[13px]" disabled onClick={(e) => e.stopPropagation()}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Sem telefone do cliente
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-10 text-[13px]"
                      onClick={(e) => { e.stopPropagation(); handleCopiarMensagem(protocolo); }}
                    >
                      {copiadoId === protocolo.id ? (
                        <><Check className="w-4 h-4 mr-2" />Mensagem copiada!</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" />Copiar mensagem</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Botões encerramento */}
                {protocolo.status === 'encerrado' && (
                  <div className="pt-2 mt-1 border-t border-border/50 space-y-2">
                    {getTelefoneCliente(protocolo) ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full h-10 text-[13px]"
                        style={{ backgroundColor: '#22c55e', color: '#fff' }}
                        onClick={(e) => e.stopPropagation()}
                        asChild
                      >
                        <a
                          href={buildWhatsAppLinkEncerramento(protocolo, { nome: motorista.nome, unidade: motorista.unidade })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Enviar no WhatsApp do Cliente
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full h-10 text-[13px]" disabled onClick={(e) => e.stopPropagation()}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Sem telefone do cliente
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-10 text-[13px]"
                      onClick={(e) => { e.stopPropagation(); handleCopiarMensagemEncerramento(protocolo); }}
                    >
                      {copiadoIdEncerramento === protocolo.id ? (
                        <><Check className="w-4 h-4 mr-2" />Mensagem copiada!</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" />Copiar mensagem de encerramento</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Botão Encerrar - apenas em_andamento */}
                {protocolo.status === 'em_andamento' && (
                  <div className="pt-2 mt-1 border-t border-border/50">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full h-10 text-[13px]"
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
          </div>
        </Card>
      );
    });
  };

  const handleProtocoloEncontrado = (protocolo: ProtocoloEncontrado) => {

    setProtocoloParaEncerrar(protocolo as unknown as ProtocoloSimples);
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
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant={filtroStatus === 'abertos' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('abertos')}
          className={cn(
            "h-9 text-xs font-semibold px-2 flex items-center justify-center gap-1 rounded-lg transition-all duration-200",
            filtroStatus === 'abertos' && "shadow-md"
          )}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Abertos
          {!loadingContadores && (
            <Badge variant="secondary" className={cn(
              "h-4 min-w-[18px] px-1 text-[10px] font-bold rounded-full",
              filtroStatus === 'abertos' 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {contadores.abertos}
            </Badge>
          )}
        </Button>
        <Button
          variant={filtroStatus === 'em_andamento' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('em_andamento')}
          className={cn(
            "h-9 text-xs font-semibold px-2 flex items-center justify-center gap-1 rounded-lg transition-all duration-200",
            filtroStatus === 'em_andamento' && "shadow-md"
          )}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Atend.
          {!loadingContadores && (
            <Badge variant="secondary" className={cn(
              "h-4 min-w-[18px] px-1 text-[10px] font-bold rounded-full",
              filtroStatus === 'em_andamento' 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {contadores.em_andamento}
            </Badge>
          )}
        </Button>
        <Button
          variant={filtroStatus === 'encerrados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroStatus('encerrados')}
          className={cn(
            "h-9 text-xs font-semibold px-2 flex items-center justify-center gap-1 rounded-lg transition-all duration-200",
            filtroStatus === 'encerrados' && "shadow-md"
          )}
        >
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Encerr.
          {!loadingContadores && (
            <Badge variant="secondary" className={cn(
              "h-4 min-w-[18px] px-1 text-[10px] font-bold rounded-full",
              filtroStatus === 'encerrados' 
                ? "bg-primary-foreground/20 text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {contadores.encerrados}
            </Badge>
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando...' : `${protocolos.length} protocolo${protocolos.length !== 1 ? 's' : ''} encontrado${protocolos.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-1">
          {(filtroStatus === 'em_andamento' || filtroStatus === 'abertos') && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setModoBuscaPdv(filtroStatus === 'abertos' ? 'view' : 'select');
                setShowBuscaPdv(true);
              }}
              title={filtroStatus === 'abertos' ? 'Consultar status da reposição por PDV' : 'Buscar por PDV'}
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

      {/* Paginação universal */}
      {protocolos.length > ITENS_POR_PAGINA && (() => {
        const totalPaginas = Math.ceil(protocolos.length / ITENS_POR_PAGINA);
        return (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {(paginaAtual - 1) * ITENS_POR_PAGINA + 1}-{Math.min(paginaAtual * ITENS_POR_PAGINA, protocolos.length)} de {protocolos.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pg => (
                <Button
                  key={pg}
                  variant={paginaAtual === pg ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPaginaAtual(pg)}
                >
                  {pg}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Modal de Busca por PDV */}
      <BuscarProtocoloPdv
        isOpen={showBuscaPdv}
        onClose={() => setShowBuscaPdv(false)}
        onSelectProtocolo={handleProtocoloEncontrado}
        motorista={motorista}
        selectionMode={modoBuscaPdv}
        statusFilter={filtroStatus === 'abertos' ? 'aberto' : 'em_andamento'}
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
