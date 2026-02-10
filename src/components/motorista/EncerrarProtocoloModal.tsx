import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, CheckCircle, FileText, Loader2, X, ImageIcon, Package, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Motorista, Produto, ObservacaoLog, FotosProtocolo } from '@/types';
import { toast } from '@/hooks/use-toast';
import { uploadFotoParaStorage } from '@/utils/uploadFotoStorage';
import { getCustomPhotoUrl } from '@/utils/urlHelpers';
import CameraCapture from '@/components/CameraCapture';
import { cn } from '@/lib/utils';

interface ProtocoloParaEncerrar {
  id: string;
  numero: string;
  data: string;
  hora: string;
  status: string;
  tipo_reposicao: string | null;
  causa: string | null;
  codigo_pdv: string | null;
  nota_fiscal: string | null;
  motorista_nome: string;
  motorista_codigo: string | null;
  produtos: unknown;
  observacao_geral: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  fotos_protocolo: unknown;
  observacoes_log?: unknown;
  mapa?: string | null;
  motorista_whatsapp?: string | null;
  motorista_email?: string | null;
  motorista_unidade?: string | null;
  cliente_telefone?: string | null;
}

interface EncerrarProtocoloModalProps {
  isOpen: boolean;
  protocolo: ProtocoloParaEncerrar | null;
  motorista: Motorista;
  onClose: () => void;
  onSuccess: () => void;
}

const N8N_WEBHOOK_URL = 'https://n8n.revalle.com.br/webhook/reposicaowpp';

