import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ParsedRN {
  nome: string;
  cpf: string;
  unidade: string;
  senha: string;
}

export function ImportarRepresentantesCSV() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ total: number; erros: string[] } | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const parseCSV = (text: string): ParsedRN[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nomeIdx = header.findIndex(h => h === 'nome');
    const cpfIdx = header.findIndex(h => h === 'cpf');
    const unidadeIdx = header.findIndex(h => h === 'unidade');
    const senhaIdx = header.findIndex(h => h === 'senha');

    if (nomeIdx === -1 || cpfIdx === -1 || unidadeIdx === -1 || senhaIdx === -1) {
      throw new Error('CSV deve conter colunas: nome, cpf, unidade, senha');
    }

    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        nome: cols[nomeIdx]?.toUpperCase() || '',
        cpf: cols[cpfIdx]?.replace(/\D/g, '') || '',
        unidade: cols[unidadeIdx] || '',
        senha: cols[senhaIdx] || '',
      };
    }).filter(r => r.nome && r.cpf);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);
    setProgress(0);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error('Nenhum registro válido encontrado no CSV');
        setLoading(false);
        return;
      }

      const erros: string[] = [];
      const batchSize = 50;
      let inserted = 0;

      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        const { error } = await supabase.from('representantes').upsert(
          batch.map(r => ({ nome: r.nome, cpf: r.cpf, unidade: r.unidade, senha: r.senha })),
          { onConflict: 'cpf' }
        );

        if (error) {
          erros.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          inserted += batch.length;
        }
        setProgress(Math.round(((i + batch.length) / parsed.length) * 100));
      }

      setResult({ total: inserted, erros });
      queryClient.invalidateQueries({ queryKey: ['representantes'] });

      if (erros.length === 0) {
        toast.success(`${inserted} RN's importados com sucesso!`);
      } else {
        toast.warning(`Importação parcial: ${inserted} inseridos, ${erros.length} erros`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar CSV');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={18} className="mr-2" />Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-primary" />
              Importar Representantes via CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                O CSV deve conter as colunas: <strong>nome, cpf, unidade, senha</strong>
                <br /><span className="text-xs">(a coluna "cargo" será ignorada se presente)</span>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
                disabled={loading}
              />
              <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={loading}>
                {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
                {loading ? 'Importando...' : 'Selecionar arquivo CSV'}
              </Button>
            </div>

            {loading && <Progress value={progress} className="h-2" />}

            {result && (
              <div className={`rounded-lg p-4 text-sm ${result.erros.length ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                <div className="flex items-center gap-2 font-medium mb-1">
                  {result.erros.length ? <AlertCircle size={16} className="text-amber-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}
                  {result.total} registros importados
                </div>
                {result.erros.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
