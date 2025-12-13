import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Send, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Protocolo, Produto, Motorista } from '@/types';
import { mockMotoristas } from '@/data/mockData';

interface CreateProtocoloModalProps {
  open: boolean;
  onClose: () => void;
  onCreateProtocolo: (protocolo: Protocolo) => void;
}

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
    // Format: 5571999999999 -> (71) 9 9999-9999
    const ddd = numbers.slice(2, 4);
    const first = numbers.slice(4, 5);
    const mid = numbers.slice(5, 9);
    const end = numbers.slice(9, 13);
    return `(${ddd}) ${first} ${mid}-${end}`;
  }
  return raw;
};

const CreateProtocoloModal = ({ open, onClose, onCreateProtocolo }: CreateProtocoloModalProps) => {
  const [mapa, setMapa] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipoReposicao, setTipoReposicao] = useState<string>('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([{ codigo: '', nome: '', quantidade: 1, unidade: 'UND' }]);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Driver selection state
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const [motoristaSearch, setMotoristaSearch] = useState('');
  const [showMotoristaDropdown, setShowMotoristaDropdown] = useState(false);

  // Filter drivers based on search
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
    // Auto-fill WhatsApp and email from driver
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
  };

  const handleSubmit = () => {
    // Validação
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

    const now = new Date();
    const protocoloNumero = `PROTOC-${format(now, 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
      createdAt: now.toISOString(),
      observacoesLog: [],
    };

    onCreateProtocolo(novoProtocolo);
    toast.success('Protocolo criado com sucesso!');
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Send size={20} />
            Envio de Notificação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
          <div className="grid grid-cols-3 gap-4">
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
            <p className="text-xs text-muted-foreground">
              Em casos de avaria ou falta de produto, o motorista pode registrar mais de um item dentro do mesmo protocolo.
            </p>
          </div>

          {/* Lista de Produtos */}
          <div className="space-y-3">
            <Label>Produtos</Label>
            {produtos.map((produto, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 space-y-1">
                  {index === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Produto <span className="text-destructive">*</span>
                    </Label>
                  )}
                  <Input
                    value={produto.nome}
                    onChange={(e) => updateProduto(index, 'nome', e.target.value)}
                    placeholder="Digite o código ou nome do produto"
                  />
                </div>
                <div className="col-span-3 space-y-1">
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
                <div className="col-span-3 space-y-1">
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
                <div className="col-span-1">
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

          {/* Linha 3: E-mail, WhatsApp */}
          <div className="grid grid-cols-2 gap-4">
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
            <Button onClick={handleSubmit} className="px-8">
              <Send size={18} className="mr-2" />
              Enviar Notificação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProtocoloModal;
