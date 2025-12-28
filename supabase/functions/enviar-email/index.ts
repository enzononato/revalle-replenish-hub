import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Configuração SMTP
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.revalle.com.br";
const SMTP_PORT = 465;
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";

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
  tipo: 'lancar' | 'encerrar' | 'reabrir';
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
  // Campos para reabertura
  motivoReabertura?: string;
  usuarioReabertura?: string;
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
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Revalle Distribuição</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Sistema de Protocolos</p>
        </div>
        
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
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Revalle Distribuição</h1>
          <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 14px;">Sistema de Protocolos</p>
        </div>
        
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

function gerarEmailReabrir(data: EnviarEmailRequest): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚚 Revalle Distribuição</h1>
          <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 14px;">Sistema de Protocolos</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px;">🔄 Protocolo Reaberto</h2>
            <p style="color: #b45309; margin: 0; font-size: 24px; font-weight: bold;">#${data.numero}</p>
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
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #6b7280;">🔓 Reaberto por:</strong>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                ${data.usuarioReabertura || '-'}
              </td>
            </tr>
          </table>
          
          ${data.motivoReabertura ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-top: 24px;">
            <strong style="color: #92400e;">📝 Motivo da Reabertura:</strong>
            <p style="color: #b45309; margin: 8px 0 0 0;">${data.motivoReabertura}</p>
          </div>
          ` : ''}
        </div>
        
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

// Função para codificar em Base64
function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

// Cliente SMTP simplificado usando Deno.connectTls
async function enviarEmailSMTP(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  console.log(`Conectando a ${SMTP_HOST}:${SMTP_PORT}...`);
  
  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function read(): Promise<string> {
    const buf = new Uint8Array(1024);
    const n = await conn.read(buf);
    if (n === null) throw new Error("Connection closed");
    const response = decoder.decode(buf.subarray(0, n));
    console.log("< " + response.trim());
    return response;
  }

  async function write(cmd: string): Promise<void> {
    console.log("> " + cmd.trim());
    await conn.write(encoder.encode(cmd));
  }

  try {
    // Ler saudação do servidor
    await read();

    // EHLO
    await write(`EHLO localhost\r\n`);
    await read();

    // AUTH LOGIN
    await write(`AUTH LOGIN\r\n`);
    await read();

    // Username (Base64)
    await write(`${encodeBase64(SMTP_USER)}\r\n`);
    await read();

    // Password (Base64)
    await write(`${encodeBase64(SMTP_PASS)}\r\n`);
    const authResponse = await read();
    if (!authResponse.startsWith("235")) {
      throw new Error("Autenticação falhou: " + authResponse);
    }

    // MAIL FROM
    await write(`MAIL FROM:<${SMTP_USER}>\r\n`);
    await read();

    // RCPT TO
    await write(`RCPT TO:<${to}>\r\n`);
    await read();

    // DATA
    await write(`DATA\r\n`);
    await read();

    // Corpo do email
    const boundary = "----=_Part_" + Date.now();
    const emailContent = [
      `From: "Revalle Protocolos" <${SMTP_USER}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${encodeBase64(subject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      encodeBase64(htmlBody),
      ``,
      `--${boundary}--`,
      `.`,
      ``
    ].join("\r\n");

    await write(emailContent);
    await read();

    // QUIT
    await write(`QUIT\r\n`);
    await read();

  } finally {
    conn.close();
  }
}

const handler = async (req: Request): Promise<Response> => {
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

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.error("Configuração SMTP incompleta");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração SMTP incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let assunto: string;
    let htmlContent: string;
    
    if (data.tipo === 'lancar') {
      assunto = `📋 Novo Protocolo #${data.numero} - Revalle`;
      htmlContent = gerarEmailLancar(data);
    } else if (data.tipo === 'reabrir') {
      assunto = `🔄 Protocolo #${data.numero} Reaberto - Revalle`;
      htmlContent = gerarEmailReabrir(data);
    } else {
      assunto = `✅ Protocolo #${data.numero} Encerrado - Revalle`;
      htmlContent = gerarEmailEncerrar(data);
    }

    await enviarEmailSMTP(data.clienteEmail, assunto, htmlContent);

    console.log("E-mail enviado com sucesso!");

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
