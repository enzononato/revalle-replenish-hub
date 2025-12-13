import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Send, Search, User, Upload, X, CheckCircle, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { Protocolo, Produto, Motorista, FotosProtocolo } from '@/types';
import { mockMotoristas } from '@/data/mockData';
import { useProtocolos } from '@/contexts/ProtocolosContext';

interface ProdutoForm {
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: 'UND' | 'CX' | 'PCT';
}

const formatWhatsApp = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 3) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 3)} ${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

const formatWhatsAppFromRaw = (raw: string) => {
  const numbers = raw.replace(/\D/g, '');
  if (numbers.length >= 12) {
    const ddd = numbers.slice(2, 4);
    const first = numbers.slice(4, 5);
    const mid = numbers.slice(5, 9);
    const end = numbers.slice(9, 13);
    return `(${ddd}) ${first} ${mid}-${end}`;
  }
  return raw;
};

export default function AbrirProtocolo() {
  const { addProtocolo } = useProtocolos();
  const [mapa, setMapa] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipoReposicao, setTipoReposicao] = useState<string>('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([{ codigo: '', nome: '', quantidade: 1, unidade: 'UND' }]);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [observacao, setObservacao] = useState('');
  const [protocoloCriado, setProtocoloCriado] = useState<string | null>(null);
  
  // Driver selection state
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [motoristaSearch, setMotoristaSearch] = useState('');
  const [showMotoristaDropdown, setShowMotoristaDropdown] = useState(false);

  // Photo states
  const [fotoMotoristaPdv, setFotoMotoristaPdv] = useState<string | null>(null);
  const [fotoLoteProduto, setFotoLoteProduto] = useState<string | null>(null);
  const [fotoAvaria, setFotoAvaria] = useState<string | null>(null);
  
  const fotoMotoristaPdvRef = useRef<HTMLInputElement>(null);
  const fotoLoteProdutoRef = useRef<HTMLInputElement>(null);
  const fotoAvariaRef = useRef<HTMLInputElement>(null);

  const filteredMotoristas = useMemo(() => {
    if (!motoristaSearch.trim()) return mockMotoristas;
    const searchLower = motoristaSearch.toLowerCase();
    return mockMotoristas.filter(m => 
      m.nome.toLowerCase().includes(searchLower) || 
      m.codigo.includes(motoristaSearch)
    );
  }, [motoristaSearch]);

  const handleSelectMotorista = (motorista: Motorista) => {
    setSelectedMotorista(motorista);
    setMotoristaSearch('');
    setShowMotoristaDropdown(false);
    setWhatsapp(formatWhatsAppFromRaw(motorista.whatsapp));
    setEmail(motorista.email || '');
  };

  const handleClearMotorista = () => {
    setSelectedMotorista(null);
    setWhatsapp('');
    setEmail('');
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setWhatsapp(formatted);
  };

  const handleFotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addProduto = () => {
    setProdutos([...produtos, { codigo: '', nome: '', quantidade: 1, unidade: 'UND' }]);
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const updateProduto = (index: number, field: keyof ProdutoForm, value: string | number) => {
    const updated = [...produtos];
    updated[index] = { ...updated[index], [field]: value };
    setProdutos(updated);
  };

  const resetForm = () => {
    setMapa('');
    setCodigoPdv('');
    setNotaFiscal('');
    setTipoReposicao('');
    setProdutos([{ codigo: '', nome: '', quantidade: 1, unidade: 'UND' }]);
    setEmail('');
    setWhatsapp('');
    setObservacao('');
    setSelectedMotorista(null);
    setMotoristaSearch('');
    setFotoMotoristaPdv(null);
    setFotoLoteProduto(null);
    setFotoAvaria(null);
  };

  const handleSubmit = () => {
    if (!selectedMotorista) {
      toast.error('Selecione um motorista');
      return;
    }
    if (!mapa.trim()) {
      toast.error('MAPA é obrigatório');
      return;
    }
    if (!codigoPdv.trim()) {
      toast.error('Código PDV é obrigatório');
      return;
    }
    if (!notaFiscal.trim()) {
      toast.error('Nota Fiscal é obrigatória');
      return;
    }
    if (!tipoReposicao) {
      toast.error('Tipo de Reposição é obrigatório');
      return;
    }
    if (produtos.some(p => !p.nome.trim() || p.quantidade < 1)) {
      toast.error('Preencha todos os produtos corretamente');
      return;
    }
    const whatsappNumbers = whatsapp.replace(/\D/g, '');
    if (whatsappNumbers.length < 10) {
      toast.error('WhatsApp é obrigatório');
      return;
    }

    // Validação de fotos
    if (!fotoMotoristaPdv) {
      toast.error('Foto do Motorista/PDV é obrigatória');
      return;
    }
    if (!fotoLoteProduto) {
      toast.error('Foto do Lote do Produto é obrigatória');
      return;
    }
    if (tipoReposicao === 'avaria' && !fotoAvaria) {
      toast.error('Foto da Avaria é obrigatória');
      return;
    }

    const now = new Date();
    const protocoloNumero = `PROTOC-${format(now, 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const fotosProtocolo: FotosProtocolo = {
      fotoMotoristaPdv: fotoMotoristaPdv || undefined,
      fotoLoteProduto: fotoLoteProduto || undefined,
      fotoAvaria: tipoReposicao === 'avaria' ? fotoAvaria || undefined : undefined,
    };

    const novoProtocolo: Protocolo = {
      id: Date.now().toString(),
      numero: protocoloNumero,
      motorista: selectedMotorista,
      data: format(now, 'dd/MM/yyyy'),
      hora: format(now, 'HH:mm'),
      sla: '0 dias',
      status: 'aberto',
      validacao: false,
      lancado: false,
      enviadoLancar: false,
      enviadoEncerrar: false,
      tipoReposicao: tipoReposicao,
      mapa: mapa,
      codigoPdv: codigoPdv,
      notaFiscal: notaFiscal,
      observacaoGeral: observacao || undefined,
      produtos: produtos.map(p => ({
        codigo: p.codigo || p.nome,
        nome: p.nome,
        unidade: p.unidade,
        quantidade: p.quantidade,
        validade: '',
      })),
      fotosProtocolo,
      createdAt: now.toISOString(),
      observacoesLog: [],
    };

    addProtocolo(novoProtocolo);
    setProtocoloCriado(protocoloNumero);
    toast.success('Protocolo criado com sucesso!');
  };

  const handleNovoProtocolo = () => {
    resetForm();
    setProtocoloCriado(null);
  };

  // Tela de sucesso
  if (protocoloCriado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Protocolo Enviado!</h1>
          <p className="text-muted-foreground mb-4">Seu protocolo foi registrado com sucesso.</p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">Número do Protocolo:</p>
            <p className="text-xl font-bold text-primary">{protocoloCriado}</p>
          </div>
          <Button onClick={handleNovoProtocolo} className="w-full">
            <Plus className="mr-2" size={18} />
            Abrir Novo Protocolo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full mb-4">
            <span className="text-lg">🚚</span>
            <span className="font-bold">REVALLE</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Abertura de Protocolo de Reposição</h1>
          <p className="text-muted-foreground mt-1">Preencha os dados abaixo para registrar seu protocolo</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
          {/* Seleção de Motorista */}
          <div className="space-y-2">
            <Label>
              Motorista <span className="text-destructive">*</span>
            </Label>
            {selectedMotorista ? (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedMotorista.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Código: {selectedMotorista.codigo} • {selectedMotorista.unidade}
                    </p>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={handleClearMotorista}
                  className="text-destructive hover:text-destructive"
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              <Popover open={showMotoristaDropdown} onOpenChange={setShowMotoristaDropdown}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={motoristaSearch}
                      onChange={(e) => {
                        setMotoristaSearch(e.target.value);
                        setShowMotoristaDropdown(true);
                      }}
                      onFocus={() => setShowMotoristaDropdown(true)}
                      placeholder="Buscar por nome ou código do motorista..."
                      className="pl-9"
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border shadow-lg" 
                  align="start"
                  sideOffset={4}
                >
                  <div className="max-h-60 overflow-y-auto">
                    {filteredMotoristas.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Nenhum motorista encontrado
                      </div>
                    ) : (
                      filteredMotoristas.map((motorista) => (
                        <button
                          key={motorista.id}
                          type="button"
                          onClick={() => handleSelectMotorista(motorista)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{motorista.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              Cód: {motorista.codigo} • {motorista.unidade}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Linha 1: MAPA, Código PDV, Nota Fiscal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mapa">
                MAPA <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mapa"
                value={mapa}
                onChange={(e) => setMapa(e.target.value)}
                placeholder="Digite o MAPA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigoPdv">
                Código PDV <span className="text-destructive">*</span>
              </Label>
              <Input
                id="codigoPdv"
                value={codigoPdv}
                onChange={(e) => setCodigoPdv(e.target.value)}
                placeholder="Digite o código"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notaFiscal">
                Nota Fiscal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notaFiscal"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                placeholder="Digite a NF"
              />
            </div>
          </div>

          {/* Tipo Reposição */}
          <div className="space-y-2">
            <Label>
              Tipo Reposição <span className="text-destructive">*</span>
            </Label>
            <Select value={tipoReposicao} onValueChange={setTipoReposicao}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="falta">Falta</SelectItem>
                <SelectItem value="inversao">Inversão</SelectItem>
                <SelectItem value="avaria">Avaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload de Fotos - Condicional */}
          {tipoReposicao && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
              <Label className="flex items-center gap-2">
                <Camera size={18} />
                Fotos Obrigatórias
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Foto Motorista/PDV */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Foto Motorista/PDV <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fotoMotoristaPdvRef}
                    onChange={(e) => handleFotoUpload(e, setFotoMotoristaPdv)}
                    className="hidden"
                  />
                  {fotoMotoristaPdv ? (
                    <div className="relative">
                      <img 
                        src={fotoMotoristaPdv} 
                        alt="Foto Motorista/PDV" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setFotoMotoristaPdv(null)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 flex flex-col gap-2"
                      onClick={() => fotoMotoristaPdvRef.current?.click()}
                    >
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Clique para enviar</span>
                    </Button>
                  )}
                </div>

                {/* Foto Lote Produto */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Foto Lote Produto <span className="text-destructive">*</span>
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fotoLoteProdutoRef}
                    onChange={(e) => handleFotoUpload(e, setFotoLoteProduto)}
                    className="hidden"
                  />
                  {fotoLoteProduto ? (
                    <div className="relative">
                      <img 
                        src={fotoLoteProduto} 
                        alt="Foto Lote Produto" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setFotoLoteProduto(null)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-32 flex flex-col gap-2"
                      onClick={() => fotoLoteProdutoRef.current?.click()}
                    >
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Clique para enviar</span>
                    </Button>
                  )}
                </div>

                {/* Foto Avaria - Apenas para tipo "avaria" */}
                {tipoReposicao === 'avaria' && (
                  <div className="space-y-2">
                    <Label className="text-sm">
                      Foto Avaria <span className="text-destructive">*</span>
                    </Label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fotoAvariaRef}
                      onChange={(e) => handleFotoUpload(e, setFotoAvaria)}
                      className="hidden"
                    />
                    {fotoAvaria ? (
                      <div className="relative">
                        <img 
                          src={fotoAvaria} 
                          alt="Foto Avaria" 
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => setFotoAvaria(null)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-32 flex flex-col gap-2"
                        onClick={() => fotoAvariaRef.current?.click()}
                      >
                        <Upload size={24} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Clique para enviar</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de Produtos */}
          <div className="space-y-3">
            <Label>Produtos</Label>
            {produtos.map((produto, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Produto <span className="text-destructive">*</span>
                    </Label>
                  )}
                  <Input
                    value={produto.nome}
                    onChange={(e) => updateProduto(index, 'nome', e.target.value)}
                    placeholder="Código ou nome do produto"
                  />
                </div>
                <div className="col-span-5 md:col-span-3 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Quantidade <span className="text-destructive">*</span>
                    </Label>
                  )}
                  <Input
                    type="number"
                    min="1"
                    value={produto.quantidade}
                    onChange={(e) => updateProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-5 md:col-span-3 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">Unidade</Label>
                  )}
                  <Select
                    value={produto.unidade}
                    onValueChange={(val) => updateProduto(index, 'unidade', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      <SelectItem value="UND">UND</SelectItem>
                      <SelectItem value="CX">CX</SelectItem>
                      <SelectItem value="PCT">PCT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  {produtos.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduto(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {(tipoReposicao === 'falta' || tipoReposicao === 'avaria') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProduto}
                className="mt-2"
              >
                <Plus size={16} className="mr-1" />
                Adicionar Produto
              </Button>
            )}
          </div>

          {/* E-mail e WhatsApp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                WhatsApp <span className="text-destructive">*</span>
              </Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(DDD) 9 0000-0000"
                maxLength={16}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Digite uma observação..."
              rows={3}
            />
          </div>

          {/* Botão Enviar */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleSubmit} className="px-8" size="lg">
              <Send size={18} className="mr-2" />
              Enviar Protocolo
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} Revalle - Sistema de Reposição
        </p>
      </div>
    </div>
  );
}
