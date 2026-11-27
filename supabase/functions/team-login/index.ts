import bcrypt from 'npm:bcryptjs@2.4.3'
import { createAdminClient, getServiceRoleKey } from '../_shared/admin.ts'
import { corsHeaders, isOptions, jsonResponse } from '../_shared/http.ts'

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): void
  env: { get(name: string): string | undefined }
}

const INVALID_LOGIN = { error: 'Team ID or access code was not recognized.' }
const DUMMY_BCRYPT_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

async function fingerprint(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function validInput(value: unknown): value is { team_code: string; access_code: string } {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  return typeof input.team_code === 'string'
    && input.team_code.trim().length > 0
    && input.team_code.trim().length <= 50
    && typeof input.access_code === 'string'
    && input.access_code.length > 0
    && input.access_code.length <= 128
}

Deno.serve(async (request) => {
  if (isOptions(request)) return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const body = await request.json()
    if (!validInput(body)) return jsonResponse(INVALID_LOGIN, 401)

    const teamCode = body.team_code.trim()
    const accessCode = body.access_code
    const serviceRoleKey = getServiceRoleKey()
    const admin = createAdminClient()
    // Use only the gateway-provided address. Client-controlled forwarding
    // headers would let callers rotate their own rate-limit identity.
    const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown'

    const [ipFingerprint, teamFingerprint, pairFingerprint] = await Promise.all([
      fingerprint(`ip:${clientIp}`, serviceRoleKey),
      fingerprint(`team:${teamCode}`, serviceRoleKey),
      fingerprint(`pair:${clientIp}:${teamCode}`, serviceRoleKey),
    ])

    const { data: throttleRows, error: throttleError } = await admin.rpc(
      'consume_team_login_rate_limit',
      {
        p_ip_fingerprint: ipFingerprint,
        p_team_fingerprint: teamFingerprint,
        p_pair_fingerprint: pairFingerprint,
      },
    )

    if (throttleError || !throttleRows?.length) {
      return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503)
    }
    const throttle = throttleRows[0] as { allowed: boolean; retry_after_seconds: number }
    if (!throttle.allowed) {
      return jsonResponse(
        { error: 'Too many sign-in attempts. Wait before trying again.' },
        429,
        { 'Retry-After': String(Math.max(1, throttle.retry_after_seconds)) },
      )
    }

    const { data: team, error: teamError } = await admin
      .from('teams')
      .select('id, auth_user_id, status, access_code_hash')
      .eq('team_code', teamCode)
      .maybeSingle()

    if (teamError) return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503)

    const candidateHash = team?.access_code_hash ?? DUMMY_BCRYPT_HASH
    let codeMatches = false
    try {
      codeMatches = await bcrypt.compare(accessCode, candidateHash)
    } catch {
      codeMatches = false
    }

    if (!team || !codeMatches || !['approved', 'active'].includes(team.status)) {
      return jsonResponse(INVALID_LOGIN, 401)
    }

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(team.auth_user_id)
    if (userError || !authUser.user?.email) {
      return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503)
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503)
    }

    // The one-time token is intentionally returned only in this response and never logged.
    return jsonResponse({ token_hash: linkData.properties.hashed_token })
  } catch {
    return jsonResponse({ error: 'Sign-in is temporarily unavailable.' }, 503)
  }
})
