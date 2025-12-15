import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileText, Database, Users, Package, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { parseSqlFile, mapParsedToMotorista, ParseResult } from '@/utils/parseSqlImport';
import { useUnidadesDB } from '@/hooks/useUnidadesDB';
import { useMotoristasDB } from '@/hooks/useMotoristasDB';
import { useProdutosDB } from '@/hooks/useProdutosDB';

export default function ImportarDados() {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<{
    unidades: 'pending' | 'importing' | 'done' | 'error';
    motoristas: 'pending' | 'importing' | 'done' | 'error';
    produtos: 'pending' | 'importing' | 'done' | 'error';
  }>({
    unidades: 'pending',
    motoristas: 'pending',
    produtos: 'pending',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { importUnidades } = useUnidadesDB();
  const { importMotoristas } = useMotoristasDB();
  const { importProdutos } = useProdutosDB();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.sql')) {
      toast.error('Por favor, selecione um arquivo .sql');
      return;
    }
    
    setFile(selectedFile);
    
    try {
      const content = await selectedFile.text();
      const result = parseSqlFile(content);
      setParseResult(result);
      
      if (result.errors.length > 0) {
        toast.warning(`Arquivo processado com ${result.errors.length} avisos`);
      } else {
        toast.success('Arquivo processado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo SQL');
    }
  };
  
  const handleImport = async () => {
    if (!parseResult) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      // 1. Importar Unidades
      setImportStatus(prev => ({ ...prev, unidades: 'importing' }));
      
      const unidadesData = parseResult.unidades.map(u => ({
        nome: u.nome,
        codigo: u.codigo || u.nome.substring(0, 3).toUpperCase(),
        cnpj: '',
      }));
      
      if (unidadesData.length > 0) {
        await importUnidades(unidadesData);
      }
      
      setImportStatus(prev => ({ ...prev, unidades: 'done' }));
      setImportProgress(33);
      
      // Criar mapa de unidades
      const unidadesMap = new Map<number, string>();
      parseResult.unidades.forEach(u => {
        unidadesMap.set(u.id, u.nome);
      });
      
      // 2. Importar Produtos
      setImportStatus(prev => ({ ...prev, produtos: 'importing' }));
      
      const produtosData = parseResult.produtos.map(p => ({
        cod: p.codigo,
        produto: p.nome,
        embalagem: p.embalagem || 'UN',
      }));
      
      if (produtosData.length > 0) {
        await importProdutos(produtosData);
      }
      
      setImportStatus(prev => ({ ...prev, produtos: 'done' }));
      setImportProgress(66);
      
      // 3. Importar Motoristas
      setImportStatus(prev => ({ ...prev, motoristas: 'importing' }));
      
      const motoristasData = parseResult.motoristas.map(m => 
        mapParsedToMotorista(m, unidadesMap)
      );
      
      if (motoristasData.length > 0) {
        await importMotoristas(motoristasData);
      }
      
      setImportStatus(prev => ({ ...prev, motoristas: 'done' }));
      setImportProgress(100);
      
      toast.success('Importação concluída com sucesso!');
      
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro durante a importação');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClear = () => {
    setFile(null);
    setParseResult(null);
    setImportProgress(0);
    setImportStatus({
      unidades: 'pending',
      motoristas: 'pending',
      produtos: 'pending',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const getStatusIcon = (status: 'pending' | 'importing' | 'done' | 'error') => {
    switch (status) {
      case 'importing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
          <Database className="text-primary" size={32} />
          Importar Dados
        </h1>
        <p className="text-muted-foreground mt-1">
          Importe dados do sistema antigo a partir de um arquivo SQL
        </p>
      </div>
      
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            Upload do Arquivo SQL
          </CardTitle>
          <CardDescription>
            Selecione o arquivo SQL exportado do sistema antigo (MariaDB/MySQL)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              onChange={handleFileChange}
              className="hidden"
              id="sql-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <FileText className="mr-2 h-4 w-4" />
              Selecionar Arquivo
            </Button>
            
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          
          {parseResult && parseResult.errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm font-medium text-destructive mb-2">Avisos:</p>
              <ul className="text-sm text-destructive/80 list-disc list-inside">
                {parseResult.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Section */}
      {parseResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Unidades
                {getStatusIcon(importStatus.unidades)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{parseResult.unidades.length}</p>
              <p className="text-sm text-muted-foreground">registros encontrados</p>
              {parseResult.unidades.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                  {parseResult.unidades.slice(0, 5).map((u, i) => (
                    <div key={i} className="truncate">{u.nome}</div>
                  ))}
                  {parseResult.unidades.length > 5 && (
                    <div className="text-primary">+{parseResult.unidades.length - 5} mais...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Motoristas
                {getStatusIcon(importStatus.motoristas)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{parseResult.motoristas.length}</p>
              <p className="text-sm text-muted-foreground">registros encontrados</p>
              {parseResult.motoristas.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                  {parseResult.motoristas.slice(0, 5).map((m, i) => (
                    <div key={i} className="truncate">{m.nome}</div>
                  ))}
                  {parseResult.motoristas.length > 5 && (
                    <div className="text-primary">+{parseResult.motoristas.length - 5} mais...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Produtos
                {getStatusIcon(importStatus.produtos)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{parseResult.produtos.length}</p>
              <p className="text-sm text-muted-foreground">registros encontrados</p>
              {parseResult.produtos.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                  {parseResult.produtos.slice(0, 5).map((p, i) => (
                    <div key={i} className="truncate">{p.codigo} - {p.nome}</div>
                  ))}
                  {parseResult.produtos.length > 5 && (
                    <div className="text-primary">+{parseResult.produtos.length - 5} mais...</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Progress Section */}
      {isImporting && (
        <Card>
          <CardHeader>
            <CardTitle>Importando dados...</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={importProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">{importProgress}% concluído</p>
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      {parseResult && (
        <div className="flex gap-4">
          <Button
            onClick={handleImport}
            disabled={isImporting || importProgress === 100}
            className="btn-primary-gradient"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : importProgress === 100 ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Importação Concluída
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Iniciar Importação
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={handleClear} disabled={isImporting}>
            Limpar
          </Button>
        </div>
      )}
    </div>
  );
}
