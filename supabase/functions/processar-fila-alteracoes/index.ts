import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://n8n.revalle.com.br/webhook/alteracao_pedidos';
const BATCH_LIMIT = 6; // 60s / 10s per item

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Pick up pending items whose scheduled time has arrived
    const { data: items, error } = await supabase
      .from('alteracao_pedidos_log')
      .select('id, lote_id, cod_pdv, nome_pdv, telefone_pdv, status_pedido, mensagem_cliente, attempts')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) throw error;

    const processed = { ok: 0, fail: 0 };
    const loteCounts = new Map<string, { ok: number; fail: number }>();

    for (const item of items ?? []) {
      // Mark as in-flight by bumping attempts and locking via updated row.
      // Simple approach: we send then update.
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_pdv: item.cod_pdv,
            nome_pdv: item.nome_pdv,
            telefone_pdv: item.telefone_pdv,
            status_pedido: item.status_pedido,
            mensagem_cliente: item.mensagem_cliente,
            log_id: item.id,
            id_alteracao: item.id,
          }),
        });

        const ok = res.ok;
        const text = ok ? null : await res.text().catch(() => null);

        await supabase
          .from('alteracao_pedidos_log')
          .update({
            status: ok ? 'sent' : 'failed',
            sucesso: ok,
            erro_mensagem: ok ? null : (text ?? `HTTP ${res.status}`),
            attempts: (item.attempts ?? 0) + 1,
            sent_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (ok) processed.ok++; else processed.fail++;
        if (item.lote_id) {
          const c = loteCounts.get(item.lote_id) ?? { ok: 0, fail: 0 };
          if (ok) c.ok++; else c.fail++;
          loteCounts.set(item.lote_id, c);
        }
      } catch (e) {
        await supabase
          .from('alteracao_pedidos_log')
          .update({
            status: 'failed',
            sucesso: false,
            erro_mensagem: (e as Error).message,
            attempts: (item.attempts ?? 0) + 1,
            sent_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        processed.fail++;
        if (item.lote_id) {
          const c = loteCounts.get(item.lote_id) ?? { ok: 0, fail: 0 };
          c.fail++;
          loteCounts.set(item.lote_id, c);
        }
      }
    }

    // Update lote counters
    for (const [loteId, counts] of loteCounts) {
      const { data: lote } = await supabase
        .from('alteracao_pedidos_lote')
        .select('total, enviados, falhas')
        .eq('id', loteId)
        .single();

      if (!lote) continue;
      const enviados = (lote.enviados ?? 0) + counts.ok;
      const falhas = (lote.falhas ?? 0) + counts.fail;
      const status = enviados + falhas >= (lote.total ?? 0) ? 'concluido' : 'processando';

      await supabase
        .from('alteracao_pedidos_lote')
        .update({ enviados, falhas, status })
        .eq('id', loteId);
    }

    return new Response(
      JSON.stringify({ success: true, processed, picked: items?.length ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('processar-fila-alteracoes erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
