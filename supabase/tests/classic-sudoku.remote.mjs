import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const projectRef = 'bfzlszktufjqlfiyknga'
const supabaseUrl = process.env.HUNT18_TEST_SUPABASE_URL
const publishableKey = process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || new URL(supabaseUrl).hostname !== `${projectRef}.supabase.co`) {
  throw new Error('Refusing to run: URL must identify the approved test project.')
}
if (!publishableKey || !serviceRoleKey) {
  throw new Error('Provide test-project API keys through process environment variables.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const clientsToSignOut = []
const provisionedTeamCodes = []
let testEventId = null
let currentCheck = 'setup'

function report(name) {
  process.stdout.write(`PASS: ${name}\n`)
}

function randomCredential() {
  return `${randomUUID()}-Qa9!`
}

async function createOrganizer() {
  const email = `classic-test-organizer-${randomUUID()}@teams.huntfor18.invalid`
  const password = randomCredential()
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.ifError(error)
  assert.ok(data.user?.id)
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  clientsToSignOut.push(client)
  const signedIn = await client.auth.signInWithPassword({ email, password })
  assert.ifError(signedIn.error)
  assert.ok(signedIn.data.session?.access_token)
  const { error: roleError } = await admin.from('organizer_roles').insert({
    user_id: data.user.id,
    role: 'organizer',
  })
  assert.ifError(roleError)
  return { userId: data.user.id, token: signedIn.data.session.access_token }
}

async function provisionTeam(organizerToken, eventId, suffix) {
  const team = {
    event_id: eventId,
    team_code: `TEMP-CLASSIC-${randomUUID().slice(0, 8)}-${suffix}`,
    team_name: `Temporary Classic Sudoku Test ${suffix}`,
    access_code: randomCredential(),
  }
  provisionedTeamCodes.push(team.team_code)
  const response = await fetch(`${supabaseUrl}/functions/v1/provision-team`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${organizerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(team),
  })
  const result = await response.json().catch(() => ({}))
  assert.equal(response.status, 201)
  assert.ok(result.team?.id)
  return { ...team, id: result.team.id }
}

async function signInTeam(team) {
  const response = await fetch(`${supabaseUrl}/functions/v1/team-login`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({ team_code: team.team_code, access_code: team.access_code }),
  })
  const result = await response.json().catch(() => ({}))
  assert.equal(response.status, 200)
  assert.equal(typeof result.token_hash, 'string')

  const storage = new Map()
  const storageAdapter = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value) },
    removeItem: async (key) => { storage.delete(key) },
  }
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { storage: storageAdapter, autoRefreshToken: false, persistSession: true, detectSessionInUrl: false },
  })
  clientsToSignOut.push(client)
  const verified = await client.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' })
  result.token_hash = undefined
  assert.ifError(verified.error)
  assert.ok(verified.data.session)
  return { client, storageAdapter }
}

function readClassicProgress(result) {
  assert.ifError(result.error)
  assert.ok(Array.isArray(result.data) && result.data.length === 1)
  const row = result.data[0]
  assert.match(row.initial_grid, /^[0-9]{81}$/)
  assert.match(row.board, /^[0-9]{81}$/)
  return row
}

