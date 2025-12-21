import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PdvImport {
  codigo: string;
  nome: string;
  bairro?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
}

export interface ImportResult {
  success: boolean;
  total: number;
  error?: string;
}

export function usePdvsDB() {
  const [isImporting, setIsImporting] = useState(false);

  const importPdvs = async (pdvs: PdvImport[], unidade: string): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      // Limpar código (remover pontos e espaços)
      const pdvsFormatados = pdvs.map(p => ({
        codigo: p.codigo.replace(/\./g, '').trim(),
        nome: p.nome.trim(),
        bairro: p.bairro?.trim() || null,
        cnpj: p.cnpj?.replace(/[^\d]/g, '').trim() || null,
        endereco: p.endereco?.trim() || null,
        cidade: p.cidade?.trim() || null,
        unidade: unidade.toUpperCase()
      }));

      // Deletar PDVs existentes dessa unidade antes de inserir
      await supabase
        .from('pdvs')
        .delete()
        .eq('unidade', unidade.toUpperCase());

      // Inserir em lotes de 500
      const batchSize = 500;
      for (let i = 0; i < pdvsFormatados.length; i += batchSize) {
        const batch = pdvsFormatados.slice(i, i + batchSize);
        const { error } = await supabase
          .from('pdvs')
          .insert(batch);

        if (error) throw error;
      }

      return { success: true, total: pdvs.length };
    } catch (error) {
      console.error('Erro ao importar PDVs:', error);
      return { 
        success: false, 
        total: 0, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    } finally {
      setIsImporting(false);
    }
  };

  const getTotalPdvs = async (): Promise<number> => {
    const { count, error } = await supabase
      .from('pdvs')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao contar PDVs:', error);
      return 0;
    }
    return count || 0;
  };

  const getTotalPdvsPorUnidade = async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase
      .from('pdvs')
      .select('unidade');

    if (error) {
      console.error('Erro ao contar PDVs por unidade:', error);
      return {};
    }

    const contagem: Record<string, number> = {};
    data?.forEach(pdv => {
      const unidade = pdv.unidade || 'SEM_UNIDADE';
      contagem[unidade] = (contagem[unidade] || 0) + 1;
    });

    return contagem;
  };

  return { importPdvs, getTotalPdvs, getTotalPdvsPorUnidade, isImporting };
}
