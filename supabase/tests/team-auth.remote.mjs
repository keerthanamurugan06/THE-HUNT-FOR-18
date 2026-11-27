import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { createClient } from '@supabase/supabase-js'
import { createServer } from 'vite'

const projectRef = 'bfzlszktufjqlfiyknga'
const supabaseUrl = process.env.HUNT18_TEST_SUPABASE_URL
const publishableKey = process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY
const projectHost = `${projectRef}.supabase.co`

if (!supabaseUrl || new URL(supabaseUrl).hostname !== projectHost) {
  throw new Error('Refusing to run: test URL must identify the approved test project.')
}
if (!publishableKey || !serviceRoleKey) {
  throw new Error('Provide test-project API keys through process environment variables.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const createdAuthUsers = []
const createdTeamCodes = []
const teamClients = []
const cleanupProblems = []
let auditActorToRetain = null
let createdTestEventId = null
let currentCheck = 'test setup'

function report(name) {
  process.stdout.write(`PASS: ${name}\n`)
}

function randomAccessCode() {
  return `${randomUUID()}-Qa9!`
}

async function createTemporaryAuthUser(prefix) {
  const email = `${prefix}-${randomUUID()}@teams.huntfor18.invalid`
  const password = randomAccessCode()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  assert.ifError(error)
  assert.ok(data.user?.id)
  createdAuthUsers.push(data.user.id)

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const result = await client.auth.signInWithPassword({ email, password })
  assert.ifError(result.error)
  assert.ok(result.data.session)
  teamClients.push(client)
  return { client, user: data.user }
}

async function invokeProvision(token, payload) {
  const response = await fetch(`${supabaseUrl}/functions/v1/provision-team`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const rawBody = await response.text()
  let body = {}
  try { body = JSON.parse(rawBody) } catch { /* Record only response shape, never raw server diagnostics. */ }
  const bodyMessage = String(body.message ?? '').toLowerCase()
  const bodyMessageCategory = bodyMessage.includes('boot')
    ? 'boot-error'
    : bodyMessage.includes('jwt') || bodyMessage.includes('auth')
      ? 'auth-error'
      : bodyMessage.includes('function')
        ? 'function-error'
        : bodyMessage
          ? 'other-message'
          : 'no-message'
  return {
    status: response.status,
    body,
    contentType: response.headers.get('content-type') ?? 'unknown',
    bodyLength: rawBody.length,
    bodyKeys: Object.keys(body),
    bodyCode: typeof body.code === 'string' ? body.code : 'none',
    bodyMessageCategory,
  }
}

async function loginTeam(teamCode, accessCode) {
  const response = await fetch(`${supabaseUrl}/functions/v1/team-login`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ team_code: teamCode, access_code: accessCode }),
  })
  return { status: response.status, body: await response.json().catch(() => ({})) }
}

async function renderProtectedRoute(contextValue) {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  try {
    const [{ TeamAuthContext }, { default: RequireTeamAuth }, router] = await Promise.all([
      vite.ssrLoadModule('/src/context/team-auth-context.ts'),
      vite.ssrLoadModule('/src/components/RequireTeamAuth.tsx'),
      import('react-router-dom'),
    ])
    const { MemoryRouter, Route, Routes } = router
    const routeTree = React.createElement(
      MemoryRouter,
      { initialEntries: ['/round-1'] },
      React.createElement(
        Routes,
        null,
        React.createElement(
          Route,
          { element: React.createElement(RequireTeamAuth) },
          React.createElement(Route, {
            path: '/round-1',
            element: React.createElement('div', null, 'PROTECTED_ROUND_CONTENT'),
          }),
        ),
        React.createElement(Route, {
          path: '/team-login',
          element: React.createElement('div', null, 'TEAM_LOGIN_CONTENT'),
        }),
      ),
    )
    return renderToString(
      React.createElement(TeamAuthContext.Provider, { value: contextValue }, routeTree),
    )
  } finally {
    await vite.close()
  }
}

