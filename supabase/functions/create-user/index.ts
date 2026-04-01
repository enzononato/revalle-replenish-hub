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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { email, password, nome, nivel, unidades } = await req.json()

    if (!email || !password || !nome || !nivel || !unidades) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Tentar criar usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    let userId: string

    if (authError) {
      if (authError.message.includes('already been registered')) {
        // Usuário já existe no auth — buscar o ID dele
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        
        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'Usuário reportado como existente mas não encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        userId = existing.id

        // Garantir que o user_profile existe
        const { data: profileExists } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('user_email', email)
          .maybeSingle()

        if (!profileExists) {
          await supabaseAdmin.from('user_profiles').insert({
            user_email: email,
            nome,
            nivel,
            unidade: unidades.join(', ')
          })
        } else {
          await supabaseAdmin.from('user_profiles').update({
            nome,
            nivel,
            unidade: unidades.join(', ')
          }).eq('user_email', email)
        }

        // Garantir que o user_role existe
        const { data: roleExists } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!roleExists) {
          await supabaseAdmin.from('user_roles').insert({
            user_id: userId,
            role: nivel
          })
        } else {
          await supabaseAdmin.from('user_roles').update({
            role: nivel
          }).eq('user_id', userId)
        }

        return new Response(
          JSON.stringify({ success: true, userId, skipped: true, reason: 'EMAIL_EXISTS' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('Falha ao criar usuário')
    }

    userId = authData.user.id

    // Aguardar o trigger criar o user_profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Atualizar o user_profile
    await supabaseAdmin
      .from('user_profiles')
      .update({
        nome,
        nivel,
        unidade: unidades.join(', ')
      })
      .eq('user_email', email)

    // Criar role do usuário
    await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: nivel
      })

    return new Response(
      JSON.stringify({ success: true, userId }),
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
