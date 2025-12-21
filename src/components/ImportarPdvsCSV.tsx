import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePdvsDB, PdvImport } from '@/hooks/usePdvsDB';
import * as XLSX from 'xlsx';

const UNIDADES = [
  { codigo: 'BF', nome: 'BONFIM' },
  { codigo: 'PE', nome: 'PETROLINA/BEIRA RIO' },
  { codigo: 'RP', nome: 'RIBEIRA DO POMBAL' },
  { codigo: 'AL', nome: 'ALAGOINHAS' },
  { codigo: 'SE', nome: 'SERRINHA' },
  { codigo: 'JZ', nome: 'JUAZEIRO' },
  { codigo: 'PA', nome: 'PAULO AFONSO' },
];

export function ImportarPdvsCSV() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PdvImport[]>([]);
  const [importResult, setImportResult] = useState<{ success: boolean; total: number; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { importPdvs, isImporting } = usePdvsDB();

  const parseCSV = (content: string): PdvImport[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const separator = header.includes(';') ? ';' : ',';
    const headers = header.split(separator).map(h => h.trim());

    // Identificar índices das colunas
    const codigoIdx = headers.findIndex(h => h.includes('codigo'));
    const nomeIdx = headers.findIndex(h => h.includes('fantasia') || h.includes('nome'));
    const bairroIdx = headers.findIndex(h => h.includes('bairro'));
    const cnpjIdx = headers.findIndex(h => h.includes('cnpj'));
    const enderecoIdx = headers.findIndex(h => h.includes('endereco') || h.includes('endereço'));
    const cidadeIdx = headers.findIndex(h => h.includes('cidade'));

    const pdvs: PdvImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim());
      
      const codigo = codigoIdx >= 0 ? values[codigoIdx] : '';
      const nome = nomeIdx >= 0 ? values[nomeIdx] : '';

      if (codigo && nome) {
        pdvs.push({
          codigo: codigo.replace(/\./g, '').replace(/,/g, ''),
          nome,
          bairro: bairroIdx >= 0 ? values[bairroIdx] : undefined,
          cnpj: cnpjIdx >= 0 ? values[cnpjIdx] : undefined,
          endereco: enderecoIdx >= 0 ? values[enderecoIdx] : undefined,
          cidade: cidadeIdx >= 0 ? values[cidadeIdx] : undefined,
        });
      }
    }

    return pdvs;
  };

  const parseXLSX = (data: ArrayBuffer): PdvImport[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const pdvs: PdvImport[] = [];

    for (const row of jsonData) {
      // Tentar encontrar colunas pelo nome
      const codigo = String(row['Codigo Cliente'] || row['codigo'] || row['Codigo'] || '').replace(/\./g, '').replace(/,/g, '');
      const nome = String(row['Nome Fantasia'] || row['nome'] || row['Nome'] || '');
      const bairro = String(row['Bairro'] || row['bairro'] || '');
      const cnpj = String(row['CNPJ'] || row['cnpj'] || '');
      const endereco = String(row['Endereço'] || row['Endereco'] || row['endereco'] || '');
      const cidade = String(row['Cidade'] || row['cidade'] || '');

      if (codigo && nome) {
        pdvs.push({
          codigo,
          nome,
          bairro: bairro || undefined,
          cnpj: cnpj || undefined,
          endereco: endereco || undefined,
          cidade: cidade || undefined,
        });
      }
    }

    return pdvs;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setImportResult(null);

    try {
      let pdvs: PdvImport[] = [];

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        pdvs = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        pdvs = parseXLSX(data);
      } else {
        toast({
          title: 'Formato inválido',
          description: 'Use arquivos CSV ou XLSX',
          variant: 'destructive'
        });
        return;
      }

      if (pdvs.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'Nenhum PDV encontrado no arquivo',
          variant: 'destructive'
        });
        return;
      }

      setPreview(pdvs.slice(0, 5));
      toast({
        title: 'Arquivo carregado',
        description: `${pdvs.length} PDVs encontrados`
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao processar',
        description: 'Verifique o formato do arquivo',
        variant: 'destructive'
      });
    }
  };

  const handleImport = async () => {
    if (!arquivo || !selectedUnidade) {
      toast({
        title: 'Dados incompletos',
        description: 'Selecione a unidade e o arquivo',
        variant: 'destructive'
      });
      return;
    }

    try {
      let pdvs: PdvImport[] = [];

      if (arquivo.name.endsWith('.csv')) {
        const content = await arquivo.text();
        pdvs = parseCSV(content);
      } else {
        const data = await arquivo.arrayBuffer();
        pdvs = parseXLSX(data);
      }

      const result = await importPdvs(pdvs, selectedUnidade);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Importação concluída!',
          description: `${result.total} PDVs importados para ${selectedUnidade}`
        });
        setArquivo(null);
        setPreview([]);
        if (inputRef.current) inputRef.current.value = '';
      } else {
        toast({
          title: 'Erro na importação',
          description: result.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Importar PDVs (Clientes)
        </CardTitle>
        <CardDescription>
          Importe a lista de PDVs por unidade. Formatos aceitos: CSV, XLSX.
          Colunas esperadas: Codigo Cliente, Nome Fantasia, Bairro, CNPJ, Endereço, Cidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Unidade *</Label>
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {UNIDADES.map(u => (
                <SelectItem key={u.codigo} value={u.codigo}>
                  {u.codigo} - {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Arquivo</Label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="pdv-file-input"
            />
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {arquivo ? arquivo.name : 'Selecionar arquivo'}
            </Button>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Preview (primeiros 5):</p>
            <div className="space-y-1 text-xs">
              {preview.map((pdv, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-mono bg-background px-1 rounded">{pdv.codigo}</span>
                  <span className="truncate">{pdv.nome}</span>
                  {pdv.cidade && <span className="text-muted-foreground">• {pdv.cidade}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {importResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${importResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {importResult.success ? (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>{importResult.total} PDVs importados com sucesso!</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span>Erro: {importResult.error}</span>
              </>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!arquivo || !selectedUnidade || isImporting}
          className="w-full"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Importar PDVs
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