try {
  currentCheck = 'hosted Auth signup restriction'
  const settings = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  })
  assert.equal(settings.status, 200)
  assert.equal((await settings.json()).disable_signup, true)
  report('hosted Auth signup is disabled')

  currentCheck = 'test event setup'
  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({ name: `Temporary Classic Sudoku test ${randomUUID().slice(0, 8)}`, status: 'draft' })
    .select('id')
    .single()
  assert.ifError(eventError)
  assert.ok(event?.id)
  testEventId = event.id

  currentCheck = 'organizer and team fixtures'
  const organizer = await createOrganizer()
  const teamOne = await provisionTeam(organizer.token, event.id, 'A')
  const teamTwo = await provisionTeam(organizer.token, event.id, 'B')
  const participantOne = await signInTeam(teamOne)
  const participantTwo = await signInTeam(teamTwo)
  report('two isolated test team sessions were provisioned')

  currentCheck = 'initial puzzle load'
  const initialOne = readClassicProgress(await participantOne.client.rpc('load_classic_sudoku'))
  const initialTwo = readClassicProgress(await participantTwo.client.rpc('load_classic_sudoku'))
  assert.equal(initialOne.board, initialOne.initial_grid)
  assert.equal(initialOne.progress_status, 'in_progress')
  assert.equal(initialTwo.board, initialTwo.initial_grid)
  report('load RPC initializes each team from the same protected puzzle givens')

  currentCheck = 'team-scoped automatic save and restoration'
  const savedBoard = initialOne.board.split('')
  const editableCell = savedBoard.findIndex((value) => value === '0')
  assert.notEqual(editableCell, -1)
  savedBoard[editableCell] = '1'
  const save = await participantOne.client
    .from('team_sudoku_progress')
    .update({ board: savedBoard.join('') })
    .eq('puzzle_type', 'classic')
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()
  assert.ifError(save.error)
  assert.ok(save.data?.id)

  const restoredClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      storage: participantOne.storageAdapter,
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  const restoredSession = await restoredClient.auth.getSession()
  assert.ifError(restoredSession.error)
  assert.ok(restoredSession.data.session)
  const restoredProgress = readClassicProgress(await restoredClient.rpc('load_classic_sudoku'))
  assert.equal(restoredProgress.board, savedBoard.join(''))
  report('saved board and Supabase session restore after client recreation')

  currentCheck = 'given clue protection'
  const changedClue = initialOne.initial_grid.split('')
  const clueIndex = changedClue.findIndex((value) => value !== '0')
  changedClue[clueIndex] = changedClue[clueIndex] === '9' ? '8' : '9'
  const clueAttempt = await participantOne.client
    .from('team_sudoku_progress')
    .update({ board: changedClue.join('') })
    .eq('puzzle_type', 'classic')
    .eq('status', 'in_progress')
  assert.ok(clueAttempt.error)
  const afterRejectedClue = readClassicProgress(await participantOne.client.rpc('load_classic_sudoku'))
  assert.equal(afterRejectedClue.board, savedBoard.join(''))
  report('database trigger rejects edits to original givens without changing saved progress')

  currentCheck = 'server-side completion validation'
  const incompleteResult = await participantOne.client.rpc('complete_classic_sudoku')
  assert.ifError(incompleteResult.error)
  assert.equal(incompleteResult.data, false)

  const solution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
  const correctSave = await participantOne.client
    .from('team_sudoku_progress')
    .update({ board: solution })
    .eq('puzzle_type', 'classic')
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()
  assert.ifError(correctSave.error)
  assert.ok(correctSave.data?.id)
  const completion = await participantOne.client.rpc('complete_classic_sudoku')
  assert.ifError(completion.error)
  assert.equal(completion.data, true)
  const completedRow = await participantOne.client
    .from('team_sudoku_progress')
    .select('status')
    .eq('puzzle_type', 'classic')
    .single()
  assert.ifError(completedRow.error)
  assert.equal(completedRow.data.status, 'completed')
  const repeatedCompletion = await participantOne.client.rpc('complete_classic_sudoku')
  assert.ifError(repeatedCompletion.error)
  assert.equal(repeatedCompletion.data, true)
  report('completion RPC rejects incomplete progress and marks only the correct saved board complete')

  currentCheck = 'completed progress lock'
  const postCompletionEdit = await participantOne.client
    .from('team_sudoku_progress')
    .update({ board: initialOne.initial_grid })
    .eq('puzzle_type', 'classic')
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()
  assert.ifError(postCompletionEdit.error)
  assert.equal(postCompletionEdit.data, null)
  report('completed progress cannot be overwritten by participant update')

  currentCheck = 'team progress isolation'
  const teamOneRows = await participantOne.client
    .from('team_sudoku_progress')
    .select('team_id, board, status')
  const teamTwoRows = await participantTwo.client
    .from('team_sudoku_progress')
    .select('team_id, board, status')
  assert.ifError(teamOneRows.error)
  assert.ifError(teamTwoRows.error)
  assert.equal(teamOneRows.data.length, 1)
  assert.equal(teamOneRows.data[0].team_id, teamOne.id)
  assert.equal(teamTwoRows.data.length, 1)
  assert.equal(teamTwoRows.data[0].team_id, teamTwo.id)
  assert.equal(teamTwoRows.data[0].status, 'in_progress')
  const crossTeamRead = await participantTwo.client
    .from('team_sudoku_progress')
    .select('team_id')
    .eq('team_id', teamOne.id)
    .maybeSingle()
  assert.ifError(crossTeamRead.error)
  assert.equal(crossTeamRead.data, null)
  report('Sudoku progress RLS isolates two teams and completion state')

  currentCheck = 'unauthenticated completion rejection'
  const unauthenticatedCompletion = await publicClient.rpc('complete_classic_sudoku')
  assert.ok(unauthenticatedCompletion.error)
  report('unauthenticated callers cannot complete a Sudoku puzzle')
} catch {
  process.stderr.write(`FAIL: ${currentCheck}\n`)
  process.exitCode = 1
} finally {
  for (const client of clientsToSignOut) {
    try { await client.auth.signOut({ scope: 'global' }) } catch { process.exitCode = 1 }
  }

  if (provisionedTeamCodes.length) {
    try {
      const { error } = await admin
        .from('teams')
        .update({ status: 'suspended' })
        .in('team_code', provisionedTeamCodes)
      if (error) throw error
      const { data, error: verifyError } = await admin
        .from('teams')
        .select('status')
        .in('team_code', provisionedTeamCodes)
      if (verifyError || data.some((team) => team.status !== 'suspended')) {
        throw verifyError ?? new Error('Suspended fixture status could not be verified.')
      }
    } catch { process.exitCode = 1 }
  }

  if (testEventId) {
    try {
      const { error } = await admin
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', testEventId)
      if (error) throw error
      const { data, error: verifyError } = await admin
        .from('events')
        .select('status')
        .eq('id', testEventId)
        .single()
      if (verifyError || data.status !== 'cancelled') {
        throw verifyError ?? new Error('Test event cancellation could not be verified.')
      }
    } catch { process.exitCode = 1 }
  }

  if (process.exitCode) {
    process.stderr.write('Fixture cleanup was not fully verified; inspect only the test project before retrying.\n')
  } else if (provisionedTeamCodes.length) {
    process.stdout.write('CLEANUP: Temporary sessions revoked, teams suspended and test event cancelled. Test-created rows were retained; no project data was deleted.\n')
  }
}
