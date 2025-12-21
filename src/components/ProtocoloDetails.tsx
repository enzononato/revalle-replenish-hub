import { useState, useEffect } from 'react';
import { Protocolo, ObservacaoLog, User } from '@/types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  User as UserIcon, 
  Building2, 
  Package, 
  Image, 
  MessageSquare,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
  Lock,
  Pencil,
  X,
  Check,
  Truck,
  Phone,
  Camera,
  Send,
  RefreshCw,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ChatBubbleExpanded } from '@/components/chat/ChatBubbleExpanded';
import { useChatDB } from '@/hooks/useChatDB';

interface ProtocoloDetailsProps {
  protocolo: Protocolo | null;
  protocolos: Protocolo[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onUpdateProtocolo?: (protocolo: Protocolo) => void;
  user?: User | null;
  canValidate?: boolean;
  canEditMotorista?: boolean;
  isConferente?: boolean;
  isAdmin?: boolean;
  isDistribuicao?: boolean;
}

export function ProtocoloDetails({ 
  protocolo, 
  protocolos, 
  currentIndex, 
  open, 
  onClose, 
  onNavigate,
  onUpdateProtocolo,
  user,
  canValidate,
  canEditMotorista,
  isConferente = false,
  isAdmin = false,
  isDistribuicao = false
}: ProtocoloDetailsProps) {
  const [habilitarReenvio, setHabilitarReenvio] = useState(protocolo?.habilitarReenvio || false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [mensagemEncerramento, setMensagemEncerramento] = useState('');
  const [arquivoAnexado, setArquivoAnexado] = useState<File | null>(null);
  const [editandoWhatsapp, setEditandoWhatsapp] = useState(false);
  const [whatsappEditado, setWhatsappEditado] = useState(protocolo?.motorista.whatsapp || '');
  const [clienteTelefone, setClienteTelefone] = useState(protocolo?.clienteTelefone || '');
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>();
  const [chatTargetUser, setChatTargetUser] = useState<{ id: string; nome: string; nivel: string; unidade: string } | null>(null);

  const { getOrCreateConversation, getOrCreateUnitGroup, sendMessage } = useChatDB();

  if (!protocolo) return null;

  // Extrair validador do log de observações
  const getValidadorFromLog = (): { nome: string; id: string } | null => {
    const logValidacao = protocolo.observacoesLog?.find(l => l.acao === 'Confirmou validação');
    if (logValidacao) {
      return { nome: logValidacao.usuarioNome, id: logValidacao.usuarioId };
    }
    return null;
  };

  // Função para abrir chat de discussão do protocolo - fecha o dialog e navega para o chat
  const handleDiscutirProtocolo = async () => {
    // Fecha o dialog primeiro
    onClose();
    
    // Navega para a página de chat com parâmetros do protocolo
    const validador = getValidadorFromLog();
    const params = new URLSearchParams({
      protocolo_id: protocolo.id,
      protocolo_numero: protocolo.numero,
    });
    
    if (validador) {
      params.set('target_user_id', validador.id);
      params.set('target_user_nome', validador.nome);
    }
    
    // Usar window.location para garantir navegação (o navigate do react-router não está no escopo)
    window.location.href = `/chat?${params.toString()}`;
  };

  // Função para alertar distribuição (apenas conferentes)
  const handleAlertarDistribuicao = async () => {
    if (!user) return;
    
    try {
      // Buscar ou criar grupo da unidade
      const unidade = protocolo.unidadeNome || protocolo.motorista.unidade || user.unidade;
      const conversationId = await getOrCreateUnitGroup(unidade);
      
      // Enviar mensagem de alerta
      await sendMessage({
        conversationId,
        content: `⚠️ ATENÇÃO! Protocolo ${protocolo.numero} precisa de revisão urgente.\n\nMotorista: ${protocolo.motorista.nome}\nData: ${protocolo.data}\n\nPor favor verificar!`,
        protocoloId: protocolo.id,
        protocoloNumero: protocolo.numero
      });
      
      toast.success('Alerta enviado para o grupo da distribuição!');
    } catch (error) {
      console.error('Erro ao alertar distribuição:', error);
      toast.error('Erro ao enviar alerta');
    }
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < protocolos.length - 1;

  // Coletar todas as fotos disponíveis
  const todasFotos: { url: string; label: string }[] = [];
  
  // Fotos do array protocolo.fotos
  if (protocolo.fotos && protocolo.fotos.length > 0) {
    protocolo.fotos.forEach((foto, index) => {
      todasFotos.push({ url: foto, label: `Foto ${index + 1}` });
    });
  }
  
  // Fotos do objeto fotosProtocolo
  if (protocolo.fotosProtocolo) {
    if (protocolo.fotosProtocolo.fotoMotoristaPdv) {
      todasFotos.push({ url: protocolo.fotosProtocolo.fotoMotoristaPdv, label: 'Motorista/PDV' });
    }
    if (protocolo.fotosProtocolo.fotoLoteProduto) {
      todasFotos.push({ url: protocolo.fotosProtocolo.fotoLoteProduto, label: 'Lote Produto' });
    }
    if (protocolo.fotosProtocolo.fotoAvaria) {
      todasFotos.push({ url: protocolo.fotosProtocolo.fotoAvaria, label: 'Avaria' });
    }
  }

  const handleSalvarObservacao = () => {
    if (!novaObservacao.trim() || !user || !onUpdateProtocolo) return;
    
    const novoLog: ObservacaoLog = {
      id: Date.now().toString(),
      usuarioNome: user.nome,
      usuarioId: user.id,
      data: format(new Date(), 'dd/MM/yyyy'),
      hora: format(new Date(), 'HH:mm'),
      acao: 'Adicionou observação',
      texto: novaObservacao
    };
    
    const protocoloAtualizado = {
      ...protocolo,
      observacoesLog: [...(protocolo.observacoesLog || []), novoLog]
    };
    
    onUpdateProtocolo(protocoloAtualizado);
    setNovaObservacao('');
    toast.success('Observação salva!');
  };

  const handleAnexarPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setArquivoAnexado(file);
    } else {
      toast.error('Por favor, selecione um arquivo PDF');
    }
  };

  const handleEncerrarProtocolo = () => {
    if (!onUpdateProtocolo || !user) return;
    
    const protocoloAtualizado: Protocolo = {
      ...protocolo,
      status: 'encerrado' as const,
      mensagemEncerramento,
      arquivoEncerramento: arquivoAnexado?.name,
      observacoesLog: [
        ...(protocolo.observacoesLog || []),
        {
          id: Date.now().toString(),
          usuarioNome: user.nome,
          usuarioId: user.id,
          data: format(new Date(), 'dd/MM/yyyy'),
          hora: format(new Date(), 'HH:mm'),
          acao: 'Encerrou o protocolo',
          texto: mensagemEncerramento || 'Protocolo encerrado'
        }
      ]
    };
    
    onUpdateProtocolo(protocoloAtualizado);
    toast.success('Protocolo encerrado com sucesso!');
    onClose();
  };

  const handleConfirmarValidacao = () => {
    if (!onUpdateProtocolo) return;
    
    const protocoloAtualizado: Protocolo = {
      ...protocolo,
      validacao: !protocolo.validacao,
      observacoesLog: [
        ...(protocolo.observacoesLog || []),
        {
          id: Date.now().toString(),
          usuarioNome: user?.nome || '',
          usuarioId: user?.id || '',
          data: format(new Date(), 'dd/MM/yyyy'),
          hora: format(new Date(), 'HH:mm'),
          acao: protocolo.validacao ? 'Removeu validação' : 'Confirmou validação',
          texto: protocolo.validacao ? 'Validação removida' : 'Protocolo validado'
        }
      ]
    };
    
    onUpdateProtocolo(protocoloAtualizado);
    toast.success(protocolo.validacao ? 'Validação removida!' : 'Protocolo validado!');
  };

  const handleReenviarWhatsapp = async (tipo: 'lancar' | 'encerrar') => {
    if (!clienteTelefone.trim()) {
      toast.error('Digite o telefone do cliente para reenviar');
      return;
    }

    if (!onUpdateProtocolo) return;

    setEnviandoWhatsapp(true);

    try {
      const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
        body: {
          tipo,
          numero: protocolo.numero,
          data: protocolo.data,
          hora: protocolo.hora,
          mapa: protocolo.mapa,
          notaFiscal: protocolo.notaFiscal,
          motoristaNome: protocolo.motorista.nome,
          motoristaWhatsapp: protocolo.motorista.whatsapp,
          motoristaEmail: protocolo.motorista.email,
          unidade: protocolo.unidadeNome,
          observacaoGeral: protocolo.observacaoGeral,
          produtos: protocolo.produtos,
          fotosProtocolo: protocolo.fotosProtocolo,
          mensagemEncerramento: protocolo.mensagemEncerramento || 'Encerrando protocolo',
          clienteTelefone
        }
      });

      if (error) throw error;

      if (data?.success) {
        const statusField = tipo === 'lancar' ? 'enviadoLancarStatus' : 'enviadoEncerrarStatus';
        const erroField = tipo === 'lancar' ? 'enviadoLancarErro' : 'enviadoEncerrarErro';
        const enviadoField = tipo === 'lancar' ? 'enviadoLancar' : 'enviadoEncerrar';
        
        const protocoloAtualizado: Protocolo = {
          ...protocolo,
          [enviadoField]: true,
          [statusField]: 'enviado',
          [erroField]: undefined,
          clienteTelefone,
          habilitarReenvio: false,
          observacoesLog: [
            ...(protocolo.observacoesLog || []),
            {
              id: Date.now().toString(),
              usuarioNome: user?.nome || 'Sistema',
              usuarioId: user?.id || '',
              data: format(new Date(), 'dd/MM/yyyy'),
              hora: format(new Date(), 'HH:mm'),
              acao: tipo === 'lancar' ? 'Reenviou mensagem de lançamento' : 'Reenviou mensagem de encerramento',
              texto: `Mensagem reenviada para ${clienteTelefone}`
            }
          ]
        };
        
        onUpdateProtocolo(protocoloAtualizado);
        setHabilitarReenvio(false);
        toast.success(`Mensagem de ${tipo === 'lancar' ? 'lançamento' : 'encerramento'} reenviada com sucesso!`);
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao reenviar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      toast.error(`Falha ao reenviar: ${errorMessage}`);
    } finally {
      setEnviandoWhatsapp(false);
    }
  };

