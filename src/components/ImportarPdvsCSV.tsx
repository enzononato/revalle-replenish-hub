import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, Loader2, Check, X, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePdvsDB, PdvImport } from '@/hooks/usePdvsDB';
import { supabase } from '@/integrations/supabase/client';
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

interface PdvComStatus extends PdvImport {
  existente: boolean;
}

export function ImportarPdvsCSV() {
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pdvs, setPdvs] = useState<PdvComStatus[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { importPdvsNovos, isImporting } = usePdvsDB();

  const novos = pdvs.filter(p => !p.existente);
  const existentes = pdvs.filter(p => p.existente);

  const parseCSV = (content: string): PdvImport[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const separator = header.includes(';') ? ';' : ',';
    const headers = header.split(separator).map(h => h.trim());

    const codigoIdx = headers.findIndex(h => h.includes('codigo'));
    const nomeIdx = headers.findIndex(h => h.includes('fantasia') || h.includes('nome'));
    const bairroIdx = headers.findIndex(h => h.includes('bairro'));
    const cnpjIdx = headers.findIndex(h => h.includes('cnpj'));
    const enderecoIdx = headers.findIndex(h => h.includes('endereco') || h.includes('endereço'));
    const cidadeIdx = headers.findIndex(h => h.includes('cidade'));

    const result: PdvImport[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim());
      const codigo = codigoIdx >= 0 ? values[codigoIdx] : '';
      const nome = nomeIdx >= 0 ? values[nomeIdx] : '';
      if (codigo && nome) {
        result.push({
          codigo: codigo.replace(/\./g, '').replace(/,/g, ''),
          nome,
          bairro: bairroIdx >= 0 ? values[bairroIdx] : undefined,
          cnpj: cnpjIdx >= 0 ? values[cnpjIdx] : undefined,
          endereco: enderecoIdx >= 0 ? values[enderecoIdx] : undefined,
          cidade: cidadeIdx >= 0 ? values[cidadeIdx] : undefined,
        });
      }
    }
    return result;
  };

  const parseXLSX = (data: ArrayBuffer): PdvImport[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const result: PdvImport[] = [];
    for (const row of jsonData) {
      const codigo = String(row['Codigo Cliente'] || row['codigo'] || row['Codigo'] || '').replace(/\./g, '').replace(/,/g, '');
      const nome = String(row['Nome Fantasia'] || row['nome'] || row['Nome'] || '');
      const bairro = String(row['Bairro'] || row['bairro'] || '');
      const cnpj = String(row['CNPJ'] || row['cnpj'] || '');
      const endereco = String(row['Endereço'] || row['Endereco'] || row['endereco'] || '');
      const cidade = String(row['Cidade'] || row['cidade'] || '');

      if (codigo && nome) {
        result.push({
          codigo,
          nome,
          bairro: bairro || undefined,
          cnpj: cnpj || undefined,
          endereco: endereco || undefined,
          cidade: cidade || undefined,
        });
      }
    }
    return result;
  };

  const enrichWithStatus = async (parsed: PdvImport[], unidade: string) => {
    setLoadingStatus(true);
    try {
      // Buscar TODOS os códigos existentes com paginação para evitar limite de 1000
      let allCodigos: string[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('pdvs')
          .select('codigo')
          .eq('unidade', unidade.toUpperCase())
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        allCodigos.push(...data.map(p => String(p.codigo).trim()));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const existentesSet = new Set(allCodigos);

      const comStatus: PdvComStatus[] = parsed.map(p => ({
        ...p,
        existente: existentesSet.has(String(p.codigo).replace(/\./g, '').trim()),
      }));

      setPdvs(comStatus);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setPdvs([]);
    setErrors([]);

    try {
      let parsed: PdvImport[] = [];

      if (file.name.endsWith('.csv')) {
        const content = await file.text();
        parsed = parseCSV(content);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        parsed = parseXLSX(data);
      } else {
        toast.error('Formato inválido. Use arquivos CSV ou XLSX.');
        return;
      }

      if (parsed.length === 0) {
        setErrors(['Nenhum PDV encontrado no arquivo']);
        return;
      }

      if (selectedUnidade) {
        await enrichWithStatus(parsed, selectedUnidade);
      } else {
        // Sem unidade ainda, só mostrar os dados sem status
        setPdvs(parsed.map(p => ({ ...p, existente: false })));
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setErrors(['Erro ao processar arquivo. Verifique o formato.']);
    }
  };

  const handleUnidadeChange = async (unidade: string) => {
    setSelectedUnidade(unidade);
    if (pdvs.length > 0) {
      // Re-verificar status com a nova unidade
      const semStatus = pdvs.map(({ existente: _, ...p }) => p as PdvImport);
      await enrichWithStatus(semStatus, unidade);
    }
  };

  const handleImport = async () => {
    if (!arquivo || !selectedUnidade || novos.length === 0) return;

    const result = await importPdvsNovos(novos, selectedUnidade);

    if (result.success) {
      if ((result as any).inseridos === 0) {
        toast.info('Nenhum PDV novo para inserir — todos já existiam nessa unidade.');
      } else {
        const ignorados = (result as any).ignorados ?? 0;
        const inseridos = (result as any).inseridos ?? result.total;
        const msg = ignorados > 0
          ? `${inseridos} novo(s) PDV(s) inserido(s). ${ignorados} já existiam e foram ignorados.`
          : `${inseridos} PDV(s) inserido(s) com sucesso!`;
        toast.success(msg);
      }
      setPdvs([]);
      setArquivo(null);
      setErrors([]);
      if (inputRef.current) inputRef.current.value = '';
    } else {
      toast.error(`Erro na importação: ${result.error}`);
    }
  };

  const handleClear = () => {
    setPdvs([]);
    setArquivo(null);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Importar PDVs (Clientes)
        </CardTitle>
        <CardDescription>
          Importação incremental — apenas PDVs com código novo na unidade serão inseridos.
          Formatos aceitos: CSV, XLSX. Colunas: Codigo Cliente, Nome Fantasia, Bairro, CNPJ, Endereço, Cidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Unidade *</Label>
          <Select value={selectedUnidade} onValueChange={handleUnidadeChange}>
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

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
              <AlertCircle size={16} />
              Avisos
            </div>
            <ul className="text-xs text-destructive/80 space-y-1">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        {loadingStatus && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Verificando códigos existentes...
          </div>
        )}

        {pdvs.length > 0 && !loadingStatus && (
          <>
            {/* Resumo */}
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="text-muted-foreground">
                Total no arquivo: <strong>{pdvs.length}</strong>
              </span>
              <Badge variant="default" className="bg-primary/90">
                {novos.length} novo{novos.length !== 1 ? 's' : ''}
              </Badge>
              {existentes.length > 0 && (
                <Badge variant="secondary">
                  {existentes.length} já existente{existentes.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {!selectedUnidade && (
                <span className="text-xs text-muted-foreground italic">
                  Selecione a unidade para verificar existentes
                </span>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <span className="text-sm font-medium">Preview: {pdvs.length} PDVs</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-24">Cidade</TableHead>
                      <TableHead className="w-28 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pdvs.map((pdv, i) => (
                      <TableRow key={i} className={pdv.existente ? 'opacity-50' : ''}>
                        <TableCell className="font-mono text-sm">{pdv.codigo}</TableCell>
                        <TableCell className="truncate max-w-[200px]">{pdv.nome}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{pdv.cidade || '—'}</TableCell>
                        <TableCell className="text-center">
                          {pdv.existente ? (
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
                disabled={isImporting || novos.length === 0 || !selectedUnidade}
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
                    ? 'Nenhum PDV novo'
                    : `Importar ${novos.length} PDV${novos.length !== 1 ? 's' : ''} novo${novos.length !== 1 ? 's' : ''}`
                }
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={isImporting} className="gap-2">
                <X size={16} />
                Cancelar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
