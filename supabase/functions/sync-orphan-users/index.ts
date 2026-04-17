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

interface AuthUser {
  id: string
  email?: string
  created_at?: string
  last_sign_in_at?: string
}

async function listAllAuthUsers(admin: ReturnType<typeof createClient>): Promise<AuthUser[]> {
  const all: AuthUser[] = []
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const users = (data?.users ?? []) as AuthUser[]
    all.push(...users)
    if (users.length < perPage) break
    page += 1
    if (page > 20) break
  }
  return all
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json().catch(() => ({}))
    const action = body.action as string

    // === LIST ORPHANS ===
    if (action === 'list') {
      const authUsers = await listAllAuthUsers(admin)

      const { data: profiles } = await admin
        .from('user_profiles')
        .select('user_email')

      const profileEmails = new Set(
        (profiles ?? []).map((p: { user_email: string }) => p.user_email.toLowerCase())
      )

      const orphans = authUsers
        .filter(u => u.email && !profileEmails.has(u.email.toLowerCase()))
        .map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        }))

      return jsonResponse({ success: true, orphans, total_auth: authUsers.length, total_profiles: profileEmails.size })
    }

    // === ADOPT ORPHAN (create profile + role) ===
    if (action === 'adopt') {
      const { user_id, email, nome, nivel, unidades } = body
      if (!user_id || !email || !nome || !nivel) {
        return jsonResponse({ error: 'Campos obrigatórios: user_id, email, nome, nivel' }, 400)
      }

      const unidadesStr = Array.isArray(unidades) ? unidades.join(', ') : (unidades || '')

      // Upsert profile
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('id')
        .eq('user_email', email)
        .maybeSingle()

      if (existingProfile) {
        await admin.from('user_profiles').update({
          nome, nivel, unidade: unidadesStr
        }).eq('user_email', email)
      } else {
        await admin.from('user_profiles').insert({
          user_email: email, nome, nivel, unidade: unidadesStr
        })
      }

      // Upsert role
      const { data: existingRole } = await admin
        .from('user_roles')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (existingRole) {
        await admin.from('user_roles').update({ role: nivel }).eq('user_id', user_id)
      } else {
        await admin.from('user_roles').insert({ user_id, role: nivel })
      }

      return jsonResponse({ success: true })
    }

    // === DELETE ORPHAN (remove from auth) ===
    if (action === 'delete') {
      const { user_id } = body
      if (!user_id) {
        return jsonResponse({ error: 'user_id obrigatório' }, 400)
      }

      const { error } = await admin.auth.admin.deleteUser(user_id)
      if (error) {
        return jsonResponse({ error: error.message }, 400)
      }

      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Ação inválida. Use: list, adopt ou delete' }, 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('sync-orphan-users error:', message)
    return jsonResponse({ error: message })
  }
})