  const handleDownload = () => {
    const content = `
DETALHES DO PROTOCOLO
=====================

PROTOCOLO: ${protocolo.numero}
DATA: ${protocolo.data}
HORA: ${protocolo.hora}
STATUS: ${protocolo.status.toUpperCase()}

TIPO DE REPOSIÇÃO: ${protocolo.tipoReposicao || '-'}
CAUSA: ${protocolo.causa || '-'}
UNIDADE: ${protocolo.unidadeNome || '-'} (ID ${protocolo.unidadeId || '-'})

DADOS DO MOTORISTA
------------------
Motorista: ${protocolo.motorista.codigo}
Nome: ${protocolo.motorista.nome}
E-mail: ${protocolo.motorista.email || '-'}
WhatsApp: ${protocolo.motorista.whatsapp || '-'}

INFORMAÇÕES DO CLIENTE
----------------------
Código PDV: ${protocolo.codigoPdv || '-'}
MAPA: ${protocolo.mapa || '-'}
Nota Fiscal: ${protocolo.notaFiscal || '-'}

OBSERVAÇÃO
----------
${protocolo.observacaoGeral || '-'}

PRODUTOS RECEBIDOS
------------------
${protocolo.produtos?.map(p => 
  `${p.codigo} | ${p.nome} | ${p.unidade} | Qtd: ${p.quantidade} | Val: ${p.validade} | Obs: ${p.observacao || '-'}`
).join('\n') || 'Nenhum produto'}

HISTÓRICO DE OBSERVAÇÕES
------------------------
${protocolo.observacoesLog?.map(o => 
  `${o.data} ${o.hora} - ${o.usuarioNome} - ${o.acao}: ${o.texto}`
).join('\n') || 'Nenhum histórico'}

STATUS DO PROTOCOLO
-------------------
Validado: ${protocolo.validacao ? 'Sim' : 'Não'}
Lançado: ${protocolo.lancado ? 'Sim' : 'Não'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocolo.numero}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="font-heading text-xl flex items-center gap-2 text-primary">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <FileText className="text-primary" size={20} />
                  </div>
                  Protocolo {protocolo.numero}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 ml-9">
                  {protocolo.data} às {protocolo.hora}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-background border rounded-lg px-1.5 py-0.5 shadow-sm">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onNavigate(currentIndex - 1)}
                    disabled={!canGoPrevious}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-xs text-muted-foreground px-1.5 font-medium">
                    {currentIndex + 1} de {protocolos.length}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onNavigate(currentIndex + 1)}
                    disabled={!canGoNext}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <Button onClick={handleDownload} variant="outline" size="sm" className="h-7 gap-1.5 text-xs shadow-sm">
                  <Download size={14} />
                  Download
                </Button>
                <Button 
                  onClick={handleDiscutirProtocolo} 
                  variant="default" 
                  size="sm" 
                  className="h-7 gap-1.5 text-xs shadow-sm bg-primary hover:bg-primary/90"
                >
                  <MessageCircle size={14} />
                  Discutir Protocolo
                </Button>
                {/* Botão Alertar Distribuição - apenas para conferentes */}
                {isConferente && protocolo.status !== 'encerrado' && (
                  <Button 
                    onClick={handleAlertarDistribuicao} 
                    variant="outline" 
                    size="sm" 
                    className="h-7 gap-1.5 text-xs shadow-sm border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <AlertTriangle size={14} />
                    Alertar Distribuição
                  </Button>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-4 p-4">
            {/* Status do Protocolo */}
            <div className="bg-card rounded-xl p-4 border shadow-sm">
              <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle size={16} className="text-primary" />
                Status do Protocolo
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={protocolo.status} />
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  protocolo.validacao 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {protocolo.validacao ? (
                    <CheckCircle className="text-emerald-500" size={16} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={16} />
                  )}
                  <span>Validado: {protocolo.validacao ? 'Sim' : 'Não'}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  protocolo.lancado 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {protocolo.lancado ? (
                    <CheckCircle className="text-blue-500" size={16} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={16} />
                  )}
                  <span>Lançado: {protocolo.lancado ? 'Sim' : 'Não'}</span>
                </div>
                
                {/* Botão de Validação para Conferente */}
                {canValidate && protocolo.status !== 'encerrado' && onUpdateProtocolo && (
                  <Button 
                    variant={protocolo.validacao ? "outline" : "default"}
                    size="sm"
                    onClick={handleConfirmarValidacao}
                    className="ml-auto"
                  >
                    {protocolo.validacao ? 'Remover Validação' : 'Confirmar Validação'}
                  </Button>
                )}
              </div>
            </div>

            {/* Informações Gerais - Card unificado com duas colunas */}
            <div className="bg-card rounded-xl p-4 border shadow-sm">
              <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Clock size={16} className="text-primary" />
                INFORMAÇÕES GERAIS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {/* Coluna Esquerda */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">PROTOCOLO:</span>
                    <span className="text-xs text-foreground">{protocolo.numero}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">DATA:</span>
                    <span className="text-xs text-foreground">{protocolo.data}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">MOTORISTA:</span>
                    <span className="text-xs text-foreground">{protocolo.motorista.codigo} - {protocolo.motorista.nome}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">UNIDADE:</span>
                    <span className="text-xs text-foreground">{protocolo.motorista.unidade || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">MAPA:</span>
                    <span className="text-xs text-foreground">{protocolo.mapa || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">CÓDIGO PDV:</span>
                    <span className="text-xs text-foreground">{protocolo.codigoPdv || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">NOTA FISCAL:</span>
                    <span className="text-xs text-foreground">{protocolo.notaFiscal || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">CAUSA:</span>
                    <span className="text-xs text-foreground">{protocolo.causa || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">TIPO DE REPOSIÇÃO:</span>
                    <span className="text-xs text-foreground">{protocolo.tipoReposicao || '-'}</span>
                  </div>
                </div>

                {/* Coluna Direita */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">STATUS:</span>
                    <span className="text-xs text-foreground uppercase">{protocolo.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">HORA:</span>
                    <span className="text-xs text-foreground">{protocolo.hora}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">UNIDADE:</span>
                    <span className="text-xs text-foreground">{protocolo.motorista.unidade || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">WHATSAPP CONTATO:</span>
                    {canEditMotorista && !editandoWhatsapp ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground font-medium text-primary">{protocolo.contatoWhatsapp || '-'}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => {
                            setWhatsappEditado(protocolo.motorista.whatsapp || '');
                            setEditandoWhatsapp(true);
                          }}
                        >
                          <Pencil size={12} />
                        </Button>
                      </div>
                    ) : canEditMotorista && editandoWhatsapp ? (
                      <div className="flex items-center gap-1.5">
                        <Input 
                          value={whatsappEditado}
                          onChange={(e) => setWhatsappEditado(e.target.value)}
                          placeholder="(XX) XXXXX-XXXX"
                          className="h-6 w-32 text-xs"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            if (!onUpdateProtocolo || !user) return;
                            
                            const protocoloAtualizado = {
                              ...protocolo,
                              motorista: {
                                ...protocolo.motorista,
                                whatsapp: whatsappEditado
                              },
                              observacoesLog: [
                                ...(protocolo.observacoesLog || []),
                                {
                                  id: Date.now().toString(),
                                  usuarioNome: user.nome,
                                  usuarioId: user.id,
                                  data: format(new Date(), 'dd/MM/yyyy'),
                                  hora: format(new Date(), 'HH:mm'),
                                  acao: 'Editou WhatsApp',
                                  texto: `WhatsApp alterado para ${whatsappEditado || '(vazio)'}`
                                }
                              ]
                            };
                            
                            onUpdateProtocolo(protocoloAtualizado);
                            setEditandoWhatsapp(false);
                            toast.success('WhatsApp atualizado!');
                          }}
                        >
                          Salvar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1.5"
                          onClick={() => setEditandoWhatsapp(false)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-foreground font-medium text-primary">{protocolo.contatoWhatsapp || '-'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">E-MAIL CONTATO:</span>
                    <span className="text-xs text-foreground">{protocolo.contatoEmail || '-'}</span>
                  </div>
                  {/* Switch de Habilitar Reenvio - Apenas para Admin e Distribuição */}
                  {!isConferente && (
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={habilitarReenvio} 
                        onCheckedChange={setHabilitarReenvio}
                        className="scale-75"
                      />
                      <span className="text-xs font-bold text-foreground uppercase">HABILITAR REENVIO?</span>
                    </div>
                  )}
                  
                  {/* Campo de telefone do cliente e botões de reenvio - Apenas para Admin e Distribuição */}
                  {!isConferente && habilitarReenvio && (
                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-primary" />
                        <span className="text-xs font-bold text-foreground uppercase">Telefone do Cliente:</span>
                      </div>
                      <Input 
                        value={clienteTelefone}
                        onChange={(e) => setClienteTelefone(e.target.value)}
                        placeholder="(XX) XXXXX-XXXX"
                        className="max-w-[200px] h-7 text-xs"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReenviarWhatsapp('lancar')}
                          disabled={enviandoWhatsapp || !clienteTelefone.trim()}
                          className="gap-1.5 h-7 text-xs"
                        >
                          {enviandoWhatsapp ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          Reenviar Lançamento
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleReenviarWhatsapp('encerrar')}
                          disabled={enviandoWhatsapp || !clienteTelefone.trim()}
                          className="gap-1.5 h-7 text-xs"
                        >
                          {enviandoWhatsapp ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          Reenviar Encerramento
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs font-bold text-foreground uppercase">OBSERVAÇÃO:</span>
                    <span className="text-xs text-foreground">{protocolo.observacaoGeral || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Produtos Recebidos - Estilo limpo como na imagem */}
            <div className="bg-background rounded-xl p-4 border border-border shadow-sm">
              <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5 uppercase">
                <Package size={16} className="text-muted-foreground" />
                Produtos Recebidos
              </h3>
              {protocolo.produtos && protocolo.produtos.length > 0 ? (
                <div className="overflow-x-auto border border-slate-300 dark:border-slate-600 rounded-lg">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Código</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Produto</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Unidade</th>
                        <th className="text-center px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Qtd</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">Validade</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-slate-600 dark:text-slate-300">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {protocolo.produtos.map((produto, index) => (
                        <tr key={index} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-2.5 py-1.5 text-foreground border-r border-slate-200 dark:border-slate-700">{produto.codigo}</td>
                          <td className="px-2.5 py-1.5 text-foreground border-r border-slate-200 dark:border-slate-700">{produto.nome}</td>
                          <td className="px-2.5 py-1.5 text-foreground border-r border-slate-200 dark:border-slate-700">{produto.unidade}</td>
                          <td className="px-2.5 py-1.5 text-center text-foreground border-r border-slate-200 dark:border-slate-700">{produto.quantidade}</td>
                          <td className="px-2.5 py-1.5 text-foreground border-r border-slate-200 dark:border-slate-700">{produto.validade}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{produto.observacao || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhum produto registrado</p>
              )}
            </div>

            {/* Fotos Enviadas */}
            {todasFotos.length > 0 && (
              <div className="bg-card rounded-xl p-4 border shadow-sm">
                <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Camera size={16} className="text-primary" />
                  FOTOS ENVIADAS
                </h3>
                <div className="flex flex-wrap gap-3">
                  {todasFotos.map((foto, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(foto.url)}
                      className="group relative w-28 h-28 rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-105 shadow-sm"
                    >
                      <img 
                        src={foto.url} 
                        alt={foto.label} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 dark:bg-background/80 text-[10px] text-center py-1 font-bold text-foreground uppercase">
                        {foto.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seção de Observações - Todos podem comentar */}
            <div className="bg-card rounded-xl p-4 border shadow-sm">
              <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <MessageSquare size={16} className="text-primary" />
                Histórico de Observações
              </h3>
              
              {/* Log de observações anteriores */}
              {protocolo.observacoesLog && protocolo.observacoesLog.length > 0 && (
                <div className="space-y-2 mb-3">
                  {[...protocolo.observacoesLog].reverse().map((log, index) => {
                    return (
                      <div key={log.id} className="flex gap-2 p-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                          {log.usuarioNome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-foreground">{log.usuarioNome}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{log.data} às {log.hora}</span>
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
                              {log.acao}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 text-foreground">{log.texto}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Campo para nova observação */}
              {user && onUpdateProtocolo && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    placeholder="Digite sua observação..."
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    className="min-h-[60px] text-xs"
                  />
                  <Button size="sm" onClick={handleSalvarObservacao} disabled={!novaObservacao.trim()} className="h-7 text-xs">
                    Salvar observação
                  </Button>
                </div>
              )}
            </div>

            {/* Seção de Encerramento */}
            <div className="bg-card rounded-xl p-4 border shadow-sm">
              <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <Lock size={14} className="text-primary" />
                Encerramento
              </h3>
              
              {protocolo.status !== 'encerrado' ? (
                (isAdmin || isDistribuicao) && user && onUpdateProtocolo ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Mensagem para o usuário</label>
                      <Textarea
                        placeholder="Escreva uma mensagem de encerramento..."
                        value={mensagemEncerramento}
                        onChange={(e) => setMensagemEncerramento(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Anexar arquivo PDF</label>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleAnexarPdf}
                          className="max-w-xs"
                        />
                        {arquivoAnexado && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                            <CheckCircle size={14} />
                            {arquivoAnexado.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive"
                      onClick={handleEncerrarProtocolo}
                      className="w-full shadow-lg"
                    >
                      <Lock size={16} className="mr-2" />
                      Encerrar Protocolo
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Você não tem permissão para encerrar este protocolo.</p>
                )
              ) : (
                <div className="text-sm space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2">
                    <CheckCircle size={18} />
                    Este protocolo foi encerrado.
                  </p>
                  {protocolo.mensagemEncerramento && (
                    <p className="text-foreground"><strong>Mensagem:</strong> {protocolo.mensagemEncerramento}</p>
                  )}
                  {protocolo.arquivoEncerramento && (
                    <p className="text-foreground flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground" />
                      <strong>Arquivo anexado:</strong> {protocolo.arquivoEncerramento}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Foto ampliada" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Bubble Expanded */}
      {showChat && (
        <ChatBubbleExpanded 
          onClose={() => {
            setShowChat(false);
            setChatTargetUser(null);
            setChatInitialMessage(undefined);
          }} 
          protocoloId={protocolo.id}
          protocoloNumero={protocolo.numero}
          initialMessage={chatInitialMessage}
          targetUser={chatTargetUser}
        />
      )}
    </>
  );
}
