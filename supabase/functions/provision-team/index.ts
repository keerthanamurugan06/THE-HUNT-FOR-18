import bcrypt from 'npm:bcryptjs@2.4.3'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createAdminClient } from '../_shared/admin.ts'
import { corsHeaders, isOptions, jsonResponse } from '../_shared/http.ts'

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

type ProvisionInput = {
  event_id: string
  team_code: string
  team_name: string
  access_code: string
  participants?: { participant_name: string; participant_email?: string | null }[]
}

function validInput(value: unknown): value is ProvisionInput {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  const participantsValid = input.participants === undefined
    || (Array.isArray(input.participants) && input.participants.length <= 2
      && input.participants.every((participant) => participant && typeof participant === 'object'
        && typeof participant.participant_name === 'string'
        && participant.participant_name.trim().length > 0
        && participant.participant_name.trim().length <= 200
        && (participant.participant_email === undefined || participant.participant_email === null
          || (typeof participant.participant_email === 'string'
            && participant.participant_email.trim().length <= 320
            && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.participant_email.trim())))))
  return participantsValid
    && typeof input.event_id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.event_id)
    && typeof input.team_code === 'string'
    && input.team_code.trim().length > 0
    && input.team_code.trim().length <= 50
    && typeof input.team_name === 'string'
    && input.team_name.trim().length > 0
    && input.team_name.trim().length <= 200
    && typeof input.access_code === 'string'
    && input.access_code.length >= 8
    && input.access_code.length <= 128
}

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(48))
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function internalEmail(teamCode: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(teamCode))
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return { email: `team-${base64}@teams.huntfor18.invalid`, fingerprint: base64 }
}

async function findExistingProvisioningUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return { user: null, error: true }
    const user = data.users.find((candidate) => candidate.email === email)
    if (user) return { user, error: false }
    if (data.users.length < 1000) break
  }
  return { user: null, error: false }
}

async function reconcileFailedProvision(
  admin: ReturnType<typeof createAdminClient>,
  authUserId: string,
  teamCode: string,
) {
  try {
    const { data: mappedTeam, error: mappingError } = await admin
      .from('teams')
      .select('id, team_code, team_name, status')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (mappingError) {
      console.error('TEAM_PROVISION_COMPENSATION_SKIPPED')
      return jsonResponse({ error: 'Provisioning status is uncertain. Contact an organizer.' }, 503)
    }

    if (mappedTeam) {
      if (mappedTeam.team_code === teamCode) return jsonResponse({ team: mappedTeam }, 201)
      console.error('TEAM_PROVISION_COMPENSATION_SKIPPED')
      return jsonResponse({ error: 'Provisioning status is uncertain. Contact an organizer.' }, 503)
    }

    // Keep the Auth identity after a partial failure. A retry with the same Team ID
    // can safely reconcile it, while deleting an identity could discard linked data.
    console.error('TEAM_PROVISION_RETRYABLE_ORPHAN')
    return jsonResponse({ error: 'Provisioning did not finish. Retry with the same Team ID or contact an organizer.' }, 503)
  } catch {
    console.error('TEAM_PROVISION_COMPENSATION_SKIPPED')
    return jsonResponse({ error: 'Provisioning status is uncertain. Contact an organizer.' }, 503)
  }
}

Deno.serve(async (request) => {
  if (isOptions(request)) return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  let admin: ReturnType<typeof createAdminClient> | undefined
  let createdAuthUserId: string | undefined
  let teamCodeForReconciliation: string | undefined

  try {
    const bearer = request.headers.get('authorization')
    const token = bearer?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return jsonResponse({ error: 'Organizer authorization required.' }, 401)

    admin = createAdminClient()
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Organizer authorization required.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publicApiKey = request.headers.get('apikey')
    if (!supabaseUrl || !publicApiKey) {
      return jsonResponse({ error: 'Authorization could not be verified.' }, 503)
    }

    // Read the caller's role under their own JWT and the existing RLS policy.
    // The privileged Admin client is reserved for trusted provisioning work.
    const organizerClient = createClient(supabaseUrl, publicApiKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    })
    const { data: role, error: roleError } = await organizerClient
      .from('organizer_roles')
      .select('user_id')
      .eq('user_id', authData.user.id)
      .eq('role', 'organizer')
      .maybeSingle()

    if (roleError) return jsonResponse({ error: 'Authorization could not be verified.' }, 503)
    if (!role) return jsonResponse({ error: 'Organizer authorization required.' }, 403)

    const body = await request.json()
    if (!validInput(body)) return jsonResponse({ error: 'Team details are invalid.' }, 400)

    const teamCode = body.team_code.trim()
    teamCodeForReconciliation = teamCode
    const teamName = body.team_name.trim()
    const { data: existingTeam, error: existingTeamError } = await admin
      .from('teams')
      .select('id')
      .eq('team_code', teamCode)
      .maybeSingle()

    if (existingTeamError) return jsonResponse({ error: 'Team provisioning could not be completed.' }, 503)
    if (existingTeam) return jsonResponse({ error: 'That Team ID is already in use.' }, 409)

    const accessCodeHash = await bcrypt.hash(body.access_code, 12)
    const { email, fingerprint } = await internalEmail(teamCode)
    const { data: createdAuth, error: createAuthError } = await admin.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      app_metadata: { account_type: 'team', provisioning_fingerprint: fingerprint },
    })

    if (createAuthError || !createdAuth.user) {
      const existingAuth = await findExistingProvisioningUser(admin, email)
      if (existingAuth.error) return jsonResponse({ error: 'Team provisioning could not be completed.' }, 503)
      if (!existingAuth.user || existingAuth.user.app_metadata?.provisioning_fingerprint !== fingerprint) {
        return jsonResponse({ error: 'Team provisioning could not be completed.' }, 409)
      }

      createdAuthUserId = existingAuth.user.id
      const { error: resetError } = await admin.auth.admin.updateUserById(createdAuthUserId, {
        password: randomPassword(),
        email_confirm: true,
      })
      if (resetError) return await reconcileFailedProvision(admin, createdAuthUserId, teamCode)
    } else {
      createdAuthUserId = createdAuth.user.id
    }

    const { data: teamRows, error: provisionError } = await admin.rpc('provision_team_record_with_members', {
      p_event_id: body.event_id,
      p_team_code: teamCode,
      p_team_name: teamName,
      p_auth_user_id: createdAuthUserId,
      p_access_code_hash: accessCodeHash,
      p_actor_user_id: authData.user.id,
      p_members: body.participants ?? [],
    })

    if (!provisionError && teamRows?.length) {
      return jsonResponse({ team: teamRows[0] }, 201)
    }

    return await reconcileFailedProvision(admin, createdAuthUserId, teamCode)
  } catch {
    if (admin && createdAuthUserId && teamCodeForReconciliation) {
      return await reconcileFailedProvision(admin, createdAuthUserId, teamCodeForReconciliation)
    }
    return jsonResponse({ error: 'Team provisioning could not be completed.' }, 500)
  }
})
