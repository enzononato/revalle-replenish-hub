import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Produto {
  codigo: string;
  nome: string;
  unidade: string;
  quantidade: number;
  validade: string;
}

interface FotosProtocolo {
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
}

interface EnviarWhatsAppRequest {
  tipo: 'lancar' | 'encerrar' | 'reabrir';
  numero: string;
  data: string;
  hora: string;
  mapa?: string;
  notaFiscal?: string;
  motoristaNome: string;
  motoristaWhatsapp?: string;
  motoristaEmail?: string;
  unidade?: string;
  observacaoGeral?: string;
  produtos?: Produto[];
  fotosProtocolo?: FotosProtocolo;
  mensagemEncerramento?: string;
  clienteTelefone: string;
  // Campos para reabertura
  motivoReabertura?: string;
  usuarioReabertura?: string;
}

function formatMensagemLancar(data: EnviarWhatsAppRequest): string {
  let mensagem = `🆔 Protocolo: ${data.numero}
📆 Data: ${data.data}
⏰ Horário: ${data.hora}
📋 MAPA: ${data.mapa || '-'}
📦 NF: ${data.notaFiscal || '-'}
👤 Motorista: ${data.motoristaNome}
🏭 Unidade: ${data.unidade || '-'}
📧 ${data.motoristaEmail || '-'}
📞 ${data.motoristaWhatsapp || '-'}
📝 Obs: ${data.observacaoGeral || '-'}

`;

  // Adicionar produtos
  if (data.produtos && data.produtos.length > 0) {
    data.produtos.forEach(p => {
      mensagem += `Produto: ${p.codigo} ${p.nome} (${p.unidade}) | ${String(p.quantidade).padStart(2, '0')} UND
Validade: ${p.validade}

`;
    });
  }

  // Adicionar fotos
  if (data.fotosProtocolo) {
    if (data.fotosProtocolo.fotoMotoristaPdv) {
      mensagem += `📸 Motorista:
${data.fotosProtocolo.fotoMotoristaPdv}

`;
    }
    if (data.fotosProtocolo.fotoLoteProduto) {
      mensagem += `📦 Lote:
${data.fotosProtocolo.fotoLoteProduto}

`;
    }
    if (data.fotosProtocolo.fotoAvaria) {
      mensagem += `⚠️ Avaria:
${data.fotosProtocolo.fotoAvaria}

`;
    }
  }

  return mensagem.trim();
}

function formatMensagemEncerrar(data: EnviarWhatsAppRequest): string {
  return `📦 Revalle - Encerramento de Protocolo

✅ Protocolo: ${data.numero}
🧾 NF: ${data.notaFiscal || '-'}
👤 Motorista: ${data.motoristaNome}
🏭 Unidade: ${data.unidade || '-'}
📅 Data: ${data.data}

🗒️ Mensagem: ${data.mensagemEncerramento || 'Encerrando protocolo'}

⚙️ Status: Encerrado com sucesso.`;
}

function formatMensagemReabrir(data: EnviarWhatsAppRequest): string {
  return `🔄 Revalle - Reabertura de Protocolo

⚠️ Protocolo: ${data.numero}
🧾 NF: ${data.notaFiscal || '-'}
👤 Motorista: ${data.motoristaNome}
🏭 Unidade: ${data.unidade || '-'}
📅 Data: ${data.data}
⏰ Horário: ${data.hora}

🔓 Reaberto por: ${data.usuarioReabertura || '-'}
📝 Motivo: ${data.motivoReabertura || 'Não informado'}

⚙️ Status: Protocolo reaberto para tratativa.`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.error('Missing Evolution API configuration');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração da Evolution API não encontrada. Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: EnviarWhatsAppRequest = await req.json();
    console.log('Recebendo requisição para enviar WhatsApp:', data.tipo, 'para', data.clienteTelefone);

    // Formatar mensagem baseado no tipo
    let mensagem: string;
    if (data.tipo === 'lancar') {
      mensagem = formatMensagemLancar(data);
    } else if (data.tipo === 'reabrir') {
      mensagem = formatMensagemReabrir(data);
    } else {
      mensagem = formatMensagemEncerrar(data);
    }

    // Formatar número (remover caracteres especiais e adicionar código do país se necessário)
    let numero = data.clienteTelefone.replace(/\D/g, '');
    if (!numero.startsWith('55')) {
      numero = '55' + numero;
    }

    console.log('Enviando mensagem para:', numero);
    console.log('Mensagem:', mensagem.substring(0, 100) + '...');

    // Enviar via Evolution API
    const evolutionUrl = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    console.log('Evolution URL:', evolutionUrl);

    const response = await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: numero,
        text: mensagem,
      }),
    });

    const responseText = await response.text();
    console.log('Evolution API response status:', response.status);
    console.log('Evolution API response:', responseText);

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} - ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        data: result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