export function EncerrarProtocoloModal({ 
  isOpen, 
  protocolo, 
  motorista, 
  onClose, 
  onSuccess 
}: EncerrarProtocoloModalProps) {
  const [observacao, setObservacao] = useState('');
  const [fotoNotaFiscal, setFotoNotaFiscal] = useState<string | null>(null);
  const [fotoMercadoria, setFotoMercadoria] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'nota' | 'mercadoria' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<number>>(new Set());

  const produtos = useMemo(() => {
    return Array.isArray(protocolo?.produtos) ? protocolo.produtos as Produto[] : [];
  }, [protocolo?.produtos]);

  const produtosPendentes = useMemo(() => {
    return produtos.filter(p => !p.entregue);
  }, [produtos]);

  const produtosJaEntregues = useMemo(() => {
    return produtos.filter(p => p.entregue);
  }, [produtos]);

  // Check if selecting current products will complete all deliveries
  const isEntregaTotal = useMemo(() => {
    if (produtosPendentes.length === 0) return true;
    return produtosSelecionados.size === produtosPendentes.length;
  }, [produtosSelecionados, produtosPendentes]);

  const canSubmit = fotoNotaFiscal && fotoMercadoria && produtosSelecionados.size > 0;

  const handleCapture = (imageData: string) => {
    if (cameraTarget === 'nota') {
      setFotoNotaFiscal(imageData);
    } else if (cameraTarget === 'mercadoria') {
      setFotoMercadoria(imageData);
    }
    setCameraTarget(null);
  };

  const handleClose = () => {
    setObservacao('');
    setFotoNotaFiscal(null);
    setFotoMercadoria(null);
    setCameraTarget(null);
    setUploadProgress('');
    setProdutosSelecionados(new Set());
    onClose();
  };

  const toggleProduto = (index: number) => {
    setProdutosSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleTodos = () => {
    if (produtosSelecionados.size === produtosPendentes.length) {
      setProdutosSelecionados(new Set());
    } else {
      // Select all pending product indices
      const allPendingIndices = new Set<number>();
      produtos.forEach((p, i) => {
        if (!p.entregue) allPendingIndices.add(i);
      });
      setProdutosSelecionados(allPendingIndices);
    }
  };

  const handleSubmit = async () => {
    if (!protocolo || !fotoNotaFiscal || !fotoMercadoria || produtosSelecionados.size === 0) return;
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload das fotos para o Storage
      setUploadProgress('Enviando foto do canhoto assinado...');
      const urlFotoNF = await uploadFotoParaStorage(
        fotoNotaFiscal,
        protocolo.numero,
        'nota_fiscal_encerramento'
      );
      
      if (!urlFotoNF) {
        throw new Error('Falha ao enviar foto do canhoto assinado');
      }

      setUploadProgress('Enviando foto da mercadoria...');
      const urlFotoMercadoria = await uploadFotoParaStorage(
        fotoMercadoria,
        protocolo.numero,
        'mercadoria_entrega'
      );
      
      if (!urlFotoMercadoria) {
        throw new Error('Falha ao enviar foto da mercadoria');
      }

      // 2. Mark selected products as delivered
      const agora = format(new Date(), 'dd/MM/yyyy HH:mm');
      const produtosAtualizados = produtos.map((p, i) => {
        if (produtosSelecionados.has(i) && !p.entregue) {
          return {
            ...p,
            entregue: true,
            dataEntrega: agora,
            entregaPorMotoristaId: motorista.id,
            entregaPorMotoristaNome: motorista.nome,
          };
        }
        return p;
      });

      const todosEntregues = produtosAtualizados.every(p => p.entregue);
      const novoStatus = todosEntregues ? 'encerrado' : 'em_andamento';

      // 3. Prepare log entry
      const produtosEntreguesAgora = produtos.filter((_, i) => produtosSelecionados.has(i) && !produtos[i].entregue);
      const acaoLog = todosEntregues ? 'Encerrou o protocolo (entrega final)' : 'Entrega parcial';
      const textoLog = todosEntregues
        ? (observacao || 'Todos os produtos entregues pelo motorista')
        : `Entregou ${produtosEntreguesAgora.length} produto(s): ${produtosEntreguesAgora.map(p => p.nome).join(', ')}${observacao ? ` - ${observacao}` : ''}`;

      const novaObservacao: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: motorista.nome,
        usuarioId: motorista.id,
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: acaoLog,
        texto: textoLog
      };

      const observacoesLogExistentes = Array.isArray(protocolo.observacoes_log) 
        ? protocolo.observacoes_log as ObservacaoLog[]
        : [];

      // 4. Update protocolo in DB
      setUploadProgress(todosEntregues ? 'Finalizando protocolo...' : 'Registrando entrega parcial...');
      
      const updateData: Record<string, unknown> = {
        status: novoStatus,
        produtos: JSON.parse(JSON.stringify(produtosAtualizados)),
        observacoes_log: JSON.parse(JSON.stringify([...observacoesLogExistentes, novaObservacao])),
        // Always update driver info
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        motorista_codigo: motorista.codigo,
        motorista_whatsapp: motorista.whatsapp || null,
        motorista_email: motorista.email || null,
        motorista_unidade: motorista.unidade,
      };

      if (todosEntregues) {
        updateData.encerrado_por_tipo = 'motorista';
        updateData.encerrado_por_motorista_id = motorista.id;
        updateData.encerrado_por_motorista_nome = motorista.nome;
        updateData.foto_nota_fiscal_encerramento = urlFotoNF;
        updateData.foto_entrega_mercadoria = urlFotoMercadoria;
        updateData.mensagem_encerramento = observacao || 'Encerrado pelo motorista';
      }

      const { error: updateError } = await supabase
        .from('protocolos')
        .update(updateData as never)
        .eq('id', protocolo.id);

      if (updateError) throw updateError;

      // 5. Audit log
      await supabase.from('audit_logs').insert({
        acao: todosEntregues ? 'encerramento_motorista' : 'entrega_parcial',
        tabela: 'protocolos',
        registro_id: protocolo.id,
        registro_dados: {
          numero: protocolo.numero,
          motorista_encerrador: motorista.nome,
          motorista_encerrador_codigo: motorista.codigo,
          produtos_entregues: produtosEntreguesAgora.map(p => ({ codigo: p.codigo, nome: p.nome })),
          entrega_total: todosEntregues,
          observacao: observacao,
        },
        usuario_nome: motorista.nome,
        usuario_role: 'motorista',
        usuario_unidade: motorista.unidade
      });

      // 6. Driver change audit
      if (protocolo.motorista_codigo !== motorista.codigo) {
        await supabase.from('audit_logs').insert({
          acao: 'troca_motorista_encerramento',
          tabela: 'protocolos',
          registro_id: protocolo.id,
          registro_dados: {
            numero: protocolo.numero,
            motorista_anterior: protocolo.motorista_nome,
            motorista_anterior_codigo: protocolo.motorista_codigo,
            motorista_novo: motorista.nome,
            motorista_novo_codigo: motorista.codigo,
            motivo: todosEntregues ? 'Encerramento por outro motorista' : 'Entrega parcial por outro motorista'
          },
          usuario_nome: motorista.nome,
          usuario_role: 'motorista',
          usuario_unidade: motorista.unidade
        });
      }

      // 7. Webhook (only on full closure)
      if (todosEntregues) {
        const fotosProtocolo = protocolo.fotos_protocolo as FotosProtocolo | null;
        const webhookPayload = {
          tipo: 'encerramento',
          numero: protocolo.numero,
          data: protocolo.data,
          hora: protocolo.hora,
          dataEncerramento: format(new Date(), 'dd/MM/yyyy'),
          horaEncerramento: format(new Date(), 'HH:mm'),
          status: 'encerrado',
          mapa: protocolo.mapa || '',
          notaFiscal: protocolo.nota_fiscal || '',
          codigoPdv: protocolo.codigo_pdv || '',
          tipoReposicao: protocolo.tipo_reposicao || '',
          causa: protocolo.causa || '',
          motoristaNome: motorista.nome,
          motoristaCodigo: motorista.codigo,
          motoristaWhatsapp: motorista.whatsapp || '',
          motoristaEmail: motorista.email || '',
          unidade: motorista.unidade || '',
          clienteTelefone: protocolo.cliente_telefone || '',
          contatoEmail: protocolo.contato_email || '',
          contatoWhatsapp: protocolo.contato_whatsapp || '',
          observacaoGeral: protocolo.observacao_geral || '',
          produtos: produtosAtualizados.map(p => ({
            codigo: p.codigo,
            nome: p.nome,
            quantidade: p.quantidade,
            unidade: p.unidade,
            validade: p.validade,
            observacao: p.observacao || '',
            entregue: p.entregue,
            dataEntrega: p.dataEntrega || '',
          })),
          fotos: {
            fotoMotoristaPdv: getCustomPhotoUrl(fotosProtocolo?.fotoMotoristaPdv || ''),
            fotoLoteProduto: getCustomPhotoUrl(fotosProtocolo?.fotoLoteProduto || ''),
            fotoAvaria: getCustomPhotoUrl(fotosProtocolo?.fotoAvaria || '')
          },
          fotoNotaFiscalEncerramento: urlFotoNF,
          fotoEntregaMercadoria: urlFotoMercadoria,
          mensagemEncerramento: observacao || 'Encerrado pelo motorista',
          usuarioEncerramento: {
            nome: motorista.nome,
            id: motorista.id,
            codigo: motorista.codigo,
            tipo: 'motorista'
          }
        };

        try {
          await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
          });
        } catch (webhookError) {
          console.error('Erro ao enviar webhook:', webhookError);
        }
      }

      toast({
        title: todosEntregues ? 'Protocolo encerrado!' : 'Entrega parcial registrada!',
        description: todosEntregues
          ? `Reposição ${protocolo.numero} finalizada com sucesso.`
          : `${produtosEntreguesAgora.length} produto(s) entregue(s). Protocolo continua em andamento.`,
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Erro ao processar entrega:', error);
      toast({
        title: 'Erro ao processar',
        description: 'Não foi possível registrar a entrega. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  if (!protocolo) return null;

  return (
    <>
      <Dialog open={isOpen && !cameraTarget} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {isEntregaTotal ? 'Encerrar Reposição' : 'Entrega Parcial'}
            </DialogTitle>
          </DialogHeader>

          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm font-medium">{protocolo.numero}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>PDV: {protocolo.codigo_pdv || 'N/A'}</p>
                <p>Motorista: {protocolo.motorista_nome}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* Seleção de produtos */}
            {produtos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Selecione os produtos entregues *
                  </Label>
                  {produtosPendentes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={toggleTodos}
                    >
                      {produtosSelecionados.size === produtosPendentes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg divide-y">
                  {produtos.map((produto, index) => {
                    const jaEntregue = !!produto.entregue;
                    const selecionado = produtosSelecionados.has(index);

                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-2.5 text-xs",
                          jaEntregue && "bg-muted/50 opacity-60",
                          !jaEntregue && selecionado && "bg-green-50 dark:bg-green-500/10",
                          !jaEntregue && "cursor-pointer hover:bg-muted/30"
                        )}
                        onClick={() => !jaEntregue && toggleProduto(index)}
                      >
                        {jaEntregue ? (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Checkbox
                            checked={selecionado}
                            onCheckedChange={() => toggleProduto(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium truncate", jaEntregue && "line-through")}>
                            {produto.codigo} - {produto.nome}
                          </p>
                          <p className="text-muted-foreground">
                            {produto.quantidade} {produto.unidade}
                            {jaEntregue && produto.dataEntrega && ` • Entregue em ${produto.dataEntrega}`}
                          </p>
                        </div>
                        {jaEntregue && (
                          <span className="text-[9px] bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400 px-1.5 py-0.5 rounded-full shrink-0">
                            Entregue
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {produtosJaEntregues.length > 0 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {produtosJaEntregues.length} produto(s) já entregue(s) anteriormente
                  </p>
                )}
              </div>
            )}

            {/* Foto do Canhoto Assinado */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                Foto do Canhoto Assinado *
              </Label>
              {fotoNotaFiscal ? (
                <div className="relative">
                  <img 
                    src={fotoNotaFiscal} 
                    alt="Canhoto Assinado" 
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFotoNotaFiscal(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Capturada
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col gap-2"
                  onClick={() => setCameraTarget('nota')}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Tirar foto do Canhoto Assinado</span>
                </Button>
              )}
            </div>

            {/* Foto da Mercadoria */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                Foto da Mercadoria Entregue *
              </Label>
              {fotoMercadoria ? (
                <div className="relative">
                  <img 
                    src={fotoMercadoria} 
                    alt="Mercadoria" 
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => setFotoMercadoria(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Capturada
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col gap-2"
                  onClick={() => setCameraTarget('mercadoria')}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs">Tirar foto da Mercadoria</span>
                </Button>
              )}
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                placeholder="Adicione uma observação sobre a entrega..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
              />
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadProgress}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEntregaTotal ? 'Encerrando...' : 'Registrando...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isEntregaTotal ? 'Confirmar Encerramento' : 'Confirmar Entrega'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={cameraTarget !== null}
        onClose={() => setCameraTarget(null)}
        onCapture={handleCapture}
        title={cameraTarget === 'nota' ? 'Foto do Canhoto Assinado' : 'Foto da Mercadoria'}
      />
    </>
  );
}
