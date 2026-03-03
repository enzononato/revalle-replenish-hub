import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookUrl = 'https://n8n.revalle.com.br/webhook/reposicaowpp';

    const webhookPayload = {
      tipo: 'alerta_sla_16_dias',
      numero: 'PROTOC-20260303075840653',
      data: '03/03/2026',
      hora: '07:58:40',
      mapa: '111',
      codigoPdv: '11',
      notaFiscal: '1',
      motoristaNome: 'THIAGO PINHEIRO DA SILVA',
      motoristaCodigo: '146558',
      motoristaWhatsapp: '',
      motoristaEmail: '',
      unidade: 'Revalle Juazeiro',
      tipoReposicao: 'FALTA',
      causa: 'FALTA DE PALLET FECHADO',
      produtos: [
        { nome: 'COLORADO APPIA ONE WAY 600ML CX C-12 ARTE (UN', codigo: '14550', unidade: 'CX', quantidade: 1 },
        { nome: 'STELLA ARTOIS LONG NECK 330ML SIX-PACK SHRINK C/4 (UN', codigo: '18807', unidade: 'UND', quantidade: 4 }
      ],
      fotos: {
        fotoLoteProduto: 'https://reposicao.revalle.com.br/functions/v1/foto-proxy/PROTOC-20260303075840653/lote_produto_1772535520796.jpeg',
        fotoMotoristaPdv: 'https://reposicao.revalle.com.br/functions/v1/foto-proxy/PROTOC-20260303075840653/motorista_pdv_1772535520733.jpeg'
      },
      whatsappContato: '(81) 98741-0821',
      emailContato: 'enzononats10@gmail.com',
      observacaoGeral: 'testeobs',
      // Campos SLA
      alertaSla: true,
      diasAberto: 16,
      ultimoAlertaEm: 0,
      motivoEnvio: 'SLA_16_DIAS',
      mensagemAlerta: 'Protocolo PROTOC-20260303075840653 atingiu 16 dias sem encerramento (SLA 16 dias) - TESTE',
      gestorNome: '',
      gestorWhatsapp: '',
    };

    console.log('Enviando webhook SLA de teste:', JSON.stringify(webhookPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();

    return new Response(JSON.stringify({
      sucesso: response.ok,
      status: response.status,
      resposta: responseText,
      payloadEnviado: webhookPayload,
      executadoEm: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
