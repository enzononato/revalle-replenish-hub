import { useState } from 'react';
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
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  canEditMotorista
}: ProtocoloDetailsProps) {
  const [habilitarReenvio, setHabilitarReenvio] = useState(protocolo?.habilitarReenvio || false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [mensagemEncerramento, setMensagemEncerramento] = useState('');
  const [arquivoAnexado, setArquivoAnexado] = useState<File | null>(null);
  const [editandoWhatsapp, setEditandoWhatsapp] = useState(false);
  const [whatsappEditado, setWhatsappEditado] = useState(protocolo?.motorista.whatsapp || '');

  if (!protocolo) return null;

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < protocolos.length - 1;

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <FileText className="text-primary" size={24} />
              Detalhes do Protocolo
            </DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={!canGoPrevious}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft size={18} />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentIndex + 1} de {protocolos.length}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={!canGoNext}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
                <Download size={16} />
                Download
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Status do Protocolo */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <CheckCircle size={16} />
                Status do Protocolo
              </h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  {protocolo.validacao ? (
                    <CheckCircle className="text-green-500" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Validado: <strong>{protocolo.validacao ? 'Sim' : 'Não'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  {protocolo.lancado ? (
                    <CheckCircle className="text-green-500" size={18} />
                  ) : (
                    <XCircle className="text-muted-foreground" size={18} />
                  )}
                  <span className="text-sm">Lançado: <strong>{protocolo.lancado ? 'Sim' : 'Não'}</strong></span>
                </div>
                
                {/* Botão de Validação para Conferente */}
                {canValidate && protocolo.status !== 'encerrado' && onUpdateProtocolo && (
                  <Button 
                    variant={protocolo.validacao ? "outline" : "default"}
                    size="sm"
                    onClick={handleConfirmarValidacao}
                  >
                    {protocolo.validacao ? 'Remover Validação' : 'Confirmar Validação'}
                  </Button>
                )}
              </div>
            </div>

            {/* Informações Gerais */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Clock size={16} />
                Informações Gerais
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Protocolo</p>
                  <p className="font-medium text-sm">{protocolo.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium text-sm">{protocolo.data}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hora</p>
                  <p className="font-medium text-sm">{protocolo.hora}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={protocolo.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Reposição</p>
                  <p className="font-medium text-sm">{protocolo.tipoReposicao || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Causa</p>
                  <p className="font-medium text-sm">{protocolo.causa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="font-medium text-sm">{protocolo.unidadeNome || '-'} (ID {protocolo.unidadeId || '-'})</p>
                </div>
              </div>
            </div>

            {/* Dados do Motorista */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <UserIcon size={16} />
                Dados do Motorista
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Motorista</p>
                  <p className="font-medium text-sm">{protocolo.motorista.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium text-sm">{protocolo.motorista.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">E-mail</p>
                  <p className="font-medium text-sm">{protocolo.motorista.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  {canEditMotorista && !editandoWhatsapp ? (
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{protocolo.motorista.whatsapp || '-'}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setWhatsappEditado(protocolo.motorista.whatsapp || '');
                          setEditandoWhatsapp(true);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                    </div>
                  ) : canEditMotorista && editandoWhatsapp ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={whatsappEditado}
                        onChange={(e) => setWhatsappEditado(e.target.value)}
                        placeholder="(XX) XXXXX-XXXX"
                        className="h-8 w-40"
                      />
                      <Button 
                        size="sm" 
                        className="h-8 px-2"
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
                        <Check size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2"
                        onClick={() => setEditandoWhatsapp(false)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <p className="font-medium text-sm">{protocolo.motorista.whatsapp || '-'}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">Habilitar Reenvio?</p>
                  <Switch 
                    checked={habilitarReenvio} 
                    onCheckedChange={setHabilitarReenvio} 
                  />
                </div>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 size={16} />
                Informações do Cliente
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Código PDV</p>
                  <p className="font-medium text-sm">{protocolo.codigoPdv || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MAPA</p>
                  <p className="font-medium text-sm">{protocolo.mapa || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nota Fiscal</p>
                  <p className="font-medium text-sm">{protocolo.notaFiscal || '-'}</p>
                </div>
              </div>
            </div>

            {/* Observação Geral */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Observação Geral
              </h3>
              <p className="text-sm">{protocolo.observacaoGeral || '-'}</p>
            </div>

            {/* Produtos Recebidos */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Package size={16} />
                Produtos Recebidos
              </h3>
              {protocolo.produtos && protocolo.produtos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground font-bold">Código</th>
                        <th className="text-left p-2 text-muted-foreground font-bold">Produto</th>
                        <th className="text-left p-2 text-muted-foreground font-bold">Unidade</th>
                        <th className="text-center p-2 text-muted-foreground font-bold">Qtd</th>
                        <th className="text-left p-2 text-muted-foreground font-bold">Validade</th>
                        <th className="text-left p-2 text-muted-foreground font-bold">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {protocolo.produtos.map((produto, index) => (
                        <tr key={index} className="border-b border-border/50">
                          <td className="p-2 font-mono">{produto.codigo}</td>
                          <td className="p-2">{produto.nome}</td>
                          <td className="p-2">{produto.unidade}</td>
                          <td className="p-2 text-center font-medium">{produto.quantidade}</td>
                          <td className="p-2">{produto.validade}</td>
                          <td className="p-2 text-muted-foreground">{produto.observacao || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum produto registrado</p>
              )}
            </div>

            {/* Fotos Enviadas */}
            {protocolo.fotos && protocolo.fotos.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Image size={16} />
                  Fotos Enviadas
                </h3>
                <div className="flex flex-wrap gap-3">
                  {protocolo.fotos.map((foto, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(foto)}
                      className="w-20 h-20 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                    >
                      <img 
                        src={foto} 
                        alt={`Foto ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seção de Observações - Todos podem comentar */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Observações
              </h3>
              
              {/* Log de observações anteriores */}
              {protocolo.observacoesLog && protocolo.observacoesLog.length > 0 && (
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {[...protocolo.observacoesLog].reverse().map((log) => (
                    <div key={log.id} className="border-l-2 border-primary pl-3 py-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{log.usuarioNome}</span>
                        <span>•</span>
                        <span>{log.data} às {log.hora}</span>
                        <span>•</span>
                        <span className="text-primary">{log.acao}</span>
                      </div>
                      <p className="text-sm mt-1">{log.texto}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Campo para nova observação */}
              {user && onUpdateProtocolo && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Digite sua observação..."
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleSalvarObservacao} disabled={!novaObservacao.trim()}>
                    Salvar observações
                  </Button>
                </div>
              )}
            </div>

            {/* Seção de Encerramento */}
            <div className="bg-muted/50 rounded-lg p-4 border-t-4 border-destructive/30">
              <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Lock size={16} />
                Encerramento
              </h3>
              
              {protocolo.status !== 'encerrado' ? (
                user && onUpdateProtocolo ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mensagem para o usuário</label>
                      <Textarea
                        placeholder="Escreva uma mensagem de encerramento..."
                        value={mensagemEncerramento}
                        onChange={(e) => setMensagemEncerramento(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anexar arquivo PDF</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleAnexarPdf}
                          className="max-w-xs"
                        />
                        {arquivoAnexado && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Upload size={14} />
                            {arquivoAnexado.name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      variant="destructive"
                      onClick={handleEncerrarProtocolo}
                      className="w-full"
                    >
                      Encerrar Protocolo
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Você não tem permissão para encerrar este protocolo.</p>
                )
              ) : (
                <div className="text-sm space-y-2">
                  <p className="text-green-600 font-medium">Este protocolo foi encerrado.</p>
                  {protocolo.mensagemEncerramento && (
                    <p><strong>Mensagem:</strong> {protocolo.mensagemEncerramento}</p>
                  )}
                  {protocolo.arquivoEncerramento && (
                    <p><strong>Arquivo anexado:</strong> {protocolo.arquivoEncerramento}</p>
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
    </>
  );
}