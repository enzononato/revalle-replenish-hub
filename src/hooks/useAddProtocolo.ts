import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Protocolo } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Lightweight hook to insert a protocolo directly into the database.
 * Does NOT load all protocolos — use this in contexts that only need to create.
 */
export function useAddProtocolo() {
  const addProtocolo = useCallback(async (protocolo: Protocolo): Promise<Protocolo> => {
    const dbData = {
      numero: protocolo.numero,
      motorista_id: protocolo.motorista.id,
      motorista_nome: protocolo.motorista.nome,
      motorista_codigo: protocolo.motorista.codigo,
      motorista_whatsapp: protocolo.motorista.whatsapp,
      motorista_email: protocolo.motorista.email || null,
      motorista_unidade: protocolo.motorista.unidade || null,
      data: protocolo.data,
      hora: protocolo.hora,
      status: protocolo.status,
      validacao: protocolo.validacao,
      lancado: protocolo.lancado,
      enviado_lancar: protocolo.enviadoLancar,
      enviado_encerrar: protocolo.enviadoEncerrar,
      tipo_reposicao: protocolo.tipoReposicao || null,
      causa: protocolo.causa || null,
      mapa: protocolo.mapa || null,
      codigo_pdv: protocolo.codigoPdv || null,
      nota_fiscal: protocolo.notaFiscal || null,
      produtos: protocolo.produtos || null,
      fotos_protocolo: protocolo.fotosProtocolo || null,
      observacao_geral: protocolo.observacaoGeral || null,
      observacoes_log: protocolo.observacoesLog || null,
      mensagem_encerramento: protocolo.mensagemEncerramento || null,
      arquivo_encerramento: protocolo.arquivoEncerramento || null,
      oculto: protocolo.oculto ?? false,
      habilitar_reenvio: protocolo.habilitarReenvio ?? false,
      created_at: protocolo.createdAt,
      enviado_lancar_status: protocolo.enviadoLancarStatus || 'pendente',
      enviado_lancar_erro: protocolo.enviadoLancarErro || null,
      enviado_encerrar_status: protocolo.enviadoEncerrarStatus || 'pendente',
      enviado_encerrar_erro: protocolo.enviadoEncerrarErro || null,
      cliente_telefone: protocolo.clienteTelefone || null,
      contato_whatsapp: protocolo.contatoWhatsapp || null,
      contato_email: protocolo.contatoEmail || null,
      status_envio: protocolo.statusEnvio || 'pendente',
      status_encerramento: protocolo.statusEncerramento || 'pendente',
      encerrado_por_tipo: protocolo.encerradoPorTipo || null,
      encerrado_por_motorista_id: protocolo.encerradoPorMotoristaId || null,
      encerrado_por_motorista_nome: protocolo.encerradoPorMotoristaNome || null,
      foto_nota_fiscal_encerramento: protocolo.fotoNotaFiscalEncerramento || null,
      foto_entrega_mercadoria: protocolo.fotoEntregaMercadoria || null,
    };

    const { data, error } = await supabase
      .from('protocolos')
      .insert(dbData as never)
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao adicionar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar protocolo no banco de dados',
        variant: 'destructive',
      });
      throw error;
    }

    return { ...protocolo, id: data.id };
  }, []);

  return { addProtocolo };
}
