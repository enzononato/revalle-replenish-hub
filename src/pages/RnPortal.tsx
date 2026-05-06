import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRnAuth } from '@/contexts/RnAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, LogOut, Search, Package, FileText, Loader2, Repeat, ArrowLeft, ListChecks } from 'lucide-react';
import { RnReenvioModal } from '@/components/rn/RnReenvioModal';
import { TrocaForm } from '@/components/rn/TrocaForm';

interface ProtocoloRow {
  id: string;
  numero: string;
  motorista_nome: string;
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

type View = 'dashboard' | 'troca' | 'buscar' | 'minhas-trocas';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aberto': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Aberto</Badge>;
    case 'em_andamento': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">Em Atendimento</Badge>;
    case 'encerrado': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">Encerrado</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const parseProdutos = (produtos: any) => {
  if (!produtos) return [];
  if (Array.isArray(produtos)) return produtos;
  try { return JSON.parse(produtos); } catch { return []; }
};

export default function RnPortal() {
  const navigate = useNavigate();
  const { representante, logout, isAuthenticated } = useRnAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Buscar Protocolos state
  const [searchPdv, setSearchPdv] = useState('');
  const [searchedPdv, setSearchedPdv] = useState('');
  const [protocolos, setProtocolos] = useState<ProtocoloRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('abertos');
  const [selectedProtocolo, setSelectedProtocolo] = useState<ProtocoloRow | null>(null);

  // Minhas Trocas state
  const [trocas, setTrocas] = useState<ProtocoloRow[]>([]);
  const [isLoadingTrocas, setIsLoadingTrocas] = useState(false);
  const [trocasTab, setTrocasTab] = useState('aberto');

  useEffect(() => {
    if (!isAuthenticated || !representante) {
      navigate('/rn/login', { replace: true });
    }
  }, [isAuthenticated, representante, navigate]);

  const fetchProtocolos = async (pdvCode?: string) => {
    const code = pdvCode ?? searchPdv.trim();
    if (!representante || !code) {
      setProtocolos([]);
      return;
    }
    setIsLoading(true);
    setSearchedPdv(code);

    let statusFilter: string[];
    if (activeTab === 'abertos') statusFilter = ['aberto'];
    else if (activeTab === 'em_atendimento') statusFilter = ['em_andamento'];
    else statusFilter = ['encerrado'];

    const { data, error } = await supabase
      .from('protocolos')
      .select('id, numero, motorista_nome, codigo_pdv, data, hora, status, tipo_reposicao, causa, produtos, nota_fiscal, mapa')
      .eq('motorista_unidade', representante.unidade)
      .in('status', statusFilter)
      .eq('codigo_pdv', code)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) setProtocolos(data as ProtocoloRow[]);
    setIsLoading(false);
  };

  const fetchMinhasTrocas = useCallback(async () => {
    if (!representante) return;
    setIsLoadingTrocas(true);
    const { data, error } = await supabase
      .from('protocolos')
      .select('id, numero, motorista_nome, codigo_pdv, data, hora, status, tipo_reposicao, causa, produtos, nota_fiscal, mapa')
      .eq('tipo_reposicao', 'troca')
      .eq('motorista_id', representante.id)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setTrocas(data as ProtocoloRow[]);
    setIsLoadingTrocas(false);
  }, [representante]);

  useEffect(() => {
    if (currentView === 'minhas-trocas') fetchMinhasTrocas();
  }, [currentView, fetchMinhasTrocas]);

  const handleSearch = () => fetchProtocolos();

  useEffect(() => {
    if (currentView === 'buscar' && searchedPdv) fetchProtocolos(searchedPdv);
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/rn/login', { replace: true });
  };

  if (!isAuthenticated || !representante) return null;

  const filteredTrocas = trocas.filter(t => t.status === trocasTab);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-foreground">{representante.nome}</p>
              <p className="text-xs text-primary-foreground/70">{representante.unidade} • RN</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut size={18} className="mr-1" /> Sair
          </Button>
        </div>
      </div>

      <div className="flex-1 px-3 pt-2 pb-4 max-w-xl mx-auto w-full">
        {/* Welcome */}
        {currentView === 'dashboard' && (
          <div className="pt-3 pb-1">
            <p className="text-xs text-muted-foreground">
              👋 Olá, <span className="font-medium text-foreground">{representante.nome}</span>! Selecione uma opção abaixo.
            </p>
          </div>
        )}

        {/* Dashboard cards */}
        {currentView === 'dashboard' && (
          <div className="grid grid-cols-2 gap-3 pt-3 pb-4">
            <Card
              className="col-span-2 cursor-pointer border-border/50 hover:border-primary/60 active:scale-[0.98] transition-all duration-150"
              onClick={() => setCurrentView('troca')}
            >
              <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Repeat className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Troca</span>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-border/50 hover:border-primary/60 active:scale-[0.98] transition-all duration-150"
              onClick={() => setCurrentView('buscar')}
            >
              <CardContent className="flex flex-col items-center justify-center gap-2 py-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground text-center">Buscar Protocolos</span>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-border/50 hover:border-primary/60 active:scale-[0.98] transition-all duration-150"
              onClick={() => setCurrentView('minhas-trocas')}
            >
              <CardContent className="flex flex-col items-center justify-center gap-2 py-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Minhas Trocas</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Back button */}
        {currentView !== 'dashboard' && (
          <div className="pt-2 pb-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        )}

        {/* Troca */}
        {currentView === 'troca' && (
          <TrocaForm representante={representante} />
        )}

        {/* Buscar Protocolos */}
        {currentView === 'buscar' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Buscar por código do PDV..."
                  value={searchPdv}
                  onChange={(e) => setSearchPdv(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} size="default">Buscar</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="abertos">Abertos</TabsTrigger>
                <TabsTrigger value="em_atendimento">Em Atendimento</TabsTrigger>
                <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
              </TabsList>

              {['abertos', 'em_atendimento', 'encerrados'].map(tab => (
                <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : !searchedPdv ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Digite o código do PDV acima para buscar protocolos</p>
                    </div>
                  ) : protocolos.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum protocolo encontrado para o PDV "{searchedPdv}"</p>
                      <p className="text-xs mt-1 opacity-70">Unidade: {representante.unidade}</p>
                    </div>
                  ) : (
                    protocolos.map(p => {
                      const prods = parseProdutos(p.produtos);
                      return (
                        <Card key={p.id} className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => setSelectedProtocolo(p)}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-foreground">#{p.numero}</span>
                              {getStatusBadge(p.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>Motorista: <span className="text-foreground">{p.motorista_nome}</span></span>
                              <span>PDV: <span className="text-foreground">{p.codigo_pdv || '—'}</span></span>
                              <span>Data: <span className="text-foreground">{p.data}</span></span>
                              <span>Hora: <span className="text-foreground">{p.hora}</span></span>
                              {p.tipo_reposicao && <span>Tipo: <span className="text-foreground capitalize">{p.tipo_reposicao}</span></span>}
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
                                  {prods.length > 5 && <p className="text-xs text-muted-foreground">+{prods.length - 5} mais...</p>}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {/* Minhas Trocas */}
        {currentView === 'minhas-trocas' && (
          <div className="space-y-3">
            <Tabs value={trocasTab} onValueChange={setTrocasTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="aberto">Abertas</TabsTrigger>
                <TabsTrigger value="em_andamento">Em Atendimento</TabsTrigger>
                <TabsTrigger value="encerrado">Encerradas</TabsTrigger>
              </TabsList>

              <TabsContent value={trocasTab} className="mt-4 space-y-3">
                {isLoadingTrocas ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : filteredTrocas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Repeat className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma troca encontrada</p>
                  </div>
                ) : (
                  filteredTrocas.map(p => {
                    const prods = parseProdutos(p.produtos);
                    return (
                      <Card key={p.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-foreground">#{p.numero}</span>
                            {getStatusBadge(p.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>PDV: <span className="text-foreground">{p.codigo_pdv || '—'}</span></span>
                            <span>Data: <span className="text-foreground">{p.data}</span></span>
                            <span>Hora: <span className="text-foreground">{p.hora}</span></span>
                            {p.causa && <span>Causa: <span className="text-foreground">{p.causa}</span></span>}
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
                                {prods.length > 5 && <p className="text-xs text-muted-foreground">+{prods.length - 5} mais...</p>}
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
        )}
      </div>

      <RnReenvioModal
        protocolo={selectedProtocolo}
        open={!!selectedProtocolo}
        onClose={() => setSelectedProtocolo(null)}
        representante={representante}
      />
    </div>
  );
}
