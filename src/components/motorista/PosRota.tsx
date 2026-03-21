import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, CheckCircle, MapPin, FileText, Tag, AlertTriangle, Camera, X, ImageIcon, MessageCircle, Copy, Check, Plus, ChevronDown, ChevronUp, Clock, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

type AbaAtiva = 'form' | 'pendentes' | 'em_tratamento' | 'resolvido';

interface SobraResumo {
  id: string;
  numero: string;
  mapa: string | null;
  causa: string | null;
  status: string;
  created_at: string | null;
  codigo_pdv: string | null;
  observacao_geral: string | null;
}

export function PosRota({ motorista }: PosRotaProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('form');
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

  // Sobras do motorista
  const [sobras, setSobras] = useState<SobraResumo[]>([]);
  const [loadingSobras, setLoadingSobras] = useState(false);
  const [contadores, setContadores] = useState({ pendentes: 0, tratamento: 0, resolvido: 0 });

  const precisaPdv = tipo === 'erro_entrega' || tipo === 'avaria' || tipo === 'inversao';
  const precisaNF = tipo === 'avaria' || tipo === 'inversao';
  const canSubmit = mapa.trim() && tipo && (!precisaPdv || (codigoPdv.trim() && pdvSelecionado)) && fotos.length > 0;

  // Fetch sobras do motorista
  const fetchSobras = useCallback(async (statusFilter: string) => {
    setLoadingSobras(true);
    try {
      const { data, error } = await supabase
        .from('protocolos')
        .select('id, numero, mapa, causa, status, created_at, codigo_pdv, observacao_geral')
        .eq('tipo_reposicao', 'pos_rota')
        .eq('motorista_codigo', motorista.codigo)
        .eq('status', statusFilter)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSobras((data || []) as SobraResumo[]);
    } catch (err) {
      console.error('Erro ao buscar sobras:', err);
    } finally {
      setLoadingSobras(false);
    }
  }, [motorista.codigo]);

  const fetchContadores = useCallback(async () => {
    try {
      const [pRes, tRes, rRes] = await Promise.all([
        supabase.from('protocolos').select('id', { count: 'exact', head: true })
          .eq('tipo_reposicao', 'pos_rota').eq('motorista_codigo', motorista.codigo).eq('status', 'aberto').eq('ativo', true),
        supabase.from('protocolos').select('id', { count: 'exact', head: true })
          .eq('tipo_reposicao', 'pos_rota').eq('motorista_codigo', motorista.codigo).eq('status', 'em_andamento').eq('ativo', true),
        supabase.from('protocolos').select('id', { count: 'exact', head: true })
          .eq('tipo_reposicao', 'pos_rota').eq('motorista_codigo', motorista.codigo).eq('status', 'encerrado').eq('ativo', true),
      ]);
      setContadores({
        pendentes: pRes.count || 0,
        tratamento: tRes.count || 0,
        resolvido: rRes.count || 0,
      });
    } catch (err) {
      console.error('Erro contadores:', err);
    }
  }, [motorista.codigo]);

  useEffect(() => {
    fetchContadores();
  }, [fetchContadores]);

  useEffect(() => {
    if (abaAtiva === 'pendentes') fetchSobras('aberto');
    else if (abaAtiva === 'em_tratamento') fetchSobras('em_andamento');
    else if (abaAtiva === 'resolvido') fetchSobras('encerrado');
  }, [abaAtiva, fetchSobras]);

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
      fetchContadores();

      toast({
        title: 'Pós-Rota registrado!',
        description: `Registro ${numero} criado com ${fotosUrls.length} foto(s).`,
      });

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

  const getTipoLabel = (causa: string | null) => {
    if (!causa) return '-';
    const upper = causa.toUpperCase();
    if (upper.includes('INVERSÃO') || upper.includes('INVERSAO')) return 'Inversão';
    if (upper.includes('AVARIA')) return 'Avaria';
    if (upper.includes('ERRO DE CARREGAMENTO')) return 'Erro Carreg.';
    if (upper.includes('ERRO DE ENTREGA')) return 'Erro Entrega';
    return causa;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberto':
        return <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10">Pendente</Badge>;
      case 'em_andamento':
        return <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-500/10">Em Tratamento</Badge>;
      case 'encerrado':
        return <Badge variant="outline" className="text-[10px] border-green-500 text-green-600 bg-green-50 dark:bg-green-500/10">Resolvido</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const handleVerPendentes = () => {
    resetForm();
    setAbaAtiva('pendentes');
  };

  // Tabs navigation
  const tabs: { key: AbaAtiva; label: string; count?: number }[] = [
    { key: 'form', label: 'Novo' },
    { key: 'pendentes', label: 'Pendentes', count: contadores.pendentes },
    { key: 'em_tratamento', label: 'Em Tratamento', count: contadores.tratamento },
    { key: 'resolvido', label: 'Resolvido', count: contadores.resolvido },
  ];

  // Tela de sucesso
  if (enviado) {
    return (
      <div className="pb-6 space-y-4">
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Pós-Rota Registrado!</h3>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Número do registro</p>
            <p className="text-lg font-mono font-bold text-primary">{numeroProtocolo}</p>
          </div>

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
            <Button onClick={handleVerPendentes} variant="outline" className="w-full h-11 text-sm rounded-xl">
              <Clock className="mr-2 h-4 w-4" />
              Ver Pendentes ({contadores.pendentes})
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
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-border/50 bg-muted/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAbaAtiva(tab.key)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold text-center transition-all relative",
                abaAtiva === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1",
                  abaAtiva === tab.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas de listagem */}
        {abaAtiva !== 'form' && (
          <div className="space-y-3">
            {loadingSobras ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sobras.length === 0 ? (
              <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
                <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {abaAtiva === 'pendentes' && 'Nenhuma sobra pendente'}
                  {abaAtiva === 'em_tratamento' && 'Nenhuma sobra em tratamento'}
                  {abaAtiva === 'resolvido' && 'Nenhuma sobra resolvida'}
                </p>
              </div>
            ) : (
              sobras.map((sobra) => (
                <div key={sobra.id} className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary">{sobra.numero}</span>
                    {getStatusBadge(sobra.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Mapa: </span>
                      <span className="font-medium">{sobra.mapa || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo: </span>
                      <span className="font-medium">{getTipoLabel(sobra.causa)}</span>
                    </div>
                    {sobra.codigo_pdv && (
                      <div>
                        <span className="text-muted-foreground">PDV: </span>
                        <span className="font-mono font-medium">{sobra.codigo_pdv}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Data: </span>
                      <span className="font-medium">
                        {sobra.created_at ? format(parseISO(sobra.created_at), 'dd/MM/yy HH:mm') : '-'}
                      </span>
                    </div>
                  </div>
                  {sobra.observacao_geral && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2 mt-1">
                      {sobra.observacao_geral}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Formulário de novo registro */}
        {abaAtiva === 'form' && (
          <>
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

            {/* Fotos */}
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
          </>
        )}
      </div>
    </>
  );
}
