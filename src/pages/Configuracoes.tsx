import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Key, Clock, Building, Download, Save, Package, Users, FileText, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ImportarProdutosCSV } from '@/components/ImportarProdutosCSV';
import { useProdutosDB } from '@/hooks/useProdutosDB';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Configuracoes() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [slaDefault, setSlaDefault] = useState('4');
  const [isSaving, setIsSaving] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState<number>(0);
  const { getTotalProdutos } = useProdutosDB();
  const { motoristas } = useMotoristasDB();
  const { unidades } = useUnidadesDB();
  const { protocolos } = useProtocolos();
  const { user } = useAuth();

  // Mock users - igual ao AuthContext
  const mockUsers = [
    { id: '1', nome: 'Administrador', email: 'admin@sga.com', role: 'admin', unidade: 'Todas' },
    { id: '2', nome: 'Operador Distribuição', email: 'dist@sga.com', role: 'distribuicao', unidade: 'Matriz' },
    { id: '3', nome: 'Conferente', email: 'conf@sga.com', role: 'conferente', unidade: 'Filial 01' },
  ];

  const fetchTotalProdutos = async () => {
    const total = await getTotalProdutos();
    setTotalProdutos(total);
  };

  useEffect(() => {
    fetchTotalProdutos();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Configurações salvas com sucesso!');
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMotoristas = () => {
    const headers = ['Código', 'Nome', 'Unidade', 'Função', 'Setor', 'WhatsApp', 'Email'];
    const rows = motoristas.map(m => [
      m.codigo,
      m.nome,
      m.unidade,
      m.funcao,
      m.setor,
      m.whatsapp || '',
      m.email || ''
    ]);
    downloadCSV('motoristas', headers, rows);
    toast.success(`${motoristas.length} motorista(s) exportado(s)!`);
  };

  const handleExportUsuarios = () => {
    const headers = ['ID', 'Nome', 'Email', 'Role', 'Unidade'];
    const rows = mockUsers.map(u => [
      u.id,
      u.nome,
      u.email,
      u.role,
      u.unidade
    ]);
    downloadCSV('usuarios', headers, rows);
    toast.success(`${mockUsers.length} usuário(s) exportado(s)!`);
  };

  const handleExportUnidades = () => {
    const headers = ['Código', 'Nome', 'CNPJ'];
    const rows = unidades.map(u => [
      u.codigo,
      u.nome,
      u.cnpj || ''
    ]);
    downloadCSV('unidades', headers, rows);
    toast.success(`${unidades.length} unidade(s) exportada(s)!`);
  };

  const handleExportProtocolos = () => {
    const headers = ['Protocolo', 'Motorista', 'Data', 'Hora', 'Status', 'Unidade', 'PDV', 'Nota Fiscal'];
    const rows = protocolos.filter(p => !p.oculto).map(p => [
      p.numero,
      p.motorista?.nome || '',
      p.data,
      p.hora,
      p.status,
      p.unidadeNome || '',
      p.codigoPdv || '',
      p.notaFiscal || ''
    ]);
    downloadCSV('protocolos', headers, rows);
    toast.success(`${rows.length} protocolo(s) exportado(s)!`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs">
            <MessageSquare size={14} />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-1.5 text-xs">
            <Clock size={14} />
            SLA
          </TabsTrigger>
          <TabsTrigger value="unidades" className="gap-1.5 text-xs">
            <Building size={14} />
            Unidades
          </TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1.5 text-xs">
            <Package size={14} />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-1.5 text-xs">
            <Download size={14} />
            Exportar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="text-success" />
                Integração WhatsApp
              </CardTitle>
              <CardDescription>
                Configure o número oficial e o token do webhook para integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">Número Oficial do WhatsApp</Label>
                <Input
                  id="whatsappNumber"
                  placeholder="5511999999999"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookToken" className="flex items-center gap-2">
                  <Key size={16} />
                  Token do Webhook
                </Label>
                <Input
                  id="webhookToken"
                  type="password"
                  placeholder="Digite o token do webhook"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                />
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Endpoint do Webhook:</p>
                <code className="text-sm bg-background px-3 py-2 rounded block">
                  /api/webhook/whatsapp
                </code>
              </div>
              
              <Button onClick={handleSave} disabled={isSaving} className="btn-primary-gradient">
                <Save size={18} className="mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="text-warning" />
                Configurações de SLA
              </CardTitle>
              <CardDescription>
                Defina os tempos padrão de SLA para os protocolos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="slaDefault">SLA Padrão (em horas)</Label>
                <Input
                  id="slaDefault"
                  type="number"
                  min="1"
                  value={slaDefault}
                  onChange={(e) => setSlaDefault(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-sm text-muted-foreground">Dentro do SLA</p>
                  <p className="text-2xl font-bold text-success">85%</p>
                </div>
                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <p className="text-sm text-muted-foreground">Próximo do limite</p>
                  <p className="text-2xl font-bold text-warning">10%</p>
                </div>
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-muted-foreground">Fora do SLA</p>
                  <p className="text-2xl font-bold text-destructive">5%</p>
                </div>
              </div>
              
              <Button onClick={handleSave} disabled={isSaving} className="btn-primary-gradient">
                <Save size={18} className="mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unidades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="text-info" />
                Unidades
              </CardTitle>
              <CardDescription>
                Gerencie as unidades disponíveis no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Matriz', 'Filial 01', 'Filial 02', 'Filial 03'].map((unidade) => (
                  <div key={unidade} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-medium">{unidade}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Editar</Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="outline">
                Adicionar Unidade
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="text-primary" />
                Catálogo de Produtos
              </CardTitle>
              <CardDescription>
                Importe e atualize o catálogo de produtos via planilha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total de produtos cadastrados</p>
                <p className="text-3xl font-bold text-foreground">{totalProdutos}</p>
              </div>

              <div>
                <h3 className="font-medium mb-3">Importar Planilha de Produtos</h3>
                <ImportarProdutosCSV onImportComplete={fetchTotalProdutos} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="text-primary" />
                Exportar Dados
              </CardTitle>
              <CardDescription>
                Exporte os dados do sistema em diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-primary" />
                    <h3 className="font-semibold text-sm">Protocolos</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Exporte todos os protocolos com detalhes completos
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportProtocolos}>
                    <Download size={14} className="mr-1.5" />
                    CSV
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-emerald-500" />
                    <h3 className="font-semibold text-sm">Motoristas</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Exporte a lista de motoristas cadastrados
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportMotoristas}>
                    <Download size={14} className="mr-1.5" />
                    CSV
                  </Button>
                </div>

                <div className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={18} className="text-sky-500" />
                    <h3 className="font-semibold text-sm">Usuários</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Exporte a lista de usuários do sistema
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportUsuarios}>
                    <Download size={14} className="mr-1.5" />
                    CSV
                  </Button>
                </div>

                <div className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={18} className="text-amber-500" />
                    <h3 className="font-semibold text-sm">Unidades</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Exporte a lista de unidades cadastradas
                  </p>
                  <Button variant="outline" size="sm" onClick={handleExportUnidades}>
                    <Download size={14} className="mr-1.5" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
