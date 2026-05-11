import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LogOut, Search, Package, FileText, Loader2 } from 'lucide-react';
import { RnReenvioModal } from '@/components/rn/RnReenvioModal';

interface ProtocoloRow {
  id: string;
  numero: string;
  motorista_nome: string;
  motorista_unidade: string | null;
  codigo_pdv: string | null;
  data: string;
  hora: string;
  status: string;
  tipo_reposicao: string | null;
  causa: string | null;
  produtos: any;
  nota_fiscal: string | null;
  mapa: string | null;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aberto': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Aberto</Badge>;
    case 'em_andamento': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">Em Atendimento</Badge>;
    case 'encerrado': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Encerrado</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const getTipoLabel = (tipo: string | null) => {
  if (!tipo) return 'Reposição';
  switch (tipo) {
    case 'pos_rota': return 'Sobra';
    case 'troca': return 'Troca';
    default: return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }
};

const parseProdutos = (produtos: any) => {
  if (!produtos) return [];
  if (Array.isArray(produtos)) return produtos;
  try { return JSON.parse(produtos); } catch { return []; }
};

export default function CmePortal() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [searchPdv, setSearchPdv] = useState('');
  const [searchedPdv, setSearchedPdv] = useState('');
  const [protocolos, setProtocolos] = useState<ProtocoloRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('todos');
  const [selected, setSelected] = useState<ProtocoloRow | null>(null);

  const fetchProtocolos = async (pdvCode?: string) => {
    const code = (pdvCode ?? searchPdv).trim();
    if (!code) {
      setProtocolos([]);
      return;
    }
    setIsLoading(true);
    setSearchedPdv(code);

    const { data, error } = await supabase
      .from('protocolos')
      .select('id, numero, motorista_nome, motorista_unidade, codigo_pdv, data, hora, status, tipo_reposicao, causa, produtos, nota_fiscal, mapa, oculto, ativo')
      .eq('codigo_pdv', code)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      const filtered = (data as any[]).filter(p => !p.oculto) as ProtocoloRow[];
      setProtocolos(filtered);
    } else {
      setProtocolos([]);
    }
    setIsLoading(false);
  };

  const handleSearch = () => fetchProtocolos();

  useEffect(() => {
    // Re-render filtered list when tab changes (filtering is client-side)
  }, [activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.nivel !== 'cme' && user.nivel !== 'admin') return <Navigate to="/dashboard" replace />;

  const filteredProtocolos = activeTab === 'todos'
    ? protocolos
    : protocolos.filter(p => {
        if (activeTab === 'abertos') return p.status === 'aberto';
        if (activeTab === 'em_atendimento') return p.status === 'em_andamento';
        if (activeTab === 'encerrados') return p.status === 'encerrado';
        return true;
      });

  // Adapter para reaproveitar RnReenvioModal — passamos os dados do CME no shape de Representante
  const cmeAsRepresentante = {
    id: user.id,
    nome: `CME: ${user.nome}`,
    cpf: '',
    unidade: selected?.motorista_unidade || user.unidade || '',
    created_at: '',
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-foreground">{user.nome}</p>
              <p className="text-xs text-primary-foreground/70">CME • Consulta de Protocolos</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut size={18} className="mr-1" /> Sair
          </Button>
        </div>
      </div>

      <div className="flex-1 px-3 pt-4 pb-6 max-w-3xl mx-auto w-full">
        <div className="pb-3">
          <h2 className="text-lg font-bold text-foreground">Buscar Protocolos por PDV</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Digite o código do PDV para listar todos os protocolos (reposições, sobras e trocas) de qualquer unidade.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Código do PDV..."
                value={searchPdv}
                onChange={(e) => setSearchPdv(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} size="default">Buscar</Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="abertos">Abertos</TabsTrigger>
              <TabsTrigger value="em_atendimento">Em Atend.</TabsTrigger>
              <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !searchedPdv ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Digite o código do PDV acima para buscar protocolos</p>
                </div>
              ) : filteredProtocolos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum protocolo encontrado para o PDV "{searchedPdv}"</p>
                </div>
              ) : (
                filteredProtocolos.map(p => {
                  const prods = parseProdutos(p.produtos);
                  return (
                    <Card
                      key={p.id}
                      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                      onClick={() => setSelected(p)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-foreground">#{p.numero}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{getTipoLabel(p.tipo_reposicao)}</Badge>
                            {getStatusBadge(p.status)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Motorista: <span className="text-foreground">{p.motorista_nome}</span></span>
                          <span>Unidade: <span className="text-foreground">{p.motorista_unidade || '—'}</span></span>
                          <span>PDV: <span className="text-foreground">{p.codigo_pdv || '—'}</span></span>
                          <span>Data: <span className="text-foreground">{p.data} {p.hora}</span></span>
                          {p.causa && <span>Causa: <span className="text-foreground">{p.causa}</span></span>}
                          {p.nota_fiscal && <span>NF: <span className="text-foreground">{p.nota_fiscal}</span></span>}
                          {p.mapa && <span>Mapa: <span className="text-foreground">{p.mapa}</span></span>}
                        </div>
                        {prods.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center gap-1 mb-1">
                              <Package size={12} className="text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Produtos ({prods.length})</span>
                            </div>
                            <div className="space-y-0.5">
                              {prods.slice(0, 5).map((prod: any, i: number) => (
                                <p key={i} className="text-xs text-foreground">
                                  {prod.nome || prod.produto} — {prod.quantidade} {prod.unidade}
                                </p>
                              ))}
                              {prods.length > 5 && (
                                <p className="text-xs text-muted-foreground">+{prods.length - 5} mais...</p>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <RnReenvioModal
        protocolo={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        representante={cmeAsRepresentante}
      />
    </div>
  );
}
