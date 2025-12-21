import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PdvCatalogo {
  codigo: string;
  nome: string;
  bairro?: string;
  cidade?: string;
  endereco?: string;
}

export function usePdvsBusca(termo: string, unidade: string) {
  const [pdvs, setPdvs] = useState<PdvCatalogo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const buscarPdvs = async () => {
      if (termo.length < 2 || !unidade) {
        setPdvs([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('pdvs')
          .select('codigo, nome, bairro, cidade, endereco')
          .eq('unidade', unidade)
          .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
          .limit(10);

        if (error) throw error;
        setPdvs(data || []);
      } catch (error) {
        console.error('Erro ao buscar PDVs:', error);
        setPdvs([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(buscarPdvs, 300);
    return () => clearTimeout(debounce);
  }, [termo, unidade]);

  return { pdvs, isLoading };
}
