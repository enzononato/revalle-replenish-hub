import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Key, Clock, Building, Download, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Configuracoes() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  const [slaDefault, setSlaDefault] = useState('4');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Configurações salvas com sucesso!');
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exportação em ${format.toUpperCase()} iniciada!`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare size={16} />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sla" className="gap-2">
            <Clock size={16} />
            SLA
          </TabsTrigger>
          <TabsTrigger value="unidades" className="gap-2">
            <Building size={16} />
            Unidades
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-2">
            <Download size={16} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg hover:border-primary transition-colors">
                  <h3 className="font-semibold mb-2">Protocolos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exporte todos os protocolos com detalhes completos
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      PDF
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 border rounded-lg hover:border-primary transition-colors">
                  <h3 className="font-semibold mb-2">Motoristas</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Exporte a lista de motoristas cadastrados
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
