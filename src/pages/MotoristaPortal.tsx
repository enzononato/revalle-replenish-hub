import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMotoristaAuth } from '@/contexts/MotoristaAuthContext';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Truck, LogOut, Plus, Trash2, CheckCircle, Camera, Package, X, AlertCircle, Check, CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Protocolo, Produto, FotosProtocolo } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProdutoForm {
  codigo: string;
  nome: string;
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
  produtos: boolean[];
}

// Causas por tipo de reposição
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

  // Form state
  const [mapa, setMapa] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipoReposicao, setTipoReposicao] = useState('');
  const [causa, setCausa] = useState('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([
    { codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: undefined }
  ]);
  const [observacao, setObservacao] = useState('');
  const [protocoloCriado, setProtocoloCriado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');

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
    produtos: [false]
  });

  // Photo state
  const [fotoMotoristaPdv, setFotoMotoristaPdv] = useState<string | null>(null);
  const [fotoLoteProduto, setFotoLoteProduto] = useState<string | null>(null);
  const [fotoAvaria, setFotoAvaria] = useState<string | null>(null);

  const fotoMotoristaPdvRef = useRef<HTMLInputElement>(null);
  const fotoLoteProdutoRef = useRef<HTMLInputElement>(null);
  const fotoAvariaRef = useRef<HTMLInputElement>(null);

  // Validation functions
  const isFieldValid = (field: keyof TouchedFields, value: string | null): boolean => {
    if (field === 'tipoReposicao') return !!value;
    if (field === 'causa') return !tipoReposicao || !!value;
    // Photos are only required after tipoReposicao is selected
    if (field === 'fotoMotoristaPdv' || field === 'fotoLoteProduto') {
      return !tipoReposicao || !!value;
    }
    if (field === 'fotoAvaria') return tipoReposicao !== 'avaria' || !!value;
    return typeof value === 'string' && value.trim().length > 0;
  };

  // Control multiple products based on tipoReposicao
  const podeAdicionarMultiplos = tipoReposicao === 'avaria' || tipoReposicao === 'falta';

  // Clear photos and causa when changing tipoReposicao
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
      // Reset to single product if switching to inversao
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
    return produto.codigo.trim().length > 0 && produto.nome.trim().length > 0;
  };

  const handleProdutoBlur = (index: number) => {
    setTouched(prev => {
      const newProdutos = [...prev.produtos];
      newProdutos[index] = true;
      return { ...prev, produtos: newProdutos };
    });
  };

  // Redirect if not authenticated
  if (!isAuthenticated || !motorista) {
    navigate('/motorista/login', { replace: true });
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/motorista/login', { replace: true });
  };

  const handleFotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFoto: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addProduto = () => {
    setProdutos([...produtos, { codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: undefined }]);
    setTouched(prev => ({ ...prev, produtos: [...prev.produtos, false] }));
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
      setTouched(prev => ({ ...prev, produtos: prev.produtos.filter((_, i) => i !== index) }));
    }
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: string | number | Date | undefined) => {
    const updated = [...produtos];
    updated[index] = { ...updated[index], [field]: value };
    setProdutos(updated);
  };

  const resetForm = () => {
    setMapa('');
    setCodigoPdv('');
    setNotaFiscal('');
    setTipoReposicao('');
    setCausa('');
    setProdutos([{ codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: undefined }]);
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
      produtos: [false]
    });
  };

  const handleSubmit = () => {
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
    if (!fotoMotoristaPdv) {
      toast({ title: 'Erro', description: 'Adicione a foto do motorista no PDV', variant: 'destructive' });
      return;
    }
    if (!fotoLoteProduto) {
      toast({ title: 'Erro', description: 'Adicione a foto do lote do produto', variant: 'destructive' });
      return;
    }
    if (tipoReposicao === 'avaria' && !fotoAvaria) {
      toast({ title: 'Erro', description: 'Adicione a foto da avaria', variant: 'destructive' });
      return;
    }

    const validProdutos = produtos.filter(p => p.codigo.trim() && p.nome.trim());
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

    // Convert produtos to the expected format
    const produtosFormatados = validProdutos.map(p => ({
      codigo: p.codigo,
      nome: p.nome,
      unidade: p.unidade,
      quantidade: p.quantidade,
      validade: p.validade ? format(p.validade, 'dd/MM/yyyy') : ''
    }));

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
      createdAt: now.toISOString()
    };

    addProtocolo(novoProtocolo);
    setNumeroProtocolo(numero);
    setProtocoloCriado(true);
    toast({
      title: 'Protocolo criado!',
      description: `Protocolo ${numero} criado com sucesso`
    });
  };

  // Photo upload card component for mobile with validation
  const PhotoUploadCard = ({
    label,
    photo,
    setPhoto,
    inputRef,
    field,
    required = true
  }: {
    label: string;
    photo: string | null;
    setPhoto: (value: string | null) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    field: 'fotoMotoristaPdv' | 'fotoLoteProduto' | 'fotoAvaria';
    required?: boolean;
  }) => {
    const status = getFieldStatus(field, photo);
    const showValidation = touched[field];
    
    return (
      <div className={cn(
        "bg-muted/30 rounded-xl p-3 border-2 transition-colors",
        status === 'valid' && 'border-green-500',
        status === 'invalid' && 'border-red-500',
        status === 'neutral' && 'border-border'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {label} {required && <span className="text-destructive">*</span>}
            </span>
            {showValidation && photo && (
              <Check size={16} className="text-green-500" />
            )}
          </div>
          {photo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPhoto(null)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
            handleBlur(field);
          }}
        />
        {photo ? (
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border">
            <img src={photo} alt={label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            onClick={() => {
              inputRef.current?.click();
              handleBlur(field);
            }}
            className={cn(
              "w-full aspect-[4/3] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 transition-colors",
              status === 'invalid' 
                ? "border-red-400 bg-red-50 dark:bg-red-900/10" 
                : "border-primary/40 bg-primary/5 hover:bg-primary/10 active:bg-primary/15"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              status === 'invalid' ? "bg-red-100 dark:bg-red-900/20" : "bg-primary/10"
            )}>
              <Camera size={28} className={status === 'invalid' ? "text-red-500" : "text-primary"} />
            </div>
            <span className={cn("text-sm font-medium", status === 'invalid' ? "text-red-500" : "text-primary")}>
              Tirar Foto
            </span>
          </button>
        )}
        {showValidation && !photo && required && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle size={12} />
            Foto obrigatória
          </p>
        )}
      </div>
    );
  };

  if (protocoloCriado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4 safe-area-inset">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Protocolo Criado!</h2>
            <p className="text-muted-foreground mb-4">
              Seu protocolo foi enviado com sucesso
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
      {/* Header - More compact for mobile */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{motorista.nome}</h1>
              <p className="text-xs text-muted-foreground">Cód: {motorista.codigo}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 h-9 px-3">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 py-4 pb-24 max-w-lg mx-auto">
        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              Abrir Protocolo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* General Info - Single column on mobile */}
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Campo obrigatório
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="codigoPdv" className="text-sm font-medium">Código PDV *</Label>
                  {touched.codigoPdv && codigoPdv.trim() && <Check size={14} className="text-green-500" />}
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Campo obrigatório
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="notaFiscal" className="text-sm font-medium">Nota Fiscal *</Label>
                  {touched.notaFiscal && notaFiscal.trim() && <Check size={14} className="text-green-500" />}
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Campo obrigatório
                  </p>
                )}
              </div>
            </div>

            {/* Tipo Reposição e Causa - Grid 2 colunas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Tipo *</Label>
                  {touched.tipoReposicao && tipoReposicao && <Check size={14} className="text-green-500" />}
                </div>
                <Select 
                  value={tipoReposicao} 
                  onValueChange={handleTipoReposicaoChange}
                >
                  <SelectTrigger className={cn(
                    "h-12 text-base",
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Selecione
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Causa *</Label>
                  {touched.causa && causa && <Check size={14} className="text-green-500" />}
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
                    "h-12 text-base",
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
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Selecione
                  </p>
                )}
              </div>
            </div>

            {/* Products Section - Single column for mobile */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-primary" />
                  Produtos
                  {tipoReposicao === 'inversao' && (
                    <span className="text-xs text-muted-foreground font-normal">(apenas 1)</span>
                  )}
                </Label>
                {podeAdicionarMultiplos && (
                  <Button type="button" variant="outline" size="sm" onClick={addProduto} className="h-9">
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>
              
              {produtos.map((produto, index) => {
                const isTouched = touched.produtos[index];
                const isValid = isProdutoValid(produto);
                
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "p-4 bg-muted/30 border-2 rounded-xl space-y-3 transition-colors",
                      isTouched && isValid && 'border-green-500',
                      isTouched && !isValid && 'border-red-500',
                      !isTouched && 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Produto {index + 1}</span>
                        {isTouched && isValid && <Check size={14} className="text-green-500" />}
                      </div>
                      {produtos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProduto(index)}
                          className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Código *</Label>
                        <Input
                          value={produto.codigo}
                          onChange={(e) => updateProduto(index, 'codigo', e.target.value)}
                          onBlur={() => handleProdutoBlur(index)}
                          placeholder="Ex: 7325"
                          className={cn(
                            "h-11 text-base",
                            isTouched && produto.codigo.trim() && 'border-green-500',
                            isTouched && !produto.codigo.trim() && 'border-red-500'
                          )}
                          inputMode="numeric"
                        />
                        {isTouched && !produto.codigo.trim() && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Código obrigatório
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Nome *</Label>
                        <Input
                          value={produto.nome}
                          onChange={(e) => updateProduto(index, 'nome', e.target.value)}
                          onBlur={() => handleProdutoBlur(index)}
                          placeholder="Nome do produto"
                          className={cn(
                            "h-11 text-base",
                            isTouched && produto.nome.trim() && 'border-green-500',
                            isTouched && !produto.nome.trim() && 'border-red-500'
                          )}
                        />
                        {isTouched && !produto.nome.trim() && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Nome obrigatório
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={produto.quantidade}
                            onChange={(e) => updateProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                            className="h-11 text-base"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Unidade</Label>
                          <Select
                            value={produto.unidade}
                            onValueChange={(value) => updateProduto(index, 'unidade', value)}
                          >
                            <SelectTrigger className="h-11 text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UND">UND</SelectItem>
                              <SelectItem value="CX">CX</SelectItem>
                              <SelectItem value="PCT">PCT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Validade</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-11 w-full justify-start text-left font-normal",
                                  !produto.validade && "text-muted-foreground"
                                )}
                              >
                                {produto.validade ? (
                                  format(produto.validade, "dd/MM/yy")
                                ) : (
                                  <CalendarIcon className="h-4 w-4" />
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

            {/* Photos Section - After Products */}
            {tipoReposicao ? (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-4 w-4 text-primary" />
                  Fotos Obrigatórias
                </Label>
                
                <div className="space-y-3">
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
              <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-border text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecione o tipo de reposição para ver as fotos necessárias
                </p>
              </div>
            )}

            {/* Observation */}
            <div className="space-y-2">
              <Label htmlFor="observacao" className="text-sm font-medium">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações relevantes..."
                rows={3}
                className="text-base resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <Button 
            onClick={handleSubmit} 
            className="w-full h-14 text-base font-semibold shadow-lg"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Enviar Protocolo
          </Button>
        </div>
      </div>
    </div>
  );
}
