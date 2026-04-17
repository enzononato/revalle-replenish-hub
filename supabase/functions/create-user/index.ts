import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
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

    const { email, password, nome, nivel, unidades } = await req.json()

    if (!email || !password || !nome || !nivel || !unidades) {
      return jsonResponse({ error: 'Campos obrigatórios faltando' }, 400)
    }

    // Try to create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    let userId: string

    if (authError) {
      if (authError.message.includes('already been registered')) {
        // User already exists in Auth — paginate listUsers to find by email
        let existingUser: { id: string; email?: string } | undefined
        let page = 1
        const perPage = 1000
        const emailLower = email.toLowerCase()

        while (!existingUser) {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

          if (listError) {
            console.error('listUsers error on page', page, ':', listError.message)
            break
          }

          const users = listData?.users ?? []
          existingUser = users.find((u: { email?: string }) => u.email?.toLowerCase() === emailLower)

          if (existingUser || users.length < perPage) break
          page += 1
          if (page > 20) break // safety: max 20k users
        }

        if (!existingUser) {
          console.error('User not found in Auth pagination for email:', email)
          // Try updating password to "reset" — maybe email exists but unfindable; ask user to use different email
          return jsonResponse({ 
            error: 'Este email já está cadastrado no sistema de autenticação mas não foi possível localizar o registro. Entre em contato com o suporte.',
            reason: 'EMAIL_EXISTS'
          })
        }

        userId = existingUser.id

        // Upsert profile
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

        // Upsert role
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

        return jsonResponse({ success: true, userId, skipped: true, reason: 'EMAIL_EXISTS' })
      }
      
      // Other auth error
      console.error('Auth error:', authError.message)
      return jsonResponse({ error: authError.message })
    }

    if (!authData.user) {
      return jsonResponse({ error: 'Falha ao criar usuário' })
    }

    userId = authData.user.id

    // Wait for trigger to create user_profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update the user_profile
    await supabaseAdmin
      .from('user_profiles')
      .update({ nome, nivel, unidade: unidades.join(', ') })
      .eq('user_email', email)

    // Create user role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: nivel })

    return jsonResponse({ success: true, userId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Unhandled error in create-user:', message)
    // Always return 200 with error in body so frontend can read the message
    return jsonResponse({ error: message })
  }
})
