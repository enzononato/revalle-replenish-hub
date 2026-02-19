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
      const termoNumerico = termo.length === 1 && !isNaN(Number(termo));
      if ((termo.length < 1) || (termo.length < 2 && !termoNumerico) || !unidade) {
        setPdvs([]);
        return;
      }

      const unidadeCodigo = getUnidadeCodigo(unidade);

      setIsLoading(true);
      try {
        // Dois queries em paralelo: match exato + match parcial (sem o exato)
        const [exactResult, partialResult] = await Promise.all([
          supabase
            .from('pdvs')
            .select('codigo, nome, bairro, cidade, endereco')
            .eq('unidade', unidadeCodigo)
            .eq('codigo', termo)
            .limit(1),
          supabase
            .from('pdvs')
            .select('codigo, nome, bairro, cidade, endereco')
            .eq('unidade', unidadeCodigo)
            .or(`codigo.ilike.%${termo}%,nome.ilike.%${termo}%`)
            .neq('codigo', termo)
            .limit(19),
        ]);

        if (exactResult.error) throw exactResult.error;
        if (partialResult.error) throw partialResult.error;

        const combined = [
          ...(exactResult.data || []),
          ...(partialResult.data || []),
        ];

        const sorted = combined.sort((a, b) => {
          const numA = parseInt(a.codigo, 10);
          const numB = parseInt(b.codigo, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.codigo.localeCompare(b.codigo);
        });
        setPdvs(sorted);
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
