import bcrypt from 'npm:bcryptjs@2.4.3'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createAdminClient } from '../_shared/admin.ts'
import { corsHeaders, isOptions, jsonResponse } from '../_shared/http.ts'

declare const Deno: { serve(handler: (request: Request) => Response | Promise<Response>): void }

function validBody(value: unknown): value is { team_id: string; access_code: string } {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  return typeof input.team_id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.team_id)
    && typeof input.access_code === 'string'
    && input.access_code.length >= 8
    && input.access_code.length <= 128
}

Deno.serve(async (request) => {
  if (isOptions(request)) return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publicApiKey = request.headers.get('apikey')
    if (!token || !supabaseUrl || !publicApiKey) return jsonResponse({ error: 'Organizer authorization required.' }, 401)

    const admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return jsonResponse({ error: 'Organizer authorization required.' }, 401)

    const organizerClient = createClient(supabaseUrl, publicApiKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    })
    const { data: role, error: roleError } = await organizerClient
      .from('organizer_roles').select('user_id').eq('user_id', authData.user.id).eq('role', 'organizer').maybeSingle()
    if (roleError) return jsonResponse({ error: 'Authorization could not be verified.' }, 503)
    if (!role) return jsonResponse({ error: 'Organizer authorization required.' }, 403)

    const body = await request.json()
    if (!validBody(body)) return jsonResponse({ error: 'Team access-code details are invalid.' }, 400)
    const { data: team, error: teamError } = await admin.from('teams')
      .select('id,status').eq('id', body.team_id).maybeSingle()
    if (teamError) return jsonResponse({ error: 'Team access could not be updated.' }, 503)
    if (!team || team.status === 'rejected' || team.status === 'disqualified') {
      return jsonResponse({ error: 'This team cannot receive an access-code reset.' }, 404)
    }

    const hash = await bcrypt.hash(body.access_code, 12)
    const { error: resetError } = await admin.rpc('reset_team_access_code_record', {
      p_team_id: team.id,
      p_access_code_hash: hash,
      p_actor_user_id: authData.user.id,
    })
    if (resetError) return jsonResponse({ error: 'Team access could not be updated.' }, 503)
    return jsonResponse({ ok: true }, 200)
  } catch {
    return jsonResponse({ error: 'Team access could not be updated.' }, 500)
  }
})
