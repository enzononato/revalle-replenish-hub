import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoImport {
  cod: string;
  produto: string;
}

export interface ImportResult {
  success: boolean;
  total: number;
  inseridos?: number;
  ignorados?: number;
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

  const importProdutosNovos = async (produtos: ProdutoImport[]): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      // Busca todos os códigos existentes
      const { data: existentesData, error: fetchError } = await supabase
        .from('produtos')
        .select('cod');

      if (fetchError) throw fetchError;

      const existentes = new Set((existentesData || []).map(p => p.cod.trim()));
      const novos = produtos.filter(p => !existentes.has(p.cod.trim()));
      const ignorados = produtos.length - novos.length;

      if (novos.length === 0) {
        return { success: true, total: produtos.length, inseridos: 0, ignorados };
      }

      const novosComEmbalagem = novos.map(p => ({
        cod: p.cod.trim(),
        produto: p.produto.trim(),
        embalagem: 'UN',
      }));

      const { error } = await supabase
        .from('produtos')
        .insert(novosComEmbalagem);

      if (error) throw error;

      return { success: true, total: produtos.length, inseridos: novos.length, ignorados };
    } catch (error) {
      console.error('Erro ao importar produtos novos:', error);
      return {
        success: false,
        total: 0,
        inseridos: 0,
        ignorados: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
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

  return { importProdutos, importProdutosNovos, getTotalProdutos, isImporting };
}
