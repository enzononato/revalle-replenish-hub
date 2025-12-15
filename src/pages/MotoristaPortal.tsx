import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMotoristaAuth } from '@/contexts/MotoristaAuthContext';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useOfflineProtocolos } from '@/hooks/useOfflineProtocolos';
import { compressImage } from '@/utils/imageCompression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Trash2, CheckCircle, Camera, Package, X, AlertCircle, Check, CalendarIcon, LogOut, FileText, PlusCircle, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Protocolo, Produto, FotosProtocolo } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ProdutoAutocomplete } from '@/components/ProdutoAutocomplete';
import { MeusProtocolos } from '@/components/motorista/MeusProtocolos';
import { MotoristaHeader } from '@/components/motorista/MotoristaHeader';

interface ProdutoForm {
  produto: string;
  unidade: string;
  quantidade: number;
  validade: Date | undefined;
}

interface TouchedFields {
  mapa: boolean;
  codigoPdv: boolean;
  notaFiscal: boolean;
  tipoReposicao: boolean;
  causa: boolean;
  fotoMotoristaPdv: boolean;
  fotoLoteProduto: boolean;
  fotoAvaria: boolean;
  whatsappContato: boolean;
  produtos: boolean[];
}

const causasPorTipo: Record<string, string[]> = {
  inversao: ['ERRO DE CARREGAMENTO', 'ERRO DE ENTREGA'],
  falta: ['FALTA DE PALLET FECHADO', 'FALTA DE PALLET MONTADO'],
  avaria: [
    'AVARIADO NA ROTA',
    'CAIU NA BAIA',
    'CARRINHO COM PROBLEMA',
    'GARRAFEIRA QUEBRADA',
    'PALLET QUEBRADO',
    'PREGO NO PALLET',
    'QUEBRA NO PDV',
    'QUEBRADA NA CAIXA',
    'SEM TAMPA',
    'TAMPA AMASSADA',
    'VAZADA'
  ]
};

