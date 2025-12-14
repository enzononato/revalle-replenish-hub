import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoImport {
  cod: string;
  produto: string;
}

export interface ImportResult {
  success: boolean;
  total: number;
  error?: string;
}

export function useProdutosDB() {
  const [isImporting, setIsImporting] = useState(false);

  const importProdutos = async (produtos: ProdutoImport[]): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      const produtosComEmbalagem = produtos.map(p => ({
        cod: p.cod.trim(),
        produto: p.produto.trim(),
        embalagem: 'UN', // Valor padrão
      }));

      const { error } = await supabase
        .from('produtos')
        .upsert(produtosComEmbalagem, { 
          onConflict: 'cod',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      return { success: true, total: produtos.length };
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      return { 
        success: false, 
        total: 0, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    } finally {
      setIsImporting(false);
    }
  };

  const getTotalProdutos = async (): Promise<number> => {
    const { count, error } = await supabase
      .from('produtos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao contar produtos:', error);
      return 0;
    }
    return count || 0;
  };

  return { importProdutos, getTotalProdutos, isImporting };
}
