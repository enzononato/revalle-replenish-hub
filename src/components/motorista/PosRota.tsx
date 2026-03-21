import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PdvAutocomplete } from '@/components/PdvAutocomplete';
import { toast } from '@/hooks/use-toast';
import { Motorista } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, MapPin, FileText, Tag, AlertTriangle, Camera, X, ImageIcon, MessageCircle, Copy, Check, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { compressImage } from '@/utils/imageCompression';
import { uploadFotoParaStorage } from '@/utils/uploadFotoStorage';
import CameraCapture from '@/components/CameraCapture';

interface PosRotaProps {
  motorista: Motorista;
}

const TIPOS_POS_ROTA = [
  { value: 'inversao', label: 'Inversão' },
  { value: 'avaria', label: 'Avaria' },
  { value: 'erro_carregamento', label: 'Erro de Carregamento' },
  { value: 'erro_entrega', label: 'Erro de Entrega' },
];

export function PosRota({ motorista }: PosRotaProps) {
  const [mapa, setMapa] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipo, setTipo] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [pdvSelecionado, setPdvSelecionado] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');
  const [mensagemCopiada, setMensagemCopiada] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const [dadosProtocoloCriado, setDadosProtocoloCriado] = useState<{
    tipo: string; mapa: string; codigoPdv: string; notaFiscal: string; observacao: string; fotosCount: number; data: string; hora: string;
  } | null>(null);
  
  // Fotos
  const [fotos, setFotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const precisaPdv = tipo === 'erro_entrega' || tipo === 'avaria' || tipo === 'inversao';
  const precisaNF = tipo === 'avaria' || tipo === 'inversao';

  const canSubmit = mapa.trim() && tipo && (!precisaPdv || (codigoPdv.trim() && pdvSelecionado)) && fotos.length > 0;

  const handlePdvChange = (value: string, pdv?: { codigo: string }) => {
    setCodigoPdv(value);
    setPdvSelecionado(!!pdv);
  };

  const handleTipoChange = (value: string) => {
    setTipo(value);
    if (value !== 'erro_entrega' && value !== 'avaria' && value !== 'inversao') {
      setCodigoPdv('');
      setPdvSelecionado(false);
    }
    if (value !== 'avaria' && value !== 'inversao') {
      setNotaFiscal('');
    }
  };

  const handleCameraCapture = useCallback(async (imageDataUrl: string) => {
    setIsCompressing(true);
    try {
      const compressed = await compressImage(imageDataUrl);
      setFotos(prev => [...prev, compressed]);
      toast({ title: 'Foto capturada', description: `Foto ${fotos.length + 1} salva.` });
    } catch (err) {
      console.error('Erro ao comprimir:', err);
      setFotos(prev => [...prev, imageDataUrl]);
    } finally {
      setIsCompressing(false);
    }
  }, [fotos.length]);

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setMapa('');
    setNotaFiscal('');
    setTipo('');
    setCodigoPdv('');
    setPdvSelecionado(false);
    setObservacao('');
    setEnviado(false);
    setNumeroProtocolo('');
    setFotos([]);
    setMensagemCopiada(false);
    setMostrarDetalhes(false);
    setDadosProtocoloCriado(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const agora = new Date();
      const numero = `POSROTA-${format(agora, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
      const tipoLabel = TIPOS_POS_ROTA.find(t => t.value === tipo)?.label || tipo;

      // Upload das fotos
      const fotosUrls: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        const url = await uploadFotoParaStorage(fotos[i], numero, `sobra_${i + 1}`);
        if (url) fotosUrls.push(url);
      }

      const { error } = await supabase.from('protocolos').insert({
        numero,
        data: format(agora, 'yyyy-MM-dd'),
        hora: format(agora, 'HH:mm'),
        status: 'aberto',
        tipo_reposicao: 'pos_rota',
        causa: `SOBRA EM ROTA - ${tipoLabel.toUpperCase()}`,
        mapa: mapa.trim(),
        nota_fiscal: notaFiscal.trim() || null,
        codigo_pdv: precisaPdv ? codigoPdv.trim() : null,
        motorista_id: motorista.id,
        motorista_nome: motorista.nome,
        motorista_codigo: motorista.codigo,
        motorista_whatsapp: motorista.whatsapp || null,
        motorista_email: motorista.email || null,
        motorista_unidade: motorista.unidade,
        observacao_geral: observacao.trim() || null,
        fotos_protocolo: { fotosSobra: fotosUrls },
        observacoes_log: JSON.stringify([{
          id: crypto.randomUUID(),
          usuarioNome: motorista.nome,
          usuarioId: motorista.id,
          data: format(agora, 'dd/MM/yyyy'),
          hora: format(agora, 'HH:mm'),
          acao: 'Registrou pós-rota',
          texto: `Sobra em rota - ${tipoLabel}${precisaPdv ? ` | PDV: ${codigoPdv.trim()}` : ''}${notaFiscal.trim() ? ` | NF: ${notaFiscal.trim()}` : ''} | ${fotosUrls.length} foto(s)`
        }]),
      });

      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        acao: 'pos_rota',
        tabela: 'protocolos',
        registro_id: numero,
        registro_dados: {
          numero,
          tipo: tipoLabel,
          mapa: mapa.trim(),
          codigo_pdv: precisaPdv ? codigoPdv.trim() : null,
          nota_fiscal: notaFiscal.trim() || null,
          fotos_count: fotosUrls.length,
        },
        usuario_nome: motorista.nome,
        usuario_role: 'motorista',
        usuario_unidade: motorista.unidade,
      });

      setNumeroProtocolo(numero);
      setDadosProtocoloCriado({
        tipo: tipoLabel,
        mapa: mapa.trim(),
        codigoPdv: precisaPdv ? codigoPdv.trim() : '',
        notaFiscal: notaFiscal.trim(),
        observacao: observacao.trim(),
        fotosCount: fotosUrls.length,
        data: format(agora, 'dd/MM/yyyy'),
        hora: format(agora, 'HH:mm'),
      });
      setEnviado(true);

      toast({
        title: 'Pós-Rota registrado!',
        description: `Registro ${numero} criado com ${fotosUrls.length} foto(s).`,
      });

      // Notificar controle por e-mail (fire-and-forget)
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        fetch(`https://${projectId}.supabase.co/functions/v1/notificar-sobra`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero,
            motorista_nome: motorista.nome,
            motorista_unidade: motorista.unidade,
            mapa: mapa.trim(),
            tipo: tipoLabel,
            codigo_pdv: precisaPdv ? codigoPdv.trim() : undefined,
            nota_fiscal: notaFiscal.trim() || undefined,
            observacao: observacao.trim() || undefined,
            fotos_count: fotosUrls.length,
            data: format(agora, 'dd/MM/yyyy'),
            hora: format(agora, 'HH:mm'),
          }),
        }).catch(err => console.error('Erro ao notificar controle:', err));
      } catch (notifyErr) {
        console.error('Erro ao disparar notificação:', notifyErr);
      }
    } catch (err) {
      console.error('Erro ao registrar pós-rota:', err);
      toast({
        title: 'Erro ao registrar',
        description: 'Não foi possível registrar o pós-rota. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMensagemPosRota = () => {
    if (!dadosProtocoloCriado) return '';
    const d = dadosProtocoloCriado;
    const lines = [
      `*POS-ROTA REGISTRADO*`,
      ``,
      `*Protocolo:* ${numeroProtocolo}`,
      ``,
      `*Tipo:* ${d.tipo}`,
      `*Causa:* SOBRA EM ROTA - ${d.tipo.toUpperCase()}`,
      ``,
      `*Data:* ${d.data} as ${d.hora}`,
      `*Mapa:* ${d.mapa}`,
      ...(d.codigoPdv ? [`*Cod. PDV:* ${d.codigoPdv}`] : []),
      ...(d.notaFiscal ? [`*NF:* ${d.notaFiscal}`] : []),
      ``,
      `*Motorista:* ${motorista.nome}`,
      `*Unidade:* ${motorista.unidade || ''}`,
      ``,
      `*Fotos:* ${d.fotosCount} foto(s)`,
      ...(d.observacao ? [`*Obs:* ${d.observacao}`] : []),
      ``,
      `_- Reposicao Revalle_`
    ];
    return lines.join('\n');
  };

  const handleCopiarMensagemPosRota = () => {
    navigator.clipboard.writeText(buildMensagemPosRota()).then(() => {
      setMensagemCopiada(true);
      setTimeout(() => setMensagemCopiada(false), 2500);
    });
  };

  const buildWhatsAppLinkPosRota = () => {
    const wpp = motorista.whatsapp?.replace(/\D/g, '') || '';
    const telefone = wpp.startsWith('55') ? wpp : `55${wpp}`;
    return `https://wa.me/${telefone}?text=${encodeURIComponent(buildMensagemPosRota())}`;
  };

  // Tela de sucesso
  if (enviado) {
    return (
      <div className="pb-6 space-y-4">
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Pós-Rota Registrado!</h3>
          
          {/* Número do protocolo */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Número do registro</p>
            <p className="text-lg font-mono font-bold text-primary">{numeroProtocolo}</p>
          </div>

          {/* Detalhes expansíveis */}
          {dadosProtocoloCriado && (
            <div className="text-left">
              <button
                onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
                className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <span>Ver detalhes do registro</span>
                {mostrarDetalhes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {mostrarDetalhes && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{dadosProtocoloCriado.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mapa</span>
                    <span className="font-medium">{dadosProtocoloCriado.mapa}</span>
                  </div>
                  {dadosProtocoloCriado.codigoPdv && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PDV</span>
                      <span className="font-medium">{dadosProtocoloCriado.codigoPdv}</span>
                    </div>
                  )}
                  {dadosProtocoloCriado.notaFiscal && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nota Fiscal</span>
                      <span className="font-medium">{dadosProtocoloCriado.notaFiscal}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data/Hora</span>
                    <span className="font-medium">{dadosProtocoloCriado.data} às {dadosProtocoloCriado.hora}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fotos</span>
                    <span className="font-medium">{dadosProtocoloCriado.fotosCount} foto(s)</span>
                  </div>
                  {dadosProtocoloCriado.observacao && (
                    <div className="pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Obs:</span>
                      <p className="font-medium mt-0.5">{dadosProtocoloCriado.observacao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2.5 pt-2">
            {motorista.whatsapp && (
              <a
                href={buildWhatsAppLinkPosRota()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block"
              >
                <Button className="w-full h-11 text-sm bg-green-500 hover:bg-green-600 text-white rounded-xl">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Compartilhar no WhatsApp
                </Button>
              </a>
            )}
            <Button
              variant="outline"
              onClick={handleCopiarMensagemPosRota}
              className="w-full h-11 text-sm rounded-xl"
            >
              {mensagemCopiada ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Mensagem copiada!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar mensagem
                </>
              )}
            </Button>
            <Button onClick={resetForm} className="w-full h-11 text-sm font-semibold rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Novo Registro
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Foto da Sobra"
      />

      <div className="pb-6 space-y-4">
        {/* Mapa */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Dados da Rota
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Mapa *</Label>
              <Input
                placeholder="Número do mapa"
                value={mapa}
                onChange={(e) => setMapa(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nota Fiscal</Label>
              <Input
                placeholder="Número da nota fiscal (opcional)"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>
        </div>

        {/* Tipo e Causa */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Tipo e Causa — Sobra em Rota
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tipo *</Label>
              <Select value={tipo} onValueChange={handleTipoChange}>
                <SelectTrigger className="h-12 text-base truncate text-left gap-2">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_POS_ROTA.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-sm">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PDV condicional */}
            {precisaPdv && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Código do PDV *</Label>
                <PdvAutocomplete
                  value={codigoPdv}
                  onChange={handlePdvChange}
                  unidade={motorista.unidade}
                  placeholder="Buscar PDV..."
                  className="h-12 text-base"
                />
                {codigoPdv && !pdvSelecionado && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Selecione um PDV da lista
                  </p>
                )}
              </div>
            )}

            {/* NF condicional para avaria e inversão */}
            {precisaNF && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Nota Fiscal do PDV</Label>
                <Input
                  placeholder="NF relacionada ao PDV"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            )}
          </div>
        </div>

        {/* Fotos das sobras */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Fotos das Sobras *
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Tire pelo menos 1 foto. Pode adicionar várias.
            </p>
          </div>
          <div className="p-4 space-y-3">
            {/* Grid de fotos */}
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-border group">
                    <img src={foto} alt={`Sobra ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                      Foto {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de adicionar foto */}
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              disabled={isCompressing}
              className={cn(
                "w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-colors",
                "border-primary/40 bg-primary/5 hover:bg-primary/10 active:bg-primary/15",
                "disabled:opacity-50",
                fotos.length === 0 ? "py-10" : "py-5"
              )}
            >
              <div className={cn(
                "rounded-full flex items-center justify-center bg-primary/10",
                fotos.length === 0 ? "w-14 h-14" : "w-10 h-10"
              )}>
                <Camera className={cn("text-primary", fotos.length === 0 ? "w-7 h-7" : "w-5 h-5")} />
              </div>
              <span className="text-sm font-medium text-primary">
                {isCompressing ? 'Processando...' : fotos.length === 0 ? 'Tirar Foto da Sobra' : 'Adicionar Mais Fotos'}
              </span>
              {fotos.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {fotos.length} foto{fotos.length !== 1 ? 's' : ''} adicionada{fotos.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Observação */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="px-4 py-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Observação
            </h3>
          </div>
          <div className="p-4">
            <Textarea
              placeholder="Informações adicionais sobre a sobra em rota..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>

        {/* Botão enviar */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="w-full h-12 text-sm font-semibold rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando {fotos.length} foto{fotos.length !== 1 ? 's' : ''}...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Registrar Pós-Rota
            </>
          )}
        </Button>
      </div>
    </>
  );
}