export default function MotoristaPortal() {
  const navigate = useNavigate();
  const { motorista, logout, isAuthenticated } = useMotoristaAuth();
  const { addProtocolo } = useProtocolos();
  const { isOnline, pendingCount, saveOffline, syncPending } = useOfflineProtocolos();

  const [activeTab, setActiveTab] = useState('novo');

  // Form state
  const [mapa, setMapa] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipoReposicao, setTipoReposicao] = useState('');
  const [causa, setCausa] = useState('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([
    { produto: '', unidade: '', quantidade: 1, validade: undefined }
  ]);
  const [whatsappContato, setWhatsappContato] = useState('');
  const [emailContato, setEmailContato] = useState('');
  const [observacao, setObservacao] = useState('');
  const [protocoloCriado, setProtocoloCriado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Touched state for validation
  const [touched, setTouched] = useState<TouchedFields>({
    mapa: false,
    codigoPdv: false,
    notaFiscal: false,
    tipoReposicao: false,
    causa: false,
    fotoMotoristaPdv: false,
    fotoLoteProduto: false,
    fotoAvaria: false,
    whatsappContato: false,
    produtos: [false]
  });

  // Photo state
  const [fotoMotoristaPdv, setFotoMotoristaPdv] = useState<string | null>(null);
  const [fotoLoteProduto, setFotoLoteProduto] = useState<string | null>(null);
  const [fotoAvaria, setFotoAvaria] = useState<string | null>(null);

  const fotoMotoristaPdvRef = useRef<HTMLInputElement>(null);
  const fotoLoteProdutoRef = useRef<HTMLInputElement>(null);
  const fotoAvariaRef = useRef<HTMLInputElement>(null);

  // Sincronizar protocolos pendentes quando online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending(addProtocolo);
    }
  }, [isOnline, pendingCount, syncPending, addProtocolo]);

  // Validation functions
  const isFieldValid = (field: keyof TouchedFields, value: string | null): boolean => {
    if (field === 'tipoReposicao') return !!value;
    if (field === 'causa') return !tipoReposicao || !!value;
    if (field === 'fotoMotoristaPdv' || field === 'fotoLoteProduto') {
      return !tipoReposicao || !!value;
    }
    if (field === 'fotoAvaria') return tipoReposicao !== 'avaria' || !!value;
    return typeof value === 'string' && value.trim().length > 0;
  };

  const podeAdicionarMultiplos = tipoReposicao === 'avaria' || tipoReposicao === 'falta';

  const handleTipoReposicaoChange = (value: string) => {
    if (value !== tipoReposicao) {
      setFotoMotoristaPdv(null);
      setFotoLoteProduto(null);
      setFotoAvaria(null);
      setCausa('');
      setTouched(prev => ({
        ...prev,
        fotoMotoristaPdv: false,
        fotoLoteProduto: false,
        fotoAvaria: false,
        causa: false
      }));
      if (value === 'inversao' && produtos.length > 1) {
        setProdutos([produtos[0]]);
        setTouched(prev => ({ ...prev, produtos: [prev.produtos[0] || false] }));
      }
    }
    setTipoReposicao(value);
    handleBlur('tipoReposicao');
  };

  const getFieldStatus = (field: keyof TouchedFields, value: string | null): 'valid' | 'invalid' | 'neutral' => {
    const isTouched = touched[field];
    if (!isTouched && typeof isTouched === 'boolean') return 'neutral';
    return isFieldValid(field, value) ? 'valid' : 'invalid';
  };

  const getInputClassName = (field: keyof TouchedFields, value: string | null, baseClass: string = 'h-12 text-base'): string => {
    const status = getFieldStatus(field, value);
    return cn(
      baseClass,
      status === 'valid' && 'border-green-500 focus:ring-green-500 focus:border-green-500',
      status === 'invalid' && 'border-red-500 focus:ring-red-500 focus:border-red-500'
    );
  };

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isProdutoValid = (produto: ProdutoForm): boolean => {
    return produto.produto.trim().length > 0;
  };

  const handleProdutoBlur = (index: number) => {
    setTouched(prev => {
      const newProdutos = [...prev.produtos];
      newProdutos[index] = true;
      return { ...prev, produtos: newProdutos };
    });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !motorista) {
      navigate('/motorista/login', { replace: true });
    }
  }, [isAuthenticated, motorista, navigate]);

  if (!isAuthenticated || !motorista) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/motorista/login', { replace: true });
  };

  // Compressão automática de imagens
  const handleFotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFoto: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB',
        variant: 'destructive'
      });
      return;
    }

    setIsCompressing(true);
    
    try {
      // Comprime a imagem para máximo 1200px e qualidade 70%
      const compressedImage = await compressImage(file, 1200, 0.7);
      setFoto(compressedImage);
      
      // Calcular redução
      const originalSize = file.size;
      const compressedSize = Math.round((compressedImage.length * 3) / 4); // Base64 overhead
      const reduction = Math.round((1 - compressedSize / originalSize) * 100);
      
      if (reduction > 0) {
        toast({
          title: 'Imagem otimizada',
          description: `Tamanho reduzido em ${reduction}%`,
        });
      }
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      // Fallback: carregar sem compressão
      const reader = new FileReader();
      reader.onload = (event) => {
        setFoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const addProduto = () => {
    setProdutos([...produtos, { produto: '', unidade: '', quantidade: 1, validade: undefined }]);
    setTouched(prev => ({ ...prev, produtos: [...prev.produtos, false] }));
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
      setTouched(prev => ({ ...prev, produtos: prev.produtos.filter((_, i) => i !== index) }));
    }
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: string | number | Date | undefined, embalagem?: string) => {
    const updated = [...produtos];
    updated[index] = { ...updated[index], [field]: value };
    // Se uma embalagem foi passada, atualizar também o campo unidade
    if (embalagem) {
      updated[index].unidade = embalagem;
    }
    setProdutos(updated);
  };

  const resetForm = () => {
    setMapa('');
    setCodigoPdv('');
    setNotaFiscal('');
    setTipoReposicao('');
    setCausa('');
    setProdutos([{ produto: '', unidade: '', quantidade: 1, validade: undefined }]);
    setWhatsappContato('');
    setEmailContato('');
    setObservacao('');
    setFotoMotoristaPdv(null);
    setFotoLoteProduto(null);
    setFotoAvaria(null);
    setProtocoloCriado(false);
    setNumeroProtocolo('');
    setTouched({
      mapa: false,
      codigoPdv: false,
      notaFiscal: false,
      tipoReposicao: false,
      causa: false,
      fotoMotoristaPdv: false,
      fotoLoteProduto: false,
      fotoAvaria: false,
      whatsappContato: false,
      produtos: [false]
    });
  };

  const handleSubmit = async () => {
    // Validations
    if (!mapa.trim()) {
      toast({ title: 'Erro', description: 'Preencha o campo MAPA', variant: 'destructive' });
      return;
    }
    if (!codigoPdv.trim()) {
      toast({ title: 'Erro', description: 'Preencha o Código do PDV', variant: 'destructive' });
      return;
    }
    if (!notaFiscal.trim()) {
      toast({ title: 'Erro', description: 'Preencha a Nota Fiscal', variant: 'destructive' });
      return;
    }
    if (!tipoReposicao) {
      toast({ title: 'Erro', description: 'Selecione o tipo de reposição', variant: 'destructive' });
      return;
    }
    if (!causa) {
      toast({ title: 'Erro', description: 'Selecione a causa', variant: 'destructive' });
      return;
    }
    if (!whatsappContato.trim()) {
      toast({ title: 'Erro', description: 'Preencha o WhatsApp para contato', variant: 'destructive' });
      return;
    }

    // Validação de fotos obrigatórias
    if (!fotoMotoristaPdv) {
      toast({ title: 'Erro', description: 'Foto do Motorista/PDV é obrigatória', variant: 'destructive' });
      return;
    }
    if (!fotoLoteProduto) {
      toast({ title: 'Erro', description: 'Foto do Lote do Produto é obrigatória', variant: 'destructive' });
      return;
    }
    if (tipoReposicao === 'avaria' && !fotoAvaria) {
      toast({ title: 'Erro', description: 'Foto da Avaria é obrigatória', variant: 'destructive' });
      return;
    }

    const validProdutos = produtos.filter(p => p.produto.trim());
    if (validProdutos.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um produto', variant: 'destructive' });
      return;
    }

    const now = new Date();
    const numero = `PROTOC-${format(now, 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6)}`;

    const fotosProtocolo: FotosProtocolo = {
      fotoMotoristaPdv: fotoMotoristaPdv || undefined,
      fotoLoteProduto: fotoLoteProduto || undefined,
      fotoAvaria: fotoAvaria || undefined
    };

    const produtosFormatados = validProdutos.map(p => {
      const parts = p.produto.split(' - ');
      const codigo = parts[0] || '';
      const nome = parts.slice(1).join(' - ') || p.produto;
      return {
        codigo,
        nome,
        unidade: p.unidade || 'UND',
        quantidade: p.quantidade,
        validade: p.validade ? format(p.validade, 'dd/MM/yyyy') : ''
      };
    });

    const novoProtocolo: Protocolo = {
      id: crypto.randomUUID(),
      numero,
      motorista: motorista,
      data: format(now, 'dd/MM/yyyy'),
      hora: format(now, 'HH:mm:ss'),
      sla: '4h',
      status: 'aberto',
      validacao: false,
      lancado: false,
      enviadoLancar: false,
      enviadoEncerrar: false,
      tipoReposicao: tipoReposicao.toUpperCase(),
      causa,
      mapa,
      codigoPdv,
      notaFiscal,
      produtos: produtosFormatados as Produto[],
      fotosProtocolo,
      observacaoGeral: observacao || undefined,
      contatoWhatsapp: whatsappContato || undefined,
      contatoEmail: emailContato || undefined,
      createdAt: now.toISOString()
    };

    // Se offline, salvar localmente
    if (!isOnline) {
      saveOffline(novoProtocolo);
      setNumeroProtocolo(numero);
      setProtocoloCriado(true);
      return;
    }

    try {
      await addProtocolo(novoProtocolo);
      setNumeroProtocolo(numero);
      setProtocoloCriado(true);
      toast({
        title: 'Protocolo criado!',
        description: `Protocolo ${numero} criado com sucesso`
      });
    } catch (error) {
      console.error('Erro ao criar protocolo:', error);
      // Salvar offline se falhar
      saveOffline(novoProtocolo);
      setNumeroProtocolo(numero);
      setProtocoloCriado(true);
    }
  };

  // Photo upload card component
  const PhotoUploadCard = ({
    label,
    photo,
    setPhoto,
    inputRef,
    field,
  }: {
    label: string;
    photo: string | null;
    setPhoto: (value: string | null) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    field: 'fotoMotoristaPdv' | 'fotoLoteProduto' | 'fotoAvaria';
  }) => {
    const hasPhoto = !!photo;
    
    return (
      <div className={cn(
        "bg-muted/30 rounded-lg p-3 border-2 transition-colors",
        hasPhoto ? 'border-green-500' : 'border-border'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {label}
            </span>
            {hasPhoto && (
              <Check size={14} className="text-green-500" />
            )}
          </div>
          {photo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhoto(null)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X size={16} />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFotoUpload(e, setPhoto);
          }}
        />
        {photo ? (
          <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-border">
            <img src={photo} alt={label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            onClick={() => {
              inputRef.current?.click();
            }}
            disabled={isCompressing}
            className="w-full aspect-[4/3] border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-3 transition-colors border-primary/40 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
              <Camera size={24} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">
              {isCompressing ? 'Processando...' : 'Tirar Foto'}
            </span>
          </button>
        )}
      </div>
    );
  };

  if (protocoloCriado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 safe-area-inset">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isOnline ? 'Protocolo Criado!' : 'Salvo Localmente!'}
            </h2>
            <p className="text-base text-muted-foreground mb-4">
              {isOnline 
                ? 'Seu protocolo foi enviado com sucesso' 
                : 'O protocolo será enviado quando você tiver conexão'}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">Número do protocolo</p>
              <p className="text-lg font-mono font-bold text-primary">{numeroProtocolo}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={resetForm} className="w-full h-12 text-base">
                <Plus className="mr-2 h-5 w-5" />
                Abrir Novo Protocolo
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  resetForm();
                  setActiveTab('meus');
                }} 
                className="w-full h-12 text-base"
              >
                <FileText className="mr-2 h-5 w-5" />
                Meus Protocolos
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full h-12 text-base">
                <LogOut className="mr-2 h-5 w-5" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 safe-area-inset">
      {/* Header com nome, código e unidade */}
      <MotoristaHeader 
        motorista={motorista}
        isOnline={isOnline}
        pendingCount={pendingCount}
        onLogout={handleLogout}
      />

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/60 p-1 rounded-lg">
            <TabsTrigger 
              value="novo" 
              className="text-sm gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Novo Protocolo
            </TabsTrigger>
            <TabsTrigger 
              value="meus" 
              className="text-sm gap-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <FileText className="w-4 h-4" />
              Meus Protocolos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Novo Protocolo */}
          <TabsContent value="novo" className="mt-4 pb-24 space-y-4">
            {/* Seção: Dados Gerais */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border/30">
                <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Dados Gerais
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {/* General Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="mapa" className="text-sm font-medium">MAPA *</Label>
                      {touched.mapa && mapa.trim() && <Check size={14} className="text-green-500" />}
                    </div>
                    <Input
                      id="mapa"
                      value={mapa}
                      onChange={(e) => setMapa(e.target.value)}
                      onBlur={() => handleBlur('mapa')}
                      placeholder="Ex: 16431"
                      className={getInputClassName('mapa', mapa)}
                      inputMode="numeric"
                    />
                    {touched.mapa && !mapa.trim() && (
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        Campo obrigatório
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="codigoPdv" className="text-xs font-medium">Código PDV *</Label>
                      {touched.codigoPdv && codigoPdv.trim() && <Check size={12} className="text-green-500" />}
                    </div>
                    <Input
                      id="codigoPdv"
                      value={codigoPdv}
                      onChange={(e) => setCodigoPdv(e.target.value)}
                      onBlur={() => handleBlur('codigoPdv')}
                      placeholder="Ex: PDV001"
                      className={getInputClassName('codigoPdv', codigoPdv)}
                    />
                    {touched.codigoPdv && !codigoPdv.trim() && (
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        Campo obrigatório
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="notaFiscal" className="text-xs font-medium">Nota Fiscal *</Label>
                      {touched.notaFiscal && notaFiscal.trim() && <Check size={12} className="text-green-500" />}
                    </div>
                    <Input
                      id="notaFiscal"
                      value={notaFiscal}
                      onChange={(e) => setNotaFiscal(e.target.value)}
                      onBlur={() => handleBlur('notaFiscal')}
                      placeholder="Ex: 243631"
                      className={getInputClassName('notaFiscal', notaFiscal)}
                      inputMode="numeric"
                    />
                    {touched.notaFiscal && !notaFiscal.trim() && (
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        Campo obrigatório
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Tipo e Causa */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/30">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-primary" />
                  Tipo e Causa
                </h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-medium">Tipo *</Label>
                      {touched.tipoReposicao && tipoReposicao && <Check size={12} className="text-green-500" />}
                    </div>
                    <Select 
                      value={tipoReposicao} 
                      onValueChange={handleTipoReposicaoChange}
                    >
                      <SelectTrigger className={cn(
                        "h-10 text-sm",
                        touched.tipoReposicao && tipoReposicao && 'border-green-500 focus:ring-green-500',
                        touched.tipoReposicao && !tipoReposicao && 'border-red-500 focus:ring-red-500'
                      )}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="falta">Falta</SelectItem>
                        <SelectItem value="inversao">Inversão</SelectItem>
                        <SelectItem value="avaria">Avaria</SelectItem>
                      </SelectContent>
                    </Select>
                    {touched.tipoReposicao && !tipoReposicao && (
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        Selecione
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs font-medium">Causa *</Label>
                      {touched.causa && causa && <Check size={12} className="text-green-500" />}
                    </div>
                    <Select 
                      value={causa} 
                      onValueChange={(value) => {
                        setCausa(value);
                        handleBlur('causa');
                      }}
                      disabled={!tipoReposicao}
                    >
                      <SelectTrigger className={cn(
                        "h-10 text-sm",
                        touched.causa && causa && 'border-green-500 focus:ring-green-500',
                        touched.causa && !causa && tipoReposicao && 'border-red-500 focus:ring-red-500'
                      )}>
                        <SelectValue placeholder={tipoReposicao ? "Selecione" : "Escolha o tipo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tipoReposicao && causasPorTipo[tipoReposicao]?.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.causa && !causa && tipoReposicao && (
                      <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertCircle size={10} />
                        Selecione
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Produtos */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  Produtos
                  {tipoReposicao === 'inversao' && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-0.5">(apenas 1)</span>
                  )}
                </h3>
                {podeAdicionarMultiplos && (
                  <Button type="button" variant="ghost" size="sm" onClick={addProduto} className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10">
                    <Plus className="mr-0.5 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                )}
              </div>
              <div className="p-3 space-y-2">
                  
                  {produtos.map((produto, index) => {
                    const isTouched = touched.produtos[index];
                    const isValid = isProdutoValid(produto);
                    
                    return (
                      <div 
                        key={index} 
                        className={cn(
                          "p-3 bg-muted/30 border-2 rounded-lg space-y-2 transition-colors",
                          isTouched && isValid && 'border-green-500',
                          isTouched && !isValid && 'border-red-500',
                          !isTouched && 'border-border'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-foreground">Produto {index + 1}</span>
                            {isTouched && isValid && <Check size={12} className="text-green-500" />}
                          </div>
                          {produtos.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProduto(index)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">Produto *</Label>
                            <ProdutoAutocomplete
                              value={produto.produto}
                              onChange={(value, embalagem) => {
                                updateProduto(index, 'produto', value, embalagem);
                              }}
                              onBlur={() => handleProdutoBlur(index)}
                              className={cn(
                                isTouched && produto.produto.trim() && 'border-green-500',
                                isTouched && !produto.produto.trim() && 'border-red-500'
                              )}
                            />
                            {isTouched && !produto.produto.trim() && (
                              <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                                <AlertCircle size={10} />
                                Produto obrigatório
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-[1fr_60px_1fr] gap-1.5">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-medium text-muted-foreground">Qtd</Label>
                              <Input
                                type="number"
                                min="1"
                                value={produto.quantidade}
                                onChange={(e) => updateProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                                className="h-9 text-sm"
                                inputMode="numeric"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-medium text-muted-foreground">Und</Label>
                              <Select
                                value={produto.unidade}
                                onValueChange={(value) => updateProduto(index, 'unidade', value)}
                              >
                                <SelectTrigger className="h-9 text-xs px-1.5">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UND">UND</SelectItem>
                                  <SelectItem value="CX">CX</SelectItem>
                                  <SelectItem value="PCT">PCT</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-medium text-muted-foreground">Validade</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "h-9 w-full justify-start text-left font-normal text-xs",
                                      !produto.validade && "text-muted-foreground"
                                    )}
                                  >
                                    {produto.validade ? (
                                      format(produto.validade, "dd/MM/yy")
                                    ) : (
                                      <CalendarIcon className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={produto.validade}
                                    onSelect={(date) => updateProduto(index, 'validade', date)}
                                    locale={ptBR}
                                    className="pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Seção: Fotos */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/30">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Fotos
                  <span className="text-[10px] text-destructive font-normal">*</span>
                </h3>
              </div>
              <div className="p-3">
                {tipoReposicao ? (
                  <div className="space-y-2">
                    
                    <div className="space-y-2">
                      <PhotoUploadCard
                        label="Motorista no PDV"
                        photo={fotoMotoristaPdv}
                        setPhoto={setFotoMotoristaPdv}
                        inputRef={fotoMotoristaPdvRef}
                        field="fotoMotoristaPdv"
                      />
                      <PhotoUploadCard
                        label="Lote do Produto"
                        photo={fotoLoteProduto}
                        setPhoto={setFotoLoteProduto}
                        inputRef={fotoLoteProdutoRef}
                        field="fotoLoteProduto"
                      />
                      {tipoReposicao === 'avaria' && (
                        <PhotoUploadCard
                          label="Foto da Avaria"
                          photo={fotoAvaria}
                          setPhoto={setFotoAvaria}
                          inputRef={fotoAvariaRef}
                          field="fotoAvaria"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="w-10 h-10 mx-auto bg-muted/50 rounded-full flex items-center justify-center mb-2">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione o tipo de reposição para ver as fotos
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Seção: Contato */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/30">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  Contato
                </h3>
              </div>
              <div className="p-3 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="whatsappContato" className="text-[10px] font-medium text-muted-foreground">
                        WhatsApp *
                      </Label>
                      <Input
                        id="whatsappContato"
                        value={whatsappContato}
                        onChange={(e) => setWhatsappContato(e.target.value)}
                        onBlur={() => handleBlur('whatsappContato')}
                        placeholder="(00) 00000-0000"
                        className={cn(
                          "h-9 text-sm",
                          touched.whatsappContato && whatsappContato.trim() && 'border-green-500',
                          touched.whatsappContato && !whatsappContato.trim() && 'border-red-500'
                        )}
                        inputMode="tel"
                      />
                      {touched.whatsappContato && !whatsappContato.trim() && (
                        <p className="text-[10px] text-red-500 flex items-center gap-0.5">
                          <AlertCircle size={10} />
                          WhatsApp obrigatório
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="emailContato" className="text-[10px] font-medium text-muted-foreground">
                        E-mail (opcional)
                      </Label>
                      <Input
                        id="emailContato"
                        type="email"
                        value={emailContato}
                        onChange={(e) => setEmailContato(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-9 text-sm"
                        inputMode="email"
                      />
                    </div>
              </div>
            </div>

            {/* Seção: Observação */}
            <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2 border-b border-border/30">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Observação
                  <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                </h3>
              </div>
              <div className="p-3">
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione observações relevantes..."
                  rows={2}
                  className="text-sm resize-none border-border/50"
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Meus Protocolos */}
          <TabsContent value="meus" className="mt-3 pb-6">
            <MeusProtocolos motorista={motorista} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Submit Button - Only show on new protocol tab */}
      {activeTab === 'novo' && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background via-background/95 to-background/0 safe-area-bottom">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handleSubmit} 
              className="w-full h-11 text-sm font-semibold shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary rounded-lg"
              disabled={isCompressing}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              {isCompressing ? 'Processando imagem...' : 'Enviar Protocolo'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
