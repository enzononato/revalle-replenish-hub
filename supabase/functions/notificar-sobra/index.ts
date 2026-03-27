import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "mail.revalle.com.br";
const SMTP_PORT = 465;
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SobraPayload {
  numero: string;
  motorista_nome: string;
  motorista_unidade: string;
  mapa: string;
  tipo: string;
  codigo_pdv?: string;
  nota_fiscal?: string;
  observacao?: string;
  data: string;
  hora: string;
}

function encodeBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

function gerarHTMLSobra(data: SobraPayload): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Nova Sobra em Rota</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Registro de pós-rota requer tratamento</p>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 140px;">Nº Registro</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold; font-family: monospace;">${data.numero}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Data/Hora</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${data.data} às ${data.hora}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Motorista</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">${data.motorista_nome}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Unidade</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${data.motorista_unidade}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Mapa</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-weight: bold;">${data.mapa}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Tipo</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">
                <span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 13px;">${data.tipo}</span>
              </td>
            </tr>
            ${data.codigo_pdv ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">PDV</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${data.codigo_pdv}</td>
            </tr>` : ''}
            ${data.nota_fiscal ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Nota Fiscal</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${data.nota_fiscal}</td>
            </tr>` : ''}
            ${data.observacao ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Observação</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${data.observacao}</td>
            </tr>` : ''}
          </table>
          
          <div style="margin-top: 20px; padding: 16px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Ação necessária:</strong> Acesse o painel e trate esta sobra na seção "Sobras em Rota".
            </p>
          </div>
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

async function enviarEmailSMTP(to: string, subject: string, htmlBody: string): Promise<void> {
  console.log(`Enviando email para ${to}...`);
  
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
    return decoder.decode(buf.subarray(0, n));
  }

  async function write(cmd: string): Promise<void> {
    await conn.write(encoder.encode(cmd));
  }

  try {
    await read();
    await write(`EHLO localhost\r\n`);
    await read();
    await write(`AUTH LOGIN\r\n`);
    await read();
    await write(`${encodeBase64(SMTP_USER)}\r\n`);
    await read();
    await write(`${encodeBase64(SMTP_PASS)}\r\n`);
    const authResponse = await read();
    if (!authResponse.startsWith("235")) {
      throw new Error("Autenticação falhou: " + authResponse);
    }
    await write(`MAIL FROM:<${SMTP_USER}>\r\n`);
    await read();
    await write(`RCPT TO:<${to}>\r\n`);
    await read();
    await write(`DATA\r\n`);
    await read();

    const boundary = "----=_Part_" + Date.now();
    const emailHeaders = [
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
    ].join("\r\n");

    await write(emailHeaders + "\r\n");
    const sendResponse = await read();
    if (!sendResponse.startsWith("250")) {
      throw new Error("Falha ao enviar: " + sendResponse);
    }

    await write(`QUIT\r\n`);
    try { await read(); } catch {}
  } finally {
    try { conn.close(); } catch {}
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SobraPayload = await req.json();
    console.log("Notificação de sobra recebida:", payload.numero);

    // Buscar emails dos usuários com nível 'controle'
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: controleUsers, error: fetchError } = await supabase
      .from("user_profiles")
      .select("user_email, nome, email_contato")
      .eq("nivel", "controle");

    if (fetchError) {
      console.error("Erro ao buscar usuários controle:", fetchError);
      throw fetchError;
    }

    if (!controleUsers || controleUsers.length === 0) {
      console.log("Nenhum usuário controle encontrado para notificar.");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum usuário controle para notificar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `⚠️ Nova Sobra em Rota - ${payload.tipo} | Mapa ${payload.mapa} | ${payload.motorista_nome}`;
    const html = gerarHTMLSobra(payload);

    const resultados: { email: string; sucesso: boolean; erro?: string }[] = [];

    for (const user of controleUsers) {
      const email = user.email_contato || user.user_email;
      if (!email) continue;

      try {
        await enviarEmailSMTP(email, subject, html);
        resultados.push({ email, sucesso: true });
        console.log(`Email enviado para ${email}`);
      } catch (err) {
        console.error(`Erro ao enviar para ${email}:`, err);
        resultados.push({ email, sucesso: false, erro: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, resultados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro na notificação de sobra:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
