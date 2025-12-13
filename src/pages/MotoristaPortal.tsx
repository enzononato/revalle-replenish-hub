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
import { Truck, LogOut, Plus, Trash2, Upload, CheckCircle, Camera, Package, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Protocolo, Produto, FotosProtocolo } from '@/types';
import { format } from 'date-fns';

interface ProdutoForm {
  codigo: string;
  nome: string;
  unidade: string;
  quantidade: number;
  validade: string;
}

export default function MotoristaPortal() {
  const navigate = useNavigate();
  const { motorista, logout, isAuthenticated } = useMotoristaAuth();
  const { addProtocolo } = useProtocolos();

  // Form state
  const [mapa, setMapa] = useState('');
  const [codigoPdv, setCodigoPdv] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [tipoReposicao, setTipoReposicao] = useState('');
  const [produtos, setProdutos] = useState<ProdutoForm[]>([
    { codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: '' }
  ]);
  const [observacao, setObservacao] = useState('');
  const [protocoloCriado, setProtocoloCriado] = useState(false);
  const [numeroProtocolo, setNumeroProtocolo] = useState('');

  // Photo state
  const [fotoMotoristaPdv, setFotoMotoristaPdv] = useState<string | null>(null);
  const [fotoLoteProduto, setFotoLoteProduto] = useState<string | null>(null);
  const [fotoAvaria, setFotoAvaria] = useState<string | null>(null);

  const fotoMotoristaPdvRef = useRef<HTMLInputElement>(null);
  const fotoLoteProdutoRef = useRef<HTMLInputElement>(null);
  const fotoAvariaRef = useRef<HTMLInputElement>(null);

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
    setProdutos([...produtos, { codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: '' }]);
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
    setProdutos([{ codigo: '', nome: '', unidade: 'UND', quantidade: 1, validade: '' }]);
    setObservacao('');
    setFotoMotoristaPdv(null);
    setFotoLoteProduto(null);
    setFotoAvaria(null);
    setProtocoloCriado(false);
    setNumeroProtocolo('');
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
      mapa,
      codigoPdv,
      notaFiscal,
      produtos: validProdutos as Produto[],
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

  if (protocoloCriado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
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
              <Button onClick={resetForm} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Abrir Novo Protocolo
              </Button>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{motorista.nome}</h1>
              <p className="text-sm text-muted-foreground">Código: {motorista.codigo}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Abrir Protocolo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mapa">MAPA *</Label>
                <Input
                  id="mapa"
                  value={mapa}
                  onChange={(e) => setMapa(e.target.value)}
                  placeholder="Ex: 16431"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigoPdv">Código PDV *</Label>
                <Input
                  id="codigoPdv"
                  value={codigoPdv}
                  onChange={(e) => setCodigoPdv(e.target.value)}
                  placeholder="Ex: PDV001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notaFiscal">Nota Fiscal *</Label>
                <Input
                  id="notaFiscal"
                  value={notaFiscal}
                  onChange={(e) => setNotaFiscal(e.target.value)}
                  placeholder="Ex: 243631"
                />
              </div>
            </div>

            {/* Tipo Reposição */}
            <div className="space-y-2">
              <Label>Tipo de Reposição *</Label>
              <Select value={tipoReposicao} onValueChange={setTipoReposicao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="falta">Falta</SelectItem>
                  <SelectItem value="inversao">Inversão</SelectItem>
                  <SelectItem value="avaria">Avaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Photos Section */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos Obrigatórias
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Foto Motorista no PDV */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Motorista no PDV *</p>
                  <input
                    ref={fotoMotoristaPdvRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFotoUpload(e, setFotoMotoristaPdv)}
                  />
                  {fotoMotoristaPdv ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                      <img src={fotoMotoristaPdv} alt="Motorista no PDV" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setFotoMotoristaPdv(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fotoMotoristaPdvRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                    >
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </button>
                  )}
                </div>

                {/* Foto Lote Produto */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Lote do Produto *</p>
                  <input
                    ref={fotoLoteProdutoRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFotoUpload(e, setFotoLoteProduto)}
                  />
                  {fotoLoteProduto ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                      <img src={fotoLoteProduto} alt="Lote do Produto" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setFotoLoteProduto(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fotoLoteProdutoRef.current?.click()}
                      className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                    >
                      <Upload size={24} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Adicionar foto</span>
                    </button>
                  )}
                </div>

                {/* Foto Avaria (conditional) */}
                {tipoReposicao === 'avaria' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Foto da Avaria *</p>
                    <input
                      ref={fotoAvariaRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFotoUpload(e, setFotoAvaria)}
                    />
                    {fotoAvaria ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                        <img src={fotoAvaria} alt="Avaria" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFotoAvaria(null)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fotoAvariaRef.current?.click()}
                        className="w-full aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                      >
                        <Upload size={24} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Adicionar foto</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addProduto}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              
              {produtos.map((produto, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Produto {index + 1}</span>
                    {produtos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduto(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Código *</Label>
                      <Input
                        value={produto.codigo}
                        onChange={(e) => updateProduto(index, 'codigo', e.target.value)}
                        placeholder="Ex: 7325"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={produto.nome}
                        onChange={(e) => updateProduto(index, 'nome', e.target.value)}
                        placeholder="Nome do produto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={produto.quantidade}
                        onChange={(e) => updateProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Validade</Label>
                      <Input
                        value={produto.validade}
                        onChange={(e) => updateProduto(index, 'validade', e.target.value)}
                        placeholder="Ex: 16/03/2026"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Observation */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação (opcional)</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione observações relevantes..."
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button onClick={handleSubmit} className="w-full h-12 text-base">
              Enviar Protocolo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
