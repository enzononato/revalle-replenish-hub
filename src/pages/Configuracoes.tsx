import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Key, Clock, Building, Download, Save, Package, Users, FileText, MapPin, Store, Database, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { ImportarProdutosCSV } from '@/components/ImportarProdutosCSV';
import { ImportarPdvsCSV } from '@/components/ImportarPdvsCSV';
import { useProdutosDB } from '@/hooks/useProdutosDB';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { usePdvsDB } from '@/hooks/usePdvsDB';
import { useProtocolos } from '@/contexts/ProtocolosContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Configuracoes() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [slaDefault, setSlaDefault] = useState('4');
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState<number>(0);
  const [totalPdvs, setTotalPdvs] = useState<number>(0);
  const [pdvsRefreshKey, setPdvsRefreshKey] = useState(0);
  const [isExportingFotos, setIsExportingFotos] = useState(false);
  const [fotosProgress, setFotosProgress] = useState({ total: 0, done: 0 });
  const { getTotalProdutos } = useProdutosDB();
  const { getTotalPdvs } = usePdvsDB();
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

  const fetchTotalPdvs = async () => {
    const total = await getTotalPdvs();
    setTotalPdvs(total);
  };

  useEffect(() => {
    fetchTotalProdutos();
    fetchTotalPdvs();
  }, [pdvsRefreshKey]);

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

  const fetchAllRows = async (table: string) => {
    const PAGE_SIZE = 1000;
    let allData: Record<string, unknown>[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await (supabase as any).from(table).select('*').range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < PAGE_SIZE) hasMore = false;
        else from += PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const tables = ['protocolos', 'motoristas', 'pdvs', 'produtos', 'unidades', 'gestores', 'user_profiles', 'audit_logs', 'chat_conversations', 'chat_messages', 'chat_participants'] as const;
      const backup: Record<string, unknown[]> = {};
      
      await Promise.all(
        tables.map(async (table) => {
          backup[table] = await fetchAllRows(table);
        })
      );

      const json = JSON.stringify({
        exportado_em: new Date().toISOString(),
        tabelas: backup,
      }, null, 2);

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_sistema_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao exportar backup: ${message}`);
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExportFotos = async () => {
    setIsExportingFotos(true);
    setFotosProgress({ total: 0, done: 0 });
    try {
      const zip = new JSZip();
      const BUCKET = 'fotos-protocolos';
      const PAGE_SIZE = 100;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const storageBase = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

      // 1. List all folders with pagination
      const allFolders: string[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: PAGE_SIZE, offset });
        if (error) throw error;
        if (!data || data.length === 0) { hasMore = false; break; }
        for (const item of data) {
          // Folders have id === null in Supabase storage
          if (item.id === null || !item.name.includes('.')) {
            allFolders.push(item.name);
          }
        }
        if (data.length < PAGE_SIZE) hasMore = false;
        else offset += PAGE_SIZE;
      }

      // 2. List files inside each folder IN PARALLEL (much faster)
      type FileEntry = { folder: string; name: string };
      const listFolderFiles = async (folder: string): Promise<FileEntry[]> => {
        const files: FileEntry[] = [];
        let fOffset = 0;
        let fMore = true;
        while (fMore) {
          const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: PAGE_SIZE, offset: fOffset });
          if (error || !data || data.length === 0) break;
          for (const file of data) {
            if (file.name && file.id) {
              files.push({ folder, name: file.name });
            }
          }
          fMore = data.length >= PAGE_SIZE;
          fOffset += PAGE_SIZE;
        }
        return files;
      };

      // List all folders in parallel batches of 10
      const allFiles: FileEntry[] = [];
      for (let i = 0; i < allFolders.length; i += 10) {
        const batch = allFolders.slice(i, i + 10);
        const results = await Promise.all(batch.map(f => listFolderFiles(f)));
        results.forEach(files => allFiles.push(...files));
      }

      if (allFiles.length === 0) {
        toast.info('Nenhuma foto encontrada no sistema.');
        setIsExportingFotos(false);
        return;
      }

      setFotosProgress({ total: allFiles.length, done: 0 });

      // 3. Download via public URL (fetch) in batches of 10 — much faster than SDK
      const BATCH = 10;
      let done = 0;
      let errors = 0;
      for (let i = 0; i < allFiles.length; i += BATCH) {
        const batch = allFiles.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (f) => {
            const path = `${f.folder}/${f.name}`;
            const resp = await fetch(`${storageBase}/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`);
            if (!resp.ok) return null;
            const blob = await resp.blob();
            return { path, blob };
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) {
            zip.file(r.value.path, r.value.blob);
          } else {
            errors++;
          }
        }
        done += batch.length;
        setFotosProgress({ total: allFiles.length, done: Math.min(done, allFiles.length) });
        // Yield to UI thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      toast.info('Gerando arquivo ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_fotos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      const msg = errors > 0
        ? `${done - errors} foto(s) exportada(s). ${errors} falha(s) ignorada(s).`
        : `${done} foto(s) exportada(s) com sucesso!`;
      toast.success(msg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao exportar fotos: ${message}`);
    } finally {
      setIsExportingFotos(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="bg-muted flex-wrap h-auto gap-1 p-1">
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
          <TabsTrigger value="clientes" className="gap-1.5 text-xs">
            <Store size={14} />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-1.5 text-xs">
            <Download size={14} />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs">
            <Database size={14} />
            Backup
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

        <TabsContent value="clientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="text-primary" />
                Clientes (PDVs)
              </CardTitle>
              <CardDescription>
                Importe e gerencie os pontos de venda via planilha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">Total de clientes cadastrados</p>
                <p className="text-3xl font-bold text-foreground">{totalPdvs}</p>
              </div>

              <div>
                <h3 className="font-medium mb-3">Importar Planilha de Clientes</h3>
                <ImportarPdvsCSV />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Para gerenciamento completo de clientes (editar, excluir, criar), acesse a página de Clientes no menu lateral.
                </p>
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

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="text-primary" />
                Backup Completo do Sistema
              </CardTitle>
              <CardDescription>
                Exporte todos os dados do sistema em um único arquivo JSON para backup ou migração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                <p className="text-sm font-medium">O backup inclui:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Protocolos</li>
                  <li>Motoristas</li>
                  <li>Clientes (PDVs)</li>
                  <li>Produtos</li>
                  <li>Unidades</li>
                  <li>Gestores</li>
                  <li>Perfis de Usuários</li>
                  <li>Logs de Auditoria</li>
                  <li>Conversas e Mensagens do Chat</li>
                </ul>
              </div>

              <Button
                onClick={handleExportBackup}
                disabled={isExportingBackup}
                className="btn-primary-gradient"
                size="lg"
              >
                {isExportingBackup ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Database size={18} className="mr-2" />
                    Exportar Dados do Sistema
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="text-primary" />
                Exportar Fotos do Sistema
              </CardTitle>
              <CardDescription>
                Baixe todas as fotos dos protocolos em um arquivo ZIP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isExportingFotos && fotosProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Baixando fotos...</span>
                    <span>{fotosProgress.done} de {fotosProgress.total}</span>
                  </div>
                  <Progress value={(fotosProgress.done / fotosProgress.total) * 100} className="h-3" />
                </div>
              )}

              <Button
                onClick={handleExportFotos}
                disabled={isExportingFotos}
                variant="outline"
                size="lg"
              >
                {isExportingFotos ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Exportando fotos...
                  </>
                ) : (
                  <>
                    <Camera size={18} className="mr-2" />
                    Exportar Fotos (ZIP)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
