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
import { ProdutoAutocomplete } from '@/components/ProdutoAutocomplete';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { compressImage } from '@/utils/imageCompression';
import { uploadFotoParaStorage } from '@/utils/uploadFotoStorage';
import CameraCapture from '@/components/CameraCapture';
import { formatPhone, isValidPhone } from '@/lib/phone';
import type { Representante } from '@/contexts/RnAuthContext';
import {
  Loader2,
  CheckCircle,
  Camera,
  X,
  Plus,
  Minus,
  Trash2,
  Tag,
  MapPin,
  Phone,
  Mail,
  FileText,
  Package,
  Copy,
  Check,
  MessageCircle,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';

interface TrocaFormProps {
  representante: Representante;
}

interface ProdutoForm {
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: 'UN' | 'CX' | 'PCT';
}

const CAUSAS_TROCA = [
  '01 - Vencido',
  '02 - Embalagem Avariada',
  '03 - Sabor Alterado',
  '04 - Impureza',
  '05 - Mal Cheio',
  '06 - Sem data de Validade',
  '08 - Fora do Prazo Comercial',
  '09 - Produto Impróprio',
];

const N8N_WEBHOOK = 'https://n8n.revalle.com.br/webhook/reposicaowpp';

export function TrocaForm({ representante }: TrocaFormProps) {
  const [codigoPdv, setCodigoPdv] = useState('');
  const [pdvSelecionado, setPdvSelecionado] = useState(false);
  const [causa, setCausa] = useState('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([
    { codigo: '', nome: '', quantidade: 1, unidade: 'UN' },
  ]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');
  const [mensagemCopiada, setMensagemCopiada] = useState(false);
  const [dadosCriado, setDadosCriado] = useState<{
    codigoPdv: string;
    causa: string;
    whatsapp: string;
    email: string;
    observacao: string;
    fotosCount: number;
    data: string;
    hora: string;
    produtos: ProdutoForm[];
  } | null>(null);

  const whatsappValido = isValidPhone(whatsapp);
  const produtosValidos = produtos.filter(p => p.nome.trim() && p.quantidade >= 1);

  const canSubmit =
    pdvSelecionado &&
    codigoPdv.trim() &&
    causa.trim() &&
    produtosValidos.length > 0 &&
    fotos.length > 0 &&
    whatsappValido;

  const handlePdvChange = (value: string, pdv?: { codigo: string }) => {
    setCodigoPdv(value);
    setPdvSelecionado(!!pdv);
  };

  const addProduto = () =>
    setProdutos(prev => [...prev, { codigo: '', nome: '', quantidade: 1, unidade: 'UN' }]);

  const removeProduto = (index: number) => {
    if (produtos.length > 1) setProdutos(prev => prev.filter((_, i) => i !== index));
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: string | number) => {
    setProdutos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProdutoSelect = (index: number, displayValue: string, embalagem?: string) => {
    // displayValue formato: "COD - NOME"
    const [codPart, ...restNome] = displayValue.split(' - ');
    const codigo = (codPart || '').trim();
    const nome = restNome.join(' - ').trim();
    const unidadeNorm = (embalagem || '').toUpperCase();
    const unidade: 'UN' | 'CX' | 'PCT' =
      unidadeNorm === 'CX' ? 'CX' : unidadeNorm === 'PCT' ? 'PCT' : 'UN';
    setProdutos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], codigo, nome, unidade };
      return updated;
    });
  };

  const handleCameraCapture = useCallback(async (imageDataUrl: string) => {
    setIsCompressing(true);
    try {
      const compressed = await compressImage(imageDataUrl);
      setFotos(prev => [...prev, compressed]);
      toast.success(`Foto ${fotos.length + 1} salva`);
    } catch (err) {
      console.error('Erro ao comprimir:', err);
      setFotos(prev => [...prev, imageDataUrl]);
    } finally {
      setIsCompressing(false);
    }
  }, [fotos.length]);

  const removeFoto = (index: number) =>
    setFotos(prev => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setCodigoPdv('');
    setPdvSelecionado(false);
    setCausa('');
    setProdutos([{ codigo: '', nome: '', quantidade: 1, unidade: 'UN' }]);
    setFotos([]);
    setWhatsapp('');
    setEmailContato('');
    setObservacao('');
    setEnviado(false);
    setNumeroProtocolo('');
    setMensagemCopiada(false);
    setDadosCriado(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const agora = new Date();
      const numero = `TROCA-${format(agora, 'yyyyMMddHHmmss')}${Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0')}`;

      const fotosUrls: string[] = [];
      for (let i = 0; i < fotos.length; i++) {
        const url = await uploadFotoParaStorage(fotos[i], numero, `troca_${i + 1}`);
        if (url) fotosUrls.push(url);
      }

      const produtosPayload = produtosValidos.map(p => ({
        codigo: p.codigo || p.nome,
        nome: p.nome,
        unidade: p.unidade,
        quantidade: p.quantidade,
        validade: '',
      }));

      const cpfRn = (representante.cpf || '').replace(/\D/g, '');

      const { error } = await supabase.from('protocolos').insert({
        numero,
        data: format(agora, 'dd/MM/yyyy'),
        hora: format(agora, 'HH:mm'),
        status: 'aberto',
        tipo_reposicao: 'troca',
        causa,
        codigo_pdv: codigoPdv.trim(),
        motorista_id: representante.id,
        motorista_nome: representante.nome,
        motorista_codigo: `RN-${cpfRn}`,
        motorista_whatsapp: whatsapp,
        motorista_email: emailContato || null,
        motorista_unidade: representante.unidade,
        contato_whatsapp: whatsapp,
        contato_email: emailContato || null,
        observacao_geral: observacao.trim() || null,
        produtos: produtosPayload,
        fotos_protocolo: { fotosTroca: fotosUrls },
        observacoes_log: [
          {
            id: crypto.randomUUID(),
            usuarioNome: `RN: ${representante.nome}`,
            usuarioId: representante.id,
            data: format(agora, 'dd/MM/yyyy'),
            hora: format(agora, 'HH:mm'),
            acao: 'Abriu protocolo de Trocas',
            texto: `Troca aberta por RN ${representante.nome} | Causa: ${causa} | ${produtosValidos.length} produto(s) | ${fotosUrls.length} foto(s)`,
          },
        ],
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        acao: 'criacao_troca',
        tabela: 'protocolos',
        registro_id: numero,
        registro_dados: {
          numero,
          tipo: 'Troca',
          causa,
          codigo_pdv: codigoPdv.trim(),
          produtos: produtosValidos.length,
          fotos_count: fotosUrls.length,
        },
        usuario_nome: representante.nome,
        usuario_role: 'RN',
        usuario_unidade: representante.unidade,
      });

      // Webhook n8n - mesma estrutura do webhook de reposição
      const webhookPayload = {
        tipo: 'criacao_protocolo',
        numero,
        data: format(agora, 'dd/MM/yyyy'),
        hora: format(agora, 'HH:mm'),
        mapa: '',
        codigoPdv: codigoPdv.trim(),
        notaFiscal: '',
        motoristaNome: representante.nome,
        unidade: representante.unidade,
        tipoReposicao: 'TROCA',
        causa,
        produtos: produtosPayload,
        whatsappContato: whatsapp,
        observacaoGeral: observacao.trim() || '',
      };

      fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
        .then(res => {
          if (res.ok) console.log('Webhook troca enviado');
          else console.error('Erro webhook troca:', res.status);
        })
        .catch(err => console.error('Erro webhook troca:', err));

      setNumeroProtocolo(numero);
      setDadosCriado({
        codigoPdv: codigoPdv.trim(),
        causa,
        whatsapp,
        email: emailContato,
        observacao: observacao.trim(),
        fotosCount: fotosUrls.length,
        data: format(agora, 'dd/MM/yyyy'),
        hora: format(agora, 'HH:mm'),
        produtos: produtosValidos,
      });

      setEnviado(true);
      toast.success(`Troca registrada! Protocolo ${numero}`);
    } catch (err) {
      console.error('Erro ao registrar troca:', err);
      toast.error('Erro ao registrar troca. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMensagem = () => {
    if (!dadosCriado) return '';
    const d = dadosCriado;
    const lines = [
      `*PROTOCOLO DE TROCA*`,
      ``,
      `*Protocolo:* ${numeroProtocolo}`,
      `*Data:* ${d.data} as ${d.hora}`,
      ``,
      `*Causa:* ${d.causa}`,
      `*Cod. PDV:* ${d.codigoPdv}`,
      ``,
      ...(d.produtos.length > 0
        ? [
            `*Produtos:*`,
            ...d.produtos.map(p => `  - ${p.nome} (${p.quantidade} ${p.unidade})`),
            ``,
          ]
        : []),
      `*RN:* ${representante.nome}`,
      `*Unidade:* ${representante.unidade || ''}`,
      `*Contato:* ${d.whatsapp}`,
      ...(d.email ? [`*E-mail:* ${d.email}`] : []),
      ``,
      `*Fotos:* ${d.fotosCount} foto(s)`,
      ...(d.observacao ? [`*Obs:* ${d.observacao}`] : []),
      ``,
      `_- Reposicao Revalle_`,
    ];
    return lines.join('\n');
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(buildMensagem()).then(() => {
      setMensagemCopiada(true);
      setTimeout(() => setMensagemCopiada(false), 2500);
    });
  };

  const buildWhatsAppLink = () => {
    const wpp = whatsapp.replace(/\D/g, '');
    const telefone = wpp.startsWith('55') ? wpp : `55${wpp}`;
    return `https://wa.me/${telefone}?text=${encodeURIComponent(buildMensagem())}`;
  };

  // Tela de sucesso
  if (enviado) {
    return (
      <div className="space-y-4 pb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Troca Registrada!</h3>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Número do protocolo</p>
            <p className="text-lg font-mono font-bold text-primary">{numeroProtocolo}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleCopiar} variant="outline" className="gap-2">
              {mensagemCopiada ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {mensagemCopiada ? 'Mensagem copiada!' : 'Copiar mensagem'}
            </Button>
            <a href={buildWhatsAppLink()} target="_blank" rel="noopener noreferrer">
              <Button variant="default" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
              </Button>
            </a>
            <Button onClick={resetForm} variant="ghost">
              Nova troca
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* PDV */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Código do PDV *
        </Label>
        <PdvAutocomplete
          value={codigoPdv}
          onChange={handlePdvChange}
          unidade={representante.unidade}
          placeholder="Digite código ou nome do PDV..."
        />
        {codigoPdv && !pdvSelecionado && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Selecione um PDV da lista
          </p>
        )}
      </div>

      {/* Causa */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Motivo da Troca *
        </Label>
        <Select value={causa} onValueChange={setCausa}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o motivo..." />
          </SelectTrigger>
          <SelectContent>
            {CAUSAS_TROCA.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Produtos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Produtos *
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addProduto} className="h-7 gap-1 text-xs">
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {produtos.map((p, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Produto {i + 1}</span>
                {produtos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduto(i)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <ProdutoAutocomplete
                value={p.nome ? `${p.codigo} - ${p.nome}` : ''}
                onChange={(value, embalagem) => handleProdutoSelect(i, value, embalagem)}
                placeholder="Buscar produto..."
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => updateProduto(i, 'quantidade', Math.max(1, p.quantidade - 1))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={p.quantidade}
                    onChange={e => updateProduto(i, 'quantidade', Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 text-center"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => updateProduto(i, 'quantidade', p.quantidade + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <Select value={p.unidade} onValueChange={v => updateProduto(i, 'unidade', v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN</SelectItem>
                    <SelectItem value="CX">CX</SelectItem>
                    <SelectItem value="PCT">PCT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fotos */}
      <div className="space-y-2">
        <Label className="text-xs flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" /> Fotos * <span className="text-muted-foreground">({fotos.length})</span>
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((foto, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
              <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFoto(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={isCompressing}
            className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground"
          >
            {isCompressing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px]">Adicionar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" /> WhatsApp do contato *
        </Label>
        <Input
          value={whatsapp}
          onChange={e => setWhatsapp(formatPhone(e.target.value))}
          placeholder="(XX) XXXXX-XXXX"
          maxLength={16}
        />
        {whatsapp && !whatsappValido && (
          <p className="text-[11px] text-destructive">Telefone inválido (10 ou 11 dígitos)</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> E-mail (opcional)
        </Label>
        <Input
          type="email"
          value={emailContato}
          onChange={e => setEmailContato(e.target.value)}
          placeholder="contato@exemplo.com"
        />
      </div>

      {/* Observação */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Observação (opcional)
        </Label>
        <Textarea
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Detalhes adicionais..."
          rows={3}
        />
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full h-11">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
          </>
        ) : (
          'Registrar Troca'
        )}
      </Button>

      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
