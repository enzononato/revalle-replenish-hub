import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { identificador, senha } = await req.json()

    if (!identificador || !senha) {
      return new Response(
        JSON.stringify({ error: 'Identificador e senha são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const identificadorLimpo = identificador.replace(/[.\-]/g, '').trim()
    const UNIDADE_PETROLINA = 'Revalle Petrolina'

    // Try CPF first (non-Petrolina units)
    const { data: porCpf, error: cpfError } = await supabaseAdmin
      .from('motoristas')
      .select('*')
      .eq('cpf', identificadorLimpo)
      .neq('unidade', UNIDADE_PETROLINA)
      .maybeSingle()

    if (cpfError) {
      // Log failed attempt
      await supabaseAdmin.from('motorista_login_logs').insert({
        identificador: identificadorLimpo,
        identificador_tipo: 'cpf',
        sucesso: false,
        erro: `Erro na busca: ${cpfError.message}`,
      })
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar motorista. Contate o suporte.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (porCpf) {
      if (porCpf.senha !== senha) {
        await supabaseAdmin.from('motorista_login_logs').insert({
          identificador: identificadorLimpo,
          identificador_tipo: 'cpf',
          sucesso: false,
          erro: 'Senha incorreta',
          motorista_id: porCpf.id,
          motorista_nome: porCpf.nome,
          unidade: porCpf.unidade,
        })
        return new Response(
          JSON.stringify({ error: 'Senha incorreta' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      await supabaseAdmin.from('motorista_login_logs').insert({
        identificador: identificadorLimpo,
        identificador_tipo: 'cpf',
        sucesso: true,
        motorista_id: porCpf.id,
        motorista_nome: porCpf.nome,
        unidade: porCpf.unidade,
      })

      // Return motorista WITHOUT senha
      const { senha: _, cpf: __, ...safeMotorist } = porCpf
      return new Response(
        JSON.stringify({ motorista: safeMotorist }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try by codigo (Petrolina only)
    const { data: porCodigo, error: codError } = await supabaseAdmin
      .from('motoristas')
      .select('*')
      .eq('codigo', identificador)
      .eq('unidade', UNIDADE_PETROLINA)
      .maybeSingle()

    if (codError || !porCodigo) {
      await supabaseAdmin.from('motorista_login_logs').insert({
        identificador: identificadorLimpo,
        identificador_tipo: 'codigo',
        sucesso: false,
        erro: codError ? `Erro: ${codError.message}` : 'Motorista não encontrado',
      })
      return new Response(
        JSON.stringify({ error: 'CPF ou código de motorista não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (porCodigo.senha !== senha) {
      await supabaseAdmin.from('motorista_login_logs').insert({
        identificador: identificador,
        identificador_tipo: 'codigo',
        sucesso: false,
        erro: 'Senha incorreta',
        motorista_id: porCodigo.id,
        motorista_nome: porCodigo.nome,
        unidade: porCodigo.unidade,
      })
      return new Response(
        JSON.stringify({ error: 'Senha incorreta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    await supabaseAdmin.from('motorista_login_logs').insert({
      identificador: identificador,
      identificador_tipo: 'codigo',
      sucesso: true,
      motorista_id: porCodigo.id,
      motorista_nome: porCodigo.nome,
      unidade: porCodigo.unidade,
    })

    const { senha: _, cpf: __, ...safeMotorist } = porCodigo
    return new Response(
      JSON.stringify({ motorista: safeMotorist }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
