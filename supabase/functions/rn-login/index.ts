import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { cpf, senha } = await req.json()

    if (!cpf || !senha) {
      return new Response(
        JSON.stringify({ success: false, error: 'CPF e senha são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cpfLimpo = cpf.replace(/[.\-]/g, '').trim()

    const { data: representante, error: fetchError } = await supabaseAdmin
      .from('representantes')
      .select('*')
      .eq('cpf', cpfLimpo)
      .maybeSingle()

    if (fetchError) {
      console.error('[RN-LOGIN] Erro na busca:', fetchError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar representante. Contate o suporte.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!representante) {
      return new Response(
        JSON.stringify({ success: false, error: 'CPF não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (representante.senha !== senha) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha incorreta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { senha: _, ...safeRepresentante } = representante
    return new Response(
      JSON.stringify({ success: true, representante: safeRepresentante }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
