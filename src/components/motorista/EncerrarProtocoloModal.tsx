import { useState } from 'react';
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
import { Camera, CheckCircle, FileText, Loader2, X, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Motorista, Produto, ObservacaoLog, FotosProtocolo } from '@/types';
import { toast } from '@/hooks/use-toast';
import { uploadFotoParaStorage } from '@/utils/uploadFotoStorage';
import CameraCapture from '@/components/CameraCapture';

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

  const canSubmit = fotoNotaFiscal && fotoMercadoria;

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
    onClose();
  };

  const handleSubmit = async () => {
    if (!protocolo || !fotoNotaFiscal || !fotoMercadoria) return;
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload das fotos para o Storage
      setUploadProgress('Enviando foto da nota fiscal...');
      const urlFotoNF = await uploadFotoParaStorage(
        fotoNotaFiscal,
        protocolo.numero,
        'nota_fiscal_encerramento'
      );
      
      if (!urlFotoNF) {
        throw new Error('Falha ao enviar foto da nota fiscal');
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

      // 2. Preparar novo log de observação
      const novaObservacao: ObservacaoLog = {
        id: crypto.randomUUID(),
        usuarioNome: motorista.nome,
        usuarioId: motorista.id,
        data: format(new Date(), 'dd/MM/yyyy'),
        hora: format(new Date(), 'HH:mm'),
        acao: 'Encerrou o protocolo',
        texto: observacao || 'Encerrado pelo motorista'
      };

      const observacoesLogExistentes = Array.isArray(protocolo.observacoes_log) 
        ? protocolo.observacoes_log as ObservacaoLog[]
        : [];

      // 3. Atualizar protocolo no banco (incluindo novo motorista responsável)
      setUploadProgress('Finalizando protocolo...');
      const { error: updateError } = await supabase
        .from('protocolos')
        .update({
          status: 'encerrado',
          // Atualizar motorista responsável para quem está encerrando
          motorista_id: motorista.id,
          motorista_nome: motorista.nome,
          motorista_codigo: motorista.codigo,
          motorista_whatsapp: motorista.whatsapp || null,
          motorista_email: motorista.email || null,
          motorista_unidade: motorista.unidade,
          // Dados de encerramento
          encerrado_por_tipo: 'motorista',
          encerrado_por_motorista_id: motorista.id,
          encerrado_por_motorista_nome: motorista.nome,
          foto_nota_fiscal_encerramento: urlFotoNF,
          foto_entrega_mercadoria: urlFotoMercadoria,
          mensagem_encerramento: observacao || 'Encerrado pelo motorista',
          observacoes_log: JSON.parse(JSON.stringify([...observacoesLogExistentes, novaObservacao]))
        })
        .eq('id', protocolo.id);

      if (updateError) throw updateError;

      // 4. Registrar auditoria de encerramento
      await supabase.from('audit_logs').insert({
        acao: 'encerramento_motorista',
        tabela: 'protocolos',
        registro_id: protocolo.id,
        registro_dados: {
          numero: protocolo.numero,
          motorista_encerrador: motorista.nome,
          motorista_encerrador_codigo: motorista.codigo,
          observacao: observacao,
          foto_nota_fiscal: urlFotoNF,
          foto_mercadoria: urlFotoMercadoria
        },
        usuario_nome: motorista.nome,
        usuario_role: 'motorista',
        usuario_unidade: motorista.unidade
      });

      // 5. Registrar auditoria de troca de motorista (se houve mudança)
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
            motivo: 'Encerramento por outro motorista'
          },
          usuario_nome: motorista.nome,
          usuario_role: 'motorista',
          usuario_unidade: motorista.unidade
        });
      }

      // 5. Enviar webhook para n8n (mesmo formato do encerramento admin)
      const produtos = Array.isArray(protocolo.produtos) ? protocolo.produtos as Produto[] : [];
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
        produtos: produtos.map(p => ({
          codigo: p.codigo,
          nome: p.nome,
          quantidade: p.quantidade,
          unidade: p.unidade,
          validade: p.validade,
          observacao: p.observacao || ''
        })),
        fotos: {
          fotoMotoristaPdv: fotosProtocolo?.fotoMotoristaPdv || '',
          fotoLoteProduto: fotosProtocolo?.fotoLoteProduto || '',
          fotoAvaria: fotosProtocolo?.fotoAvaria || ''
        },
        // Novas fotos de encerramento pelo motorista
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
        // Não falhar o encerramento por causa do webhook
      }

      toast({
        title: 'Protocolo encerrado!',
        description: `Reposição ${protocolo.numero} finalizada com sucesso.`,
      });

      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Erro ao encerrar protocolo:', error);
      toast({
        title: 'Erro ao encerrar',
        description: 'Não foi possível encerrar o protocolo. Tente novamente.',
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
              Encerrar Reposição
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
            {/* Foto da Nota Fiscal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Camera className="w-4 h-4" />
                Foto da Nota Fiscal *
              </Label>
              {fotoNotaFiscal ? (
                <div className="relative">
                  <img 
                    src={fotoNotaFiscal} 
                    alt="Nota Fiscal" 
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
                  <span className="text-xs">Tirar foto da Nota Fiscal</span>
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
                placeholder="Adicione uma observação sobre o encerramento..."
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
                  Encerrando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Encerramento
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
        title={cameraTarget === 'nota' ? 'Foto da Nota Fiscal' : 'Foto da Mercadoria'}
      />
    </>
  );
}
