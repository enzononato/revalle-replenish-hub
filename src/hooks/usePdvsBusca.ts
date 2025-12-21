import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PdvCatalogo {
  codigo: string;
  nome: string;
  bairro?: string;
  cidade?: string;
  endereco?: string;
}

// Mapeamento de nomes de unidade para códigos
const UNIDADE_MAP: Record<string, string> = {
  'revalle bonfim': 'BF',
  'revalle petrolina': 'PE',
  'revalle ribeira do pombal': 'RP',
  'revalle alagoinhas': 'AL',
  'revalle serrinha': 'SE',
  'revalle juazeiro': 'JZ',
  'revalle paulo afonso': 'PA',
  // Códigos diretos
  'bf': 'BF',
  'pe': 'PE',
  'rp': 'RP',
  'al': 'AL',
  'se': 'SE',
  'jz': 'JZ',
  'pa': 'PA',
};

function getUnidadeCodigo(unidade: string): string {
  const key = unidade.toLowerCase().trim();
  return UNIDADE_MAP[key] || unidade.toUpperCase();
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

      const unidadeCodigo = getUnidadeCodigo(unidade);

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('pdvs')
          .select('codigo, nome, bairro, cidade, endereco')
          .eq('unidade', unidadeCodigo)
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
