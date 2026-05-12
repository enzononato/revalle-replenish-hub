import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PedidoRow {
  cod_pdv: string;
  nome_pdv?: string;
  telefone_pdv?: string;
  status_pedido?: string;
  mensagem_cliente?: string;
}

const INTERVAL_MS = 10_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Identify user (best-effort)
    let enviadoPor: string | null = null;
    const auth = req.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
      enviadoPor = data.user?.email ?? null;
    }

    const body = await req.json();
    const rows: PedidoRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const nomeArquivo: string | null = body?.nome_arquivo ?? null;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhuma linha enviada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create batch
    const { data: lote, error: loteErr } = await supabase
      .from('alteracao_pedidos_lote')
      .insert({
        nome_arquivo: nomeArquivo,
        total: rows.length,
        enviados: 0,
        falhas: 0,
        status: 'processando',
        enviado_por: enviadoPor,
      })
      .select('id')
      .single();

    if (loteErr || !lote) throw loteErr ?? new Error('Falha ao criar lote');

    const now = Date.now();
    const items = rows.map((r, i) => ({
      lote_id: lote.id,
      cod_pdv: r.cod_pdv ?? '',
      nome_pdv: r.nome_pdv ?? null,
      telefone_pdv: r.telefone_pdv ?? null,
      status_pedido: r.status_pedido ?? null,
      mensagem_cliente: r.mensagem_cliente ?? null,
      status: 'pending',
      sucesso: true,
      scheduled_at: new Date(now + i * INTERVAL_MS).toISOString(),
      enviado_por: enviadoPor,
    }));

    // Insert in chunks to avoid payload limits
    const CHUNK = 500;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
      const { error } = await supabase.from('alteracao_pedidos_log').insert(slice);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, lote_id: lote.id, total: rows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('enfileirar-alteracoes erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
