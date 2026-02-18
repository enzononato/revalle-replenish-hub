import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProdutosDB, ProdutoImport } from '@/hooks/useProdutosDB';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ImportarProdutosCSVProps {
  onImportComplete?: () => void;
}

interface ProdutoComStatus extends ProdutoImport {
  existente: boolean;
}

const HEADER_VARIATIONS: Record<string, string[]> = {
  cod: ['cod', 'icod', 'codigo', 'código', 'code', 'sku', 'id', 'codproduto', 'coditem', 'codigoproduto', 'codigoitem'],
  produto: ['produto', 'nome', 'name', 'descrição', 'descricao', 'description', 'item', 'nomeproduto', 'descproduto', 'desc'],
};

const normalizeHeader = (header: string): string | null => {
  if (!header) return null;
  const normalized = header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-\s.]/g, '');

  for (const [key, variations] of Object.entries(HEADER_VARIATIONS)) {
    for (const variation of variations) {
      const normalizedVariation = variation
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_\-\s.]/g, '');
      if (normalized === normalizedVariation) return key;
    }
  }
  return null;
};

export function ImportarProdutosCSV({ onImportComplete }: ImportarProdutosCSVProps) {
  const [produtos, setProdutos] = useState<ProdutoComStatus[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importProdutosNovos, isImporting } = useProdutosDB();

  const novos = produtos.filter(p => !p.existente);
  const existentes = produtos.filter(p => p.existente);

  const processFile = async (file: File) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // Passa FS: ';' para suportar CSVs com separador ponto e vírgula
        const workbook = XLSX.read(data, { type: 'binary', FS: ';' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length < 2) {
          setErrors(['Arquivo vazio ou sem dados']);
          return;
        }

        const headers = jsonData[0].map(h => String(h || ''));
        const headerMap: Record<number, string> = {};

        headers.forEach((header, index) => {
          const normalized = normalizeHeader(header);
          if (normalized) headerMap[index] = normalized;
        });

        const requiredFields = ['cod', 'produto'];
        const foundFields = Object.values(headerMap);
        const missingFields = requiredFields.filter(f => !foundFields.includes(f));

        if (missingFields.length > 0) {
          setErrors([`Colunas obrigatórias não encontradas: ${missingFields.join(', ')}`]);
          return;
        }

        const parsedProdutos: ProdutoImport[] = [];
        const parseErrors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell)) continue;

          const produto: Partial<ProdutoImport> = {};

          Object.entries(headerMap).forEach(([indexStr, field]) => {
            const idx = parseInt(indexStr);
            const value = row[idx];
            if (value !== undefined && value !== null) {
              (produto as any)[field] = String(value).trim();
            }
          });

          if (!produto.cod) {
            parseErrors.push(`Linha ${i + 1}: Código não informado`);
            continue;
          }
          if (!produto.produto) {
            parseErrors.push(`Linha ${i + 1}: Nome do produto não informado`);
            continue;
          }

          parsedProdutos.push(produto as ProdutoImport);
        }

        setErrors(parseErrors);
        setFileName(file.name);

        if (parsedProdutos.length === 0 && parseErrors.length === 0) {
          setErrors(['Nenhum produto válido encontrado no arquivo']);
          return;
        }

        // Busca códigos existentes para exibir status no preview
        setLoadingStatus(true);
        try {
          const { data: existentesData } = await supabase
            .from('produtos')
            .select('cod');

          const existentesSet = new Set((existentesData || []).map(p => p.cod.trim()));

          const comStatus: ProdutoComStatus[] = parsedProdutos.map(p => ({
            ...p,
            existente: existentesSet.has(p.cod.trim()),
          }));

          setProdutos(comStatus);
        } finally {
          setLoadingStatus(false);
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        setErrors(['Erro ao processar arquivo. Verifique o formato.']);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProdutos([]);
      processFile(file);
    }
  };

  const handleImport = async () => {
    if (novos.length === 0) return;

    const result = await importProdutosNovos(novos);

    if (result.success) {
      if (result.inseridos === 0) {
        toast.info('Nenhum produto novo para inserir — todos já existiam na base.');
      } else {
        const msg = result.ignorados && result.ignorados > 0
          ? `${result.inseridos} novo(s) produto(s) inserido(s). ${result.ignorados} já existiam e foram ignorados.`
          : `${result.inseridos} produto(s) inserido(s) com sucesso!`;
        toast.success(msg);
      }
      setProdutos([]);
      setFileName('');
      setErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportComplete?.();
    } else {
      toast.error(`Erro ao importar: ${result.error}`);
    }
  };

  const handleClear = () => {
    setProdutos([]);
    setFileName('');
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload-produtos"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload size={16} />
          Selecionar Arquivo
        </Button>
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet size={16} />
            {fileName}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">Formato esperado da planilha:</p>
        <p>Colunas: <strong>Código</strong> (ou cod, codigo) | <strong>Produto</strong> (ou nome, descrição)</p>
        <p className="mt-1">Separadores suportados: vírgula (,) e ponto e vírgula (;)</p>
      </div>

      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
            <AlertCircle size={16} />
            Avisos ({errors.length})
          </div>
          <ul className="text-xs text-destructive/80 space-y-1 max-h-24 overflow-y-auto">
            {errors.slice(0, 10).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {errors.length > 10 && (
              <li>... e mais {errors.length - 10} avisos</li>
            )}
          </ul>
        </div>
      )}

      {loadingStatus && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Verificando códigos existentes...
        </div>
      )}

      {produtos.length > 0 && !loadingStatus && (
        <>
          {/* Resumo */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Total no arquivo: <strong>{produtos.length}</strong></span>
            <Badge variant="default" className="bg-primary/90">
              {novos.length} novo{novos.length !== 1 ? 's' : ''}
            </Badge>
            {existentes.length > 0 && (
              <Badge variant="secondary">
                {existentes.length} já existente{existentes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <span className="text-sm font-medium">
                Preview: {produtos.length} produtos
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index} className={produto.existente ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{produto.cod}</TableCell>
                      <TableCell>{produto.produto}</TableCell>
                      <TableCell className="text-center">
                        {produto.existente ? (
                          <Badge variant="secondary" className="text-xs">Existente</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs bg-primary/90">Novo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={isImporting || novos.length === 0}
              className="gap-2"
            >
              {isImporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {isImporting
                ? 'Importando...'
                : novos.length === 0
                  ? 'Nenhum produto novo'
                  : `Importar ${novos.length} produto${novos.length !== 1 ? 's' : ''} novo${novos.length !== 1 ? 's' : ''}`
              }
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isImporting} className="gap-2">
              <X size={16} />
              Cancelar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
