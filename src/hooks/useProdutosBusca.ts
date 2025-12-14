import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProdutoCatalogo {
  cod: string;
  produto: string;
  embalagem: string;
}

export function useProdutosBusca(termo: string) {
  const [produtos, setProdutos] = useState<ProdutoCatalogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const buscarProdutos = async () => {
      if (termo.length < 2) {
        setProdutos([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('cod, produto, embalagem')
          .or(`cod.ilike.%${termo}%,produto.ilike.%${termo}%`)
          .limit(10);

        if (error) throw error;
        setProdutos(data || []);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setProdutos([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(buscarProdutos, 300);
    return () => clearTimeout(debounce);
  }, [termo]);

  return { produtos, isLoading };
}
