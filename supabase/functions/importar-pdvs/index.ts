import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PdvData {
  codigo: string;
  nome: string;
  bairro?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  unidade: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { pdvs, unidade } = await req.json() as { pdvs: PdvData[], unidade: string };

    if (!pdvs || !unidade) {
      return new Response(
        JSON.stringify({ error: 'pdvs e unidade são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar PDVs existentes dessa unidade
    await supabase
      .from('pdvs')
      .delete()
      .eq('unidade', unidade);

    // Inserir em lotes de 500
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < pdvs.length; i += batchSize) {
      const batch = pdvs.slice(i, i + batchSize).map(p => ({
        codigo: String(p.codigo).replace(/\./g, '').replace(/,/g, '').trim(),
        nome: p.nome?.trim() || 'SEM NOME',
        bairro: p.bairro?.trim() || null,
        cnpj: p.cnpj?.replace(/[^\d]/g, '').trim() || null,
        endereco: p.endereco?.trim() || null,
        cidade: p.cidade?.trim() || null,
        unidade: unidade.toUpperCase()
      }));

      const { error } = await supabase
        .from('pdvs')
        .insert(batch);

      if (error) {
        console.error('Erro ao inserir lote:', error);
        throw error;
      }

      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, total: inserted, unidade }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Erro:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
