import { supabase } from '@/integrations/supabase/client';
import { Protocolo } from '@/types';
import { format } from 'date-fns';

/**
 * Cria automaticamente uma "sobra" (protocolo do tipo pos_rota) vinculada a um
 * protocolo de inversão ou avaria recém-criado.
 *
 * - Apenas tipos 'inversao' e 'avaria' geram sobra.
 * - O motorista, PDV, mapa e produtos são clonados do protocolo original.
 * - O número da sobra é derivado do número do protocolo (`<numero>-S`).
 * - O campo `protocolo_origem_id` faz a ligação com o protocolo que originou.
 * - Status inicial: `aberto` + `conferencia_status = 'pendente'`.
 *
 * Em caso de erro, registra no console e retorna `null` (não bloqueia o fluxo principal).
 */
export async function criarSobraDeProtocolo(original: Protocolo): Promise<string | null> {
  const tipo = (original.tipoReposicao || '').toLowerCase();
  if (tipo !== 'inversao' && tipo !== 'avaria') return null;

  try {
    const agora = new Date();
    const dataStr = format(agora, 'dd/MM/yyyy');
    const horaStr = format(agora, 'HH:mm');

    const tipoLabel = tipo === 'inversao' ? 'Inversão' : 'Avaria';

    const logInicial = {
      id: crypto.randomUUID(),
      usuarioNome: 'Sistema',
      usuarioId: 'system',
      data: dataStr,
      hora: horaStr,
      acao: 'Sobra gerada automaticamente',
      texto: `Sobra criada a partir do protocolo ${original.numero} (${tipoLabel}). Aguardando confirmação do conferente.`,
    };

    const sobraDB = {
      numero: `${original.numero}-S`,
      motorista_id: original.motorista.id,
      motorista_nome: original.motorista.nome,
      motorista_codigo: original.motorista.codigo,
      motorista_whatsapp: original.motorista.whatsapp,
      motorista_email: original.motorista.email || null,
      motorista_unidade: original.motorista.unidade || null,
      data: dataStr,
      hora: horaStr,
      status: 'aberto',
      validacao: false,
      lancado: false,
      enviado_lancar: false,
      enviado_encerrar: false,
      tipo_reposicao: 'pos_rota',
      causa: original.causa || tipoLabel,
      mapa: original.mapa || null,
      codigo_pdv: original.codigoPdv || null,
      nota_fiscal: original.notaFiscal || null,
      produtos: (original.produtos || []) as never,
      fotos_protocolo: {} as never,
      observacao_geral: `Sobra automática — origem: protocolo ${original.numero} (${tipoLabel}).`,
      observacoes_log: [logInicial] as never,
      oculto: false,
      habilitar_reenvio: false,
      created_at: agora.toISOString(),
      enviado_lancar_status: 'pendente',
      enviado_encerrar_status: 'pendente',
      status_envio: 'pendente',
      status_encerramento: 'pendente',
      protocolo_origem_id: original.id,
      conferencia_status: 'pendente',
      confirmacao_conferente: {} as never,
      ativo: true,
    };

    const { data, error } = await supabase
      .from('protocolos')
      .insert(sobraDB as never)
      .select('id')
      .single();

    if (error) {
      console.error('[criarSobraDeProtocolo] Erro ao criar sobra automática:', error);
      return null;
    }

    return (data as { id: string }).id;
  } catch (err) {
    console.error('[criarSobraDeProtocolo] Exceção ao criar sobra automática:', err);
    return null;
  }
}