try {
  currentCheck = 'hosted Auth signup restriction'
  const authSettingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  })
  assert.equal(authSettingsResponse.status, 200)
  const authSettings = await authSettingsResponse.json()
  assert.equal(authSettings.disable_signup, true, 'Hosted Auth allows public signup.')
  report('hosted Auth signup is disabled')

  currentCheck = 'test event fixture setup'
  const { data: createdEvent, error: createEventError } = await admin
    .from('events')
    .insert({ name: `Temporary team-auth test ${randomUUID().slice(0, 8)}`, status: 'draft' })
    .select('id')
    .single()
  if (createEventError) currentCheck = `test event fixture setup (${createEventError.code ?? createEventError.name ?? 'unknown'})`
  assert.ifError(createEventError)
  assert.ok(createdEvent?.id)
  const event = createdEvent
  createdTestEventId = createdEvent.id

  currentCheck = 'organizer test identity setup'
  const organizer = await createTemporaryAuthUser('auth-test-organizer')
  const { error: roleInsertError } = await admin.from('organizer_roles').insert({
    user_id: organizer.user.id,
    role: 'organizer',
  })
  assert.ifError(roleInsertError)

  const nonOrganizer = await createTemporaryAuthUser('auth-test-nonorganizer')
  const organizerSession = (await organizer.client.auth.getSession()).data.session
  const nonOrganizerSession = (await nonOrganizer.client.auth.getSession()).data.session
  assert.ok(organizerSession?.access_token)
  assert.ok(nonOrganizerSession?.access_token)

  const teamOne = {
    event_id: event.id,
    team_code: `TEMP-AUTH-${randomUUID().slice(0, 8)}-A`,
    team_name: 'Temporary Authentication Test Team A',
    access_code: randomAccessCode(),
  }
  const teamTwo = {
    event_id: event.id,
    team_code: `TEMP-AUTH-${randomUUID().slice(0, 8)}-B`,
    team_name: 'Temporary Authentication Test Team B',
    access_code: randomAccessCode(),
  }
  createdTeamCodes.push(teamOne.team_code, teamTwo.team_code)

  currentCheck = 'unauthorized provisioning rejection'
  const unauthorizedCode = `TEMP-UNAUTHORIZED-${randomUUID().slice(0, 8)}`
  const unauthorized = await invokeProvision(nonOrganizerSession.access_token, {
    ...teamOne,
    team_code: unauthorizedCode,
  })
  if (unauthorized.status !== 403) {
    currentCheck = `unauthorized provisioning rejection (HTTP ${unauthorized.status}, ${unauthorized.contentType}, ${unauthorized.bodyLength} bytes, keys ${unauthorized.bodyKeys.join(',')}, code ${unauthorized.bodyCode}, ${unauthorized.bodyMessageCategory})`
  }
  assert.equal(unauthorized.status, 403)
  const { data: unauthorizedRows, error: unauthorizedLookupError } = await admin
    .from('teams')
    .select('id')
    .eq('team_code', unauthorizedCode)
  assert.ifError(unauthorizedLookupError)
  assert.equal(unauthorizedRows.length, 0)
  report('non-organizer provisioning rejected without creating an Auth-linked team')

  currentCheck = 'organizer provisioning'
  const unauthenticatedProvision = await fetch(`${supabaseUrl}/functions/v1/provision-team`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify(teamOne),
  })
  assert.equal(unauthenticatedProvision.status, 401)

  const provisionOne = await invokeProvision(organizerSession.access_token, teamOne)
  assert.equal(provisionOne.status, 201)
  // Append-only audit rows reference their actor with ON DELETE RESTRICT.
  // Keep this password-random synthetic organizer after removing its role.
  auditActorToRetain = organizer.user.id
  assert.ok(provisionOne.body.team?.id)
  const provisionTwo = await invokeProvision(organizerSession.access_token, teamTwo)
  assert.equal(provisionTwo.status, 201)
  assert.ok(provisionTwo.body.team?.id)
  report('organizer provisioning created two test teams')

  currentCheck = 'invalid credential and enumeration behavior'
  const invalidCode = await loginTeam(teamOne.team_code, randomAccessCode())
  const invalidTeam = await loginTeam(`NO-SUCH-${randomUUID().slice(0, 8)}`, randomAccessCode())
  assert.equal(invalidCode.status, 401)
  assert.equal(invalidTeam.status, 401)
  assert.deepEqual(invalidCode.body, invalidTeam.body)
  report('invalid access code and invalid Team ID return the same rejection')

  currentCheck = 'session creation and restoration'
  const storageEntries = new Map()
  const sessionStorage = {
    getItem: async (key) => storageEntries.get(key) ?? null,
    setItem: async (key, value) => { storageEntries.set(key, value) },
    removeItem: async (key) => { storageEntries.delete(key) },
  }
  const participantOne = createClient(supabaseUrl, publishableKey, {
    auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const participantTwo = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  teamClients.push(participantOne, participantTwo)

  const loginOne = await loginTeam(teamOne.team_code, teamOne.access_code)
  assert.equal(loginOne.status, 200)
  assert.equal(typeof loginOne.body.token_hash, 'string')
  const verifiedOne = await participantOne.auth.verifyOtp({ token_hash: loginOne.body.token_hash, type: 'magiclink' })
  assert.ifError(verifiedOne.error)
  assert.ok(verifiedOne.data.session)
  loginOne.body.token_hash = undefined

  const loginTwo = await loginTeam(teamTwo.team_code, teamTwo.access_code)
  assert.equal(loginTwo.status, 200)
  const verifiedTwo = await participantTwo.auth.verifyOtp({ token_hash: loginTwo.body.token_hash, type: 'magiclink' })
  assert.ifError(verifiedTwo.error)
  assert.ok(verifiedTwo.data.session)
  loginTwo.body.token_hash = undefined
  report('valid team credentials establish Supabase Auth sessions')

  const restoredClient = createClient(supabaseUrl, publishableKey, {
    auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const restored = await restoredClient.auth.getSession()
  assert.ifError(restored.error)
  assert.equal(restored.data.session?.user.id, verifiedOne.data.session.user.id)
  report('session is restored from persisted Supabase Auth storage')

  currentCheck = 'protected route access'
  const unauthorizedRoute = await renderProtectedRoute({
    session: null,
    team: null,
    sessionLoading: false,
    teamLoading: false,
    teamError: null,
    signInWithTeamCode: async () => {},
    signOut: async () => {},
    refreshTeam: async () => {},
  })
  assert.ok(!unauthorizedRoute.includes('PROTECTED_ROUND_CONTENT'))
  const authorizedRoute = await renderProtectedRoute({
    session: verifiedOne.data.session,
    team: { id: provisionOne.body.team.id, team_code: teamOne.team_code, team_name: teamOne.team_name, status: 'approved' },
    sessionLoading: false,
    teamLoading: false,
    teamError: null,
    signInWithTeamCode: async () => {},
    signOut: async () => {},
    refreshTeam: async () => {},
  })
  assert.ok(authorizedRoute.includes('PROTECTED_ROUND_CONTENT'))
  report('participant route hides content without a team session and renders it for an approved team')

  currentCheck = 'team data isolation'
  const teamOneRows = await participantOne
    .from('teams')
    .select('id, team_code, team_name, status')
  const teamTwoRows = await participantTwo
    .from('teams')
    .select('id, team_code, team_name, status')
  assert.ifError(teamOneRows.error)
  assert.ifError(teamTwoRows.error)
  assert.equal(teamOneRows.data.length, 1)
  assert.equal(teamOneRows.data[0].team_code, teamOne.team_code)
  assert.equal(teamTwoRows.data.length, 1)
  assert.equal(teamTwoRows.data[0].team_code, teamTwo.team_code)

  const crossTeamRead = await participantOne
    .from('teams')
    .select('id, team_code')
    .eq('id', provisionTwo.body.team.id)
    .maybeSingle()
  assert.ifError(crossTeamRead.error)
  assert.equal(crossTeamRead.data, null)

  const protectedHashRead = await participantOne
    .from('teams')
    .select('access_code_hash')
    .maybeSingle()
  assert.ok(protectedHashRead.error)
  report('RLS isolates team rows and access-code hashes stay unreadable')

  currentCheck = 'login throttling'
  const throttleCode = `NO-SUCH-THROTTLE-${randomUUID().slice(0, 8)}`
  let throttledAt = 0
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await loginTeam(throttleCode, randomAccessCode())
    if (response.status === 429) {
      throttledAt = attempt
      break
    }
    assert.equal(response.status, 401)
  }
  assert.equal(throttledAt, 8)
  report('repeated guesses are throttled without revealing whether the Team ID exists')

  currentCheck = 'logout'
  const logout = await participantOne.auth.signOut({ scope: 'global' })
  assert.ifError(logout.error)
  const afterLogout = await participantOne.auth.getSession()
  assert.ifError(afterLogout.error)
  assert.equal(afterLogout.data.session, null)
  report('logout clears the local Supabase Auth session')
} catch {
  process.stderr.write(`FAIL: ${currentCheck}\n`)
  process.exitCode = 1
} finally {
  for (const client of teamClients) {
    try { await client.auth.signOut({ scope: 'global' }) } catch { cleanupProblems.push('temporary_session_revocation') }
  }

  if (createdTeamCodes.length) {
    try {
      const { error } = await admin
        .from('teams')
        .update({ status: 'suspended' })
        .in('team_code', createdTeamCodes)
      if (error) throw error
      const { data, error: verifyError } = await admin
        .from('teams')
        .select('team_code, status')
        .in('team_code', createdTeamCodes)
      if (verifyError || data.some((team) => team.status !== 'suspended')) {
        throw verifyError ?? new Error('Team fixture suspension could not be verified.')
      }
    } catch { cleanupProblems.push('team_fixture_suspension') }
  }

  if (createdTestEventId) {
    try {
      const { error: deleteError } = await admin
        .from('events')
        .delete()
        .eq('id', createdTestEventId)
      if (deleteError) {
        const { error: cancelError } = await admin
          .from('events')
          .update({ status: 'cancelled' })
          .eq('id', createdTestEventId)
        if (cancelError) throw cancelError
        const { data, error: verifyError } = await admin
          .from('events')
          .select('status')
          .eq('id', createdTestEventId)
          .single()
        if (verifyError || data.status !== 'cancelled') {
          throw verifyError ?? new Error('Test event cancellation could not be verified.')
        }
      }
    } catch { cleanupProblems.push('test_event_cancellation') }
  }

  for (const userId of createdAuthUsers) {
    if (userId === auditActorToRetain) {
      try {
        const { error } = await admin.from('organizer_roles').delete().eq('user_id', userId)
        if (error) throw error
      } catch { cleanupProblems.push('temporary_organizer_role_removal') }
      continue
    }
    try {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
    } catch { cleanupProblems.push('temporary_auth_user_removal') }
  }

  if (cleanupProblems.length) {
    process.stderr.write('CLEANUP: One or more fixture cleanup checks failed; inspect the test project before retrying.\n')
    process.exitCode = 1
  }
  if (process.exitCode) {
    process.stderr.write('Remote test run did not complete successfully.\n')
  } else if (createdTeamCodes.length) {
    process.stdout.write('CLEANUP: Test teams are suspended; the synthetic organizer identity remains because append-only audit records reference it. Any test-created event is cancelled.\n')
  }
}
