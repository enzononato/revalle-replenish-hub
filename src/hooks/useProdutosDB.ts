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
  atualizados?: number;
  inalterados?: number;
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
      // Busca todos os existentes (cod + produto) para classificar cada linha
      const { data: existentesData, error: fetchError } = await supabase
        .from('produtos')
        .select('cod, produto');

      if (fetchError) throw fetchError;

      const mapaExistentes = new Map(
        (existentesData || []).map(p => [p.cod.trim(), (p.produto || '').trim()])
      );

      const novos: ProdutoImport[] = [];
      const paraAtualizar: ProdutoImport[] = [];
      let inalterados = 0;

      for (const p of produtos) {
        const cod = p.cod.trim();
        const nome = p.produto.trim();
        if (!mapaExistentes.has(cod)) {
          novos.push({ cod, produto: nome });
        } else if (mapaExistentes.get(cod) !== nome) {
          paraAtualizar.push({ cod, produto: nome });
        } else {
          inalterados += 1;
        }
      }

      // Inserir novos
      if (novos.length > 0) {
        const { error: insertError } = await supabase.from('produtos').insert(
          novos.map(p => ({ cod: p.cod, produto: p.produto, embalagem: 'UN' }))
        );
        if (insertError) throw insertError;
      }

      // Atualizar nomes dos existentes (em paralelo)
      if (paraAtualizar.length > 0) {
        const results = await Promise.all(
          paraAtualizar.map(p =>
            supabase.from('produtos').update({ produto: p.produto }).eq('cod', p.cod)
          )
        );
        const firstErr = results.find(r => r.error)?.error;
        if (firstErr) throw firstErr;
      }

      return {
        success: true,
        total: produtos.length,
        inseridos: novos.length,
        atualizados: paraAtualizar.length,
        inalterados,
        ignorados: inalterados,
      };
    } catch (error) {
      console.error('Erro ao importar produtos novos:', error);
      return {
        success: false,
        total: 0,
        inseridos: 0,
        atualizados: 0,
        inalterados: 0,
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
