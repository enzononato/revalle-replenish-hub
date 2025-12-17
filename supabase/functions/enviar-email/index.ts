import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Configuração SMTP
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.revalle.com.br";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT")) || 465;
const SMTP_USER = Deno.env.get("SMTP_USER") || "reposicao@revalle.com.br";
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Produto {
  codigo: string;
  nome: string;
  quantidade: number;
  unidade: string;
  validade?: string;
  observacao?: string;
}

interface FotosProtocolo {
  fotoMotoristaPdv?: string;
  fotoLoteProduto?: string;
  fotoAvaria?: string;
}

interface EnviarEmailRequest {
  tipo: 'lancar' | 'encerrar';
  numero: string;
  data: string;
  hora: string;
  mapa?: string;
  codigoPdv?: string;
  notaFiscal?: string;
  motoristaNome: string;
  unidadeNome?: string;
  tipoReposicao?: string;
  causa?: string;
  produtos?: Produto[];
  fotosProtocolo?: FotosProtocolo;
  clienteEmail: string;
  observacaoGeral?: string;
  mensagemEncerramento?: string;
}

function formatarProdutosHTML(produtos: Produto[]): string {
  if (!produtos || produtos.length === 0) return '';
  
  const rows = produtos.map(p => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.codigo}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.nome}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${p.quantidade} ${p.unidade}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${p.validade || '-'}</td>
      <td style="padding: 8px; border: 1px solid #e5e7eb;">${p.observacao || '-'}</td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Código</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Produto</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Qtd</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Validade</th>
          <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Obs</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function formatarFotosHTML(fotos?: FotosProtocolo): string {
  if (!fotos) return '';
  
  const fotosLinks: string[] = [];
  
  if (fotos.fotoMotoristaPdv) {
    fotosLinks.push(`<a href="${fotos.fotoMotoristaPdv}" style="color: #2563eb; text-decoration: underline;">📷 Foto Motorista/PDV</a>`);
  }
  if (fotos.fotoLoteProduto) {
    fotosLinks.push(`<a href="${fotos.fotoLoteProduto}" style="color: #2563eb; text-decoration: underline;">📷 Foto Lote/Produto</a>`);
  }
  if (fotos.fotoAvaria) {
    fotosLinks.push(`<a href="${fotos.fotoAvaria}" style="color: #2563eb; text-decoration: underline;">📷 Foto Avaria</a>`);
  }
  
  if (fotosLinks.length === 0) return '';
  
  return `
    <div style="margin: 16px 0;">
      <strong>📎 Fotos anexadas:</strong><br>
      ${fotosLinks.join('<br>')}
    </div>
  `;
}

function gerarEmailLancar(data: EnviarEmailRequest): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Revalle Distribuição</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Sistema de Protocolos</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0 0 8px 0; font-size: 18px;">📋 Novo Protocolo Aberto</h2>
            <p style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: bold;">#${data.numero}</p>
          </div>
          
          <table style="width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">📅 Data/Hora:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.data} às ${data.hora}
              </td>
            </tr>
            ${data.mapa ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🗺️ MAPA:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.mapa}
              </td>
            </tr>
            ` : ''}
            ${data.codigoPdv ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🏪 Código PDV:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.codigoPdv}
              </td>
            </tr>
            ` : ''}
            ${data.notaFiscal ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">📄 Nota Fiscal:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.notaFiscal}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">👤 Motorista:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.motoristaNome}
              </td>
            </tr>
            ${data.unidadeNome ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🏢 Unidade:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.unidadeNome}
              </td>
            </tr>
            ` : ''}
            ${data.tipoReposicao ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🔄 Tipo:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.tipoReposicao}
              </td>
            </tr>
            ` : ''}
            ${data.causa ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">❓ Causa:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.causa}
              </td>
            </tr>
            ` : ''}
          </table>
          
          ${data.produtos && data.produtos.length > 0 ? `
          <div style="margin-bottom: 24px;">
            <h3 style="color: #374151; margin: 0 0 12px 0;">📦 Produtos (${data.produtos.length})</h3>
            ${formatarProdutosHTML(data.produtos)}
          </div>
          ` : ''}
          
          ${formatarFotosHTML(data.fotosProtocolo)}
          
          ${data.observacaoGeral ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px;">
            <strong style="color: #92400e;">💬 Observação:</strong>
            <p style="color: #78350f; margin: 8px 0 0 0;">${data.observacaoGeral}</p>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            Este é um e-mail automático do Sistema de Protocolos Revalle.<br>
            Por favor, não responda diretamente a este e-mail.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function gerarEmailEncerrar(data: EnviarEmailRequest): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Revalle Distribuição</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px;">Sistema de Protocolos</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <div style="background-color: #d1fae5; border-left: 4px solid #059669; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #065f46; margin: 0 0 8px 0; font-size: 18px;">✅ Protocolo Encerrado</h2>
            <p style="color: #047857; margin: 0; font-size: 24px; font-weight: bold;">#${data.numero}</p>
          </div>
          
          <table style="width: 100%; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">📅 Data/Hora:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.data} às ${data.hora}
              </td>
            </tr>
            ${data.mapa ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🗺️ MAPA:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.mapa}
              </td>
            </tr>
            ` : ''}
            ${data.codigoPdv ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🏪 Código PDV:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.codigoPdv}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">👤 Motorista:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.motoristaNome}
              </td>
            </tr>
          </table>
          
          ${data.mensagemEncerramento ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin-top: 24px;">
            <strong style="color: #065f46;">📝 Mensagem de Encerramento:</strong>
            <p style="color: #047857; margin: 8px 0 0 0;">${data.mensagemEncerramento}</p>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            Este é um e-mail automático do Sistema de Protocolos Revalle.<br>
            Por favor, não responda diretamente a este e-mail.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EnviarEmailRequest = await req.json();
    
    console.log("Recebida solicitação de envio de e-mail:", {
      tipo: data.tipo,
      numero: data.numero,
      clienteEmail: data.clienteEmail
    });

    console.log("Configuração SMTP:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      hasPassword: !!SMTP_PASS
    });

    if (!data.clienteEmail) {
      console.error("E-mail do cliente não fornecido");
      return new Response(
        JSON.stringify({ success: false, error: "E-mail do cliente não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SMTP_PASS) {
      console.error("Senha SMTP não configurada");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração SMTP incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assunto = data.tipo === 'lancar' 
      ? `📋 Novo Protocolo #${data.numero} - Revalle` 
      : `✅ Protocolo #${data.numero} Encerrado - Revalle`;

    const htmlContent = data.tipo === 'lancar' 
      ? gerarEmailLancar(data) 
      : gerarEmailEncerrar(data);

    console.log("Enviando e-mail para:", data.clienteEmail);

    // Configurar cliente SMTP
    const client = new SmtpClient();

    console.log("Conectando ao servidor SMTP...");

    // Conectar com TLS (porta 465)
    await client.connectTLS({
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      username: SMTP_USER,
      password: SMTP_PASS,
    });

    console.log("Cliente SMTP conectado, iniciando envio...");

    // Enviar e-mail via SMTP
    await client.send({
      from: SMTP_USER,
      to: data.clienteEmail,
      subject: assunto,
      content: "Visualize este e-mail em um cliente que suporte HTML",
      html: htmlContent,
    });

    console.log("E-mail enviado, fechando conexão...");
    await client.close();
    
    console.log("E-mail enviado com sucesso via SMTP");

    return new Response(
      JSON.stringify({ success: true, message: "E-mail enviado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro na função enviar-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
