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
        codigo: String(p.codigo || '').replace(/\./g, '').trim(),
        nome: String(p.nome || '').trim() || 'SEM NOME',
        bairro: p.bairro?.trim() || null,
        cnpj: p.cnpj?.replace(/[^\d]/g, '').trim() || null,
        endereco: p.endereco?.trim() || null,
        cidade: p.cidade?.trim() || null,
        unidade: unidade.toUpperCase()
      })).filter(p => p.codigo); // Filtrar registros sem código

      if (pdvsFormatados.length === 0) {
        return { success: false, total: 0, error: 'Nenhum PDV válido encontrado' };
      }

      // Remover duplicatas mantendo o primeiro registro de cada código
      const uniquePdvs = pdvsFormatados.reduce((acc, pdv) => {
        if (!acc.find(p => p.codigo === pdv.codigo)) {
          acc.push(pdv);
        }
        return acc;
      }, [] as typeof pdvsFormatados);

      console.log(`PDVs originais: ${pdvsFormatados.length}, únicos: ${uniquePdvs.length}`);

      // Deletar PDVs existentes dessa unidade antes de inserir
      const { error: deleteError } = await supabase
        .from('pdvs')
        .delete()
        .eq('unidade', unidade.toUpperCase());

      if (deleteError) {
        console.error('Erro ao deletar PDVs existentes:', deleteError);
        throw new Error(`Erro ao limpar dados antigos: ${deleteError.message}`);
      }

      // Inserir em lotes menores de 100 para evitar timeout
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < uniquePdvs.length; i += batchSize) {
        const batch = uniquePdvs.slice(i, i + batchSize);
        const { error } = await supabase
          .from('pdvs')
          .insert(batch);

        if (error) {
          console.error(`Erro no lote ${Math.floor(i / batchSize) + 1}:`, error);
          throw new Error(`Erro ao inserir lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }
        
        inserted += batch.length;
      }

      return { success: true, total: inserted };
    } catch (error) {
      console.error('Erro ao importar PDVs:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { 
        success: false, 
        total: 0, 
        error: message
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
