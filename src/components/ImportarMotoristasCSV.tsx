import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Motorista, FuncaoMotorista, SetorMotorista } from '@/types';

interface ImportarMotoristasCSVProps {
  onImport: (motoristas: Motorista[]) => void;
}

interface CSVRow {
  Nome: string;
  Função: string;
  Setor: string;
  'Código promax': string;
  UNIDADE: string;
  Senha?: string;
}

export function ImportarMotoristasCSV({ onImport }: ImportarMotoristasCSVProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // Detectar separador mais comum na primeira linha
    const firstLine = lines[0];
    let separator = ',';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    
    if (tabCount > commaCount && tabCount > semicolonCount) separator = '\t';
    else if (semicolonCount > commaCount) separator = ';';

    const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row as unknown as CSVRow;
    }).filter(row => row.Nome && row.Nome.trim() !== '');
  };

  const mapFuncao = (funcao: string): FuncaoMotorista => {
    const normalized = funcao.toLowerCase().trim();
    if (normalized.includes('ajudante') || normalized.includes('entrega')) {
      return 'ajudante_entrega';
    }
    return 'motorista';
  };

  const mapSetor = (setor: string): SetorMotorista => {
    const normalized = setor.toLowerCase().trim();
    if (normalized.includes('interior')) {
      return 'interior';
    }
    return 'sede';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      
      const validationErrors: string[] = [];
      data.forEach((row, index) => {
        if (!row.Nome) validationErrors.push(`Linha ${index + 2}: Nome é obrigatório`);
        if (!row['Código promax']) validationErrors.push(`Linha ${index + 2}: Código promax é obrigatório`);
      });

      setErrors(validationErrors);
      setPreviewData(data);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = () => {
    if (errors.length > 0) {
      toast.error('Corrija os erros antes de importar');
      return;
    }

    const motoristas: Motorista[] = previewData.map((row, index) => ({
      id: String(Date.now() + index),
      nome: row.Nome.trim(),
      codigo: row['Código promax'].trim(),
      dataNascimento: '',
      unidade: row.UNIDADE?.trim() || 'Revalle Juazeiro',
      funcao: mapFuncao(row.Função || ''),
      setor: mapSetor(row.Setor || ''),
      senha: row.Senha?.trim() || row['Código promax'].trim(),
      createdAt: new Date().toISOString(),
    }));

    onImport(motoristas);
    toast.success(`${motoristas.length} motoristas importados com sucesso!`);
    setIsOpen(false);
    setPreviewData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreviewData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload size={18} />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <FileSpreadsheet className="text-primary" size={24} />
            Importar Motoristas via CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label>Selecione o arquivo CSV</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Colunas esperadas: Nome, Função, Setor, Código promax, UNIDADE, Senha (opcional)
            </p>
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertCircle size={16} />
                Erros encontrados:
              </div>
              <ul className="text-sm text-destructive space-y-1">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {errors.length > 5 && (
                  <li>• ...e mais {errors.length - 5} erros</li>
                )}
              </ul>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 text-primary font-medium mb-2">
                <CheckCircle2 size={16} />
                {previewData.length} registros encontrados
              </div>
              <div className="flex-1 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Nome</th>
                      <th className="text-left p-2 font-medium">Função</th>
                      <th className="text-left p-2 font-medium">Setor</th>
                      <th className="text-left p-2 font-medium">Código</th>
                      <th className="text-left p-2 font-medium">Unidade</th>
                      <th className="text-left p-2 font-medium">Senha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.Nome}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            mapFuncao(row.Função) === 'ajudante_entrega' 
                              ? 'bg-accent/20 text-accent-foreground' 
                              : 'bg-primary/20 text-primary'
                          }`}>
                            {mapFuncao(row.Função) === 'ajudante_entrega' ? 'Ajudante' : 'Motorista'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            mapSetor(row.Setor) === 'interior' 
                              ? 'bg-orange-500/20 text-orange-700' 
                              : 'bg-green-500/20 text-green-700'
                          }`}>
                            {mapSetor(row.Setor) === 'interior' ? 'Interior' : 'Sede'}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{row['Código promax']}</td>
                        <td className="p-2">{row.UNIDADE || 'Revalle Juazeiro'}</td>
                        <td className="p-2 font-mono text-muted-foreground">
                          {row.Senha ? '••••••' : '(código)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-muted-foreground text-sm border-t">
                    ...e mais {previewData.length - 10} registros
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={previewData.length === 0 || errors.length > 0}
              className="btn-primary-gradient"
            >
              Importar {previewData.length} Motoristas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
