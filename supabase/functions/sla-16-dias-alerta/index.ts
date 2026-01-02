import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para calcular a diferença em dias entre duas datas
function calcularDiferencaDias(dataProtocolo: string): number {
  // data vem no formato DD/MM/YYYY
  const parts = dataProtocolo.split('/');
  if (parts.length !== 3) return 0;
  
  const dia = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
  const ano = parseInt(parts[2], 10);
  
  const dataProtocoloDate = new Date(ano, mes, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataProtocoloDate.setHours(0, 0, 0, 0);
  
  const diffTime = hoje.getTime() - dataProtocoloDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Iniciando verificação de protocolos com SLA de 16 dias...');

    // Buscar protocolos abertos ou em andamento que ainda não tiveram o alerta enviado
    const { data: protocolos, error: fetchError } = await supabase
      .from('protocolos')
      .select('*')
      .in('status', ['aberto', 'em_andamento'])
      .eq('sla_16_enviado', false)
      .eq('oculto', false);

    if (fetchError) {
      console.error('Erro ao buscar protocolos:', fetchError);
      throw fetchError;
    }

    console.log(`Encontrados ${protocolos?.length || 0} protocolos para verificar`);

    const protocolosAlertados: string[] = [];
    const erros: string[] = [];

    for (const protocolo of protocolos || []) {
      const diasSla = calcularDiferencaDias(protocolo.data);
      
      console.log(`Protocolo ${protocolo.numero}: ${diasSla} dias de SLA`);

      // Verificar se atingiu 16 dias
      if (diasSla >= 16) {
        console.log(`Protocolo ${protocolo.numero} atingiu 16 dias de SLA. Enviando webhook...`);

        // Montar o payload do webhook (mesmo formato da criação)
        const webhookPayload = {
          tipo: 'alerta_sla_16_dias',
          numero: protocolo.numero,
          data: protocolo.data,
          hora: protocolo.hora,
          mapa: protocolo.mapa || '',
          codigoPdv: protocolo.codigo_pdv || '',
          notaFiscal: protocolo.nota_fiscal || '',
          motoristaNome: protocolo.motorista_nome,
          motoristaCodigo: protocolo.motorista_codigo || '',
          motoristaWhatsapp: protocolo.motorista_whatsapp || '',
          motoristaEmail: protocolo.motorista_email || '',
          unidade: protocolo.motorista_unidade || '',
          tipoReposicao: protocolo.tipo_reposicao || '',
          causa: protocolo.causa || '',
          produtos: protocolo.produtos || [],
          fotos: protocolo.fotos_protocolo || {},
          whatsappContato: protocolo.contato_whatsapp || '',
          emailContato: protocolo.contato_email || '',
          observacaoGeral: protocolo.observacao_geral || '',
          // Campos adicionais do alerta SLA
          alertaSla16Dias: true,
          diasSla: diasSla,
          motivoEnvio: 'SLA_16_DIAS',
          mensagemAlerta: `Protocolo ${protocolo.numero} atingiu ${diasSla} dias sem encerramento (SLA 16 dias)`
        };

        try {
          // Enviar para o webhook
          const webhookResponse = await fetch('https://n8n.revalle.com.br/webhook/reposicaowpp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });

          if (webhookResponse.ok) {
            console.log(`Webhook enviado com sucesso para protocolo ${protocolo.numero}`);

            // Atualizar o protocolo para marcar que o alerta foi enviado
            const { error: updateError } = await supabase
              .from('protocolos')
              .update({
                sla_16_enviado: true,
                sla_16_enviado_at: new Date().toISOString()
              })
              .eq('id', protocolo.id);

            if (updateError) {
              console.error(`Erro ao atualizar protocolo ${protocolo.numero}:`, updateError);
              erros.push(`Erro ao atualizar ${protocolo.numero}: ${updateError.message}`);
            } else {
              protocolosAlertados.push(protocolo.numero);
            }
          } else {
            const errorText = await webhookResponse.text();
            console.error(`Erro ao enviar webhook para ${protocolo.numero}:`, webhookResponse.status, errorText);
            erros.push(`Webhook falhou para ${protocolo.numero}: ${webhookResponse.status}`);
          }
        } catch (webhookError: unknown) {
          const errorMessage = webhookError instanceof Error ? webhookError.message : String(webhookError);
          console.error(`Erro ao enviar webhook para ${protocolo.numero}:`, webhookError);
          erros.push(`Erro webhook ${protocolo.numero}: ${errorMessage}`);
        }
      }
    }

    const resultado = {
      sucesso: true,
      protocolosVerificados: protocolos?.length || 0,
      protocolosAlertados,
      quantidadeAlertados: protocolosAlertados.length,
      erros,
      executadoEm: new Date().toISOString()
    };

    console.log('Resultado da verificação:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Erro na função sla-16-dias-alerta:', error);
    return new Response(JSON.stringify({ 
      sucesso: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
