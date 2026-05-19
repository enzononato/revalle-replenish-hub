import { supabase } from '@/integrations/supabase/client';

export type TipoProtocoloGeracao = 'reposicao' | 'pos_rota' | 'troca' | 'venda';

/**
 * Gera o número do protocolo no backend via RPC `generate_protocolo_numero`.
 * Garante prefixo correto por tipo/causa e unicidade (UNIQUE INDEX em protocolos.numero).
 *
 * Prefixos:
 * - reposicao + causa "avaria"     => RPA
 * - reposicao + causa "falta"      => RPF
 * - reposicao + causa "inversao"   => RPI
 * - reposicao + outra causa        => RP + inicial
 * - pos_rota                       => POSROTA
 * - troca                          => TROCA
 * - venda                          => VENDA
 */
export async function gerarNumeroProtocolo(
  tipo: TipoProtocoloGeracao,
  causa?: string | null
): Promise<string> {
  const { data, error } = await supabase.rpc('generate_protocolo_numero', {
    p_tipo: tipo,
    p_causa: causa ?? null,
  });

  if (error || !data) {
    console.error('Falha ao gerar número de protocolo:', error);
    throw error ?? new Error('Falha ao gerar número de protocolo');
  }

  return data as string;
}
