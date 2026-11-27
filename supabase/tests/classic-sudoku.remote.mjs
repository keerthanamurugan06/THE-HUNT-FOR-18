import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
let currentDetail = 'setup'

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

  currentCheck = 'six-variant Open Challenge load and team order'
  currentDetail = 'load Round 1 RPC for first test team'
  const openOne = await participantOne.client.rpc('load_round1_sudokus')
  currentDetail = 'load Round 1 RPC for second test team'
  const openTwo = await participantTwo.client.rpc('load_round1_sudokus')
  currentDetail = 'validate first test team RPC result'
  if (openOne.error) {
    const column = String(openOne.error.message ?? '').match(/column reference\s+"?([a-z_]+)"?\s+is ambiguous/i)?.[1]
    throw Object.assign(new Error('Round 1 load RPC failed.'), { code: openOne.error.code ?? 'UNKNOWN_DB_ERROR', ambiguousColumn: column })
  }
  assert.ifError(openOne.error)
  currentDetail = 'validate second test team RPC result'
  if (openTwo.error) {
    const column = String(openTwo.error.message ?? '').match(/column reference\s+"?([a-z_]+)"?\s+is ambiguous/i)?.[1]
    throw Object.assign(new Error('Round 1 load RPC failed.'), { code: openTwo.error.code ?? 'UNKNOWN_DB_ERROR', ambiguousColumn: column })
  }
  assert.ifError(openTwo.error)
  currentDetail = 'validate puzzle count and order for first team'
  assert.equal(openOne.data.length, 6)
  currentDetail = 'validate puzzle count for second team'
  assert.equal(openTwo.data.length, 6)
  currentDetail = 'validate six variant type set'
  const expectedTypes = ['classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal'].sort()
  assert.deepEqual(openOne.data.map((row) => row.puzzle_type).sort(), expectedTypes)
  assert.deepEqual(openTwo.data.map((row) => row.puzzle_type).sort(), expectedTypes)
  currentDetail = 'validate randomized display order'
  assert.deepEqual(openOne.data.map((row) => row.display_order).sort(), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(openTwo.data.map((row) => row.display_order).sort(), [1, 2, 3, 4, 5, 6])
  currentDetail = 'validate demo-only metadata'
  assert.ok(openOne.data.every((row) => row.demo_only === true))
  report('all six demo variants initialize with stable per-team display order')

  currentCheck = 'demo definitions and per-variant secure completion'
  const migrationText = readFileSync(new URL('../migrations/20261127160000_round1_open_challenge.sql', import.meta.url), 'utf8')
  const seedStart = migrationText.indexOf('-- Verified temporary demonstration puzzle candidates.')
  assert.notEqual(seedStart, -1)
  const seedPattern = /\('([^']+)', '([0-9]{81})', '([1-9]{81})', '([^']+)', true, (array\[[0-8,]+\]::integer\[\]|null)\)/g
  const seeds = [...migrationText.slice(seedStart).matchAll(seedPattern)]
  const solutions = new Map(seeds.map((seed) => [seed[1], seed[3]]))
  assert.equal(solutions.size, 6)
  const victimByType = { classic: 1, jigsaw: 2, windoku: 3, anti_knight: 4, anti_king: 5, diagonal: 6 }
  for (const puzzleType of expectedTypes) {
    if (puzzleType === 'classic') {
      assert.equal(openOne.data.find((row) => row.puzzle_type === puzzleType).progress_status, 'completed')
      const retry = await participantOne.client.rpc('complete_round1_sudoku', { p_puzzle_type: puzzleType })
      assert.ifError(retry.error)
      assert.equal(retry.data, 1)
      continue
    }
    const row = openOne.data.find((puzzle) => puzzle.puzzle_type === puzzleType)
    const solution = solutions.get(puzzleType)
    assert.ok(row && solution)
    const incomplete = row.initial_grid.split('')
    const empty = incomplete.findIndex((cell) => cell === '0')
    assert.notEqual(empty, -1)
    incomplete[empty] = solution[empty] === '9' ? '8' : '9'
    const badSave = await participantOne.client.from('team_sudoku_progress').update({ board: incomplete.join('') })
      .eq('puzzle_type', puzzleType).eq('status', 'in_progress').select('id').maybeSingle()
    assert.ifError(badSave.error)
    assert.ok(badSave.data?.id)
    const invalidCompletion = await participantOne.client.rpc('complete_round1_sudoku', { p_puzzle_type: puzzleType })
    assert.ifError(invalidCompletion.error)
    assert.equal(invalidCompletion.data, null)

    const restored = await participantOne.client.rpc('load_round1_sudokus')
    assert.ifError(restored.error)
    assert.equal(restored.data.find((puzzle) => puzzle.puzzle_type === puzzleType).board, incomplete.join(''))
    const correctSave = await participantOne.client.from('team_sudoku_progress').update({ board: solution })
      .eq('puzzle_type', puzzleType).eq('status', 'in_progress').select('id').maybeSingle()
    assert.ifError(correctSave.error)
    assert.ok(correctSave.data?.id)
    const completion = await participantOne.client.rpc('complete_round1_sudoku', { p_puzzle_type: puzzleType })
    assert.ifError(completion.error)
    assert.equal(completion.data, victimByType[puzzleType])
    const repeated = await participantOne.client.rpc('complete_round1_sudoku', { p_puzzle_type: puzzleType })
    assert.ifError(repeated.error)
    assert.equal(repeated.data, victimByType[puzzleType])
  }
  report('incorrect grids are rejected; correct saved solutions complete each variant and retries return the same victim')

  currentCheck = 'persistent victim discovery and RLS isolation'
  const teamOneUnlocks = await participantOne.client.from('team_round1_evidence_unlocks')
    .select('team_id,puzzle_type,victim_number').order('victim_number')
  const teamTwoUnlocks = await participantTwo.client.from('team_round1_evidence_unlocks')
    .select('team_id,puzzle_type,victim_number')
  assert.ifError(teamOneUnlocks.error)
  assert.ifError(teamTwoUnlocks.error)
  assert.deepEqual(teamOneUnlocks.data.map((row) => row.victim_number), [1, 2, 3, 4, 5, 6])
  assert.ok(teamOneUnlocks.data.every((row) => row.team_id === teamOne.id))
  assert.equal(teamTwoUnlocks.data.length, 0)
  const teamTwoRound = await participantTwo.client.rpc('load_round1_sudokus')
  assert.ifError(teamTwoRound.error)
  assert.ok(teamTwoRound.data.every((row) => row.progress_status === 'in_progress' && !row.evidence_unlocked))
  const duplicateUnlocks = await participantOne.client.from('team_round1_evidence_unlocks')
    .select('puzzle_type,victim_number')
  assert.ifError(duplicateUnlocks.error)
  assert.equal(duplicateUnlocks.data.length, 6)
  report('six discoveries persist, remain unique and are hidden from the second team')

  currentCheck = 'unauthenticated Open Challenge rejection'
  const unauthenticatedRound = await publicClient.rpc('load_round1_sudokus')
  assert.ok(unauthenticatedRound.error)
  const unauthenticatedVariantCompletion = await publicClient.rpc('complete_round1_sudoku', { p_puzzle_type: 'diagonal' })
  assert.ok(unauthenticatedVariantCompletion.error)
  report('unauthenticated clients cannot load or complete Round 1 puzzles')
} catch (error) {
  const safeCode = typeof error?.code === 'string' ? error.code : 'ASSERTION_OR_RUNTIME_ERROR'
  const safeHttpStatus = Number.isInteger(error?.status) ? error.status : undefined
  const ambiguousColumn = typeof error?.ambiguousColumn === 'string' ? error.ambiguousColumn : undefined
  process.stderr.write(`FAIL: ${currentCheck} at ${currentDetail} (code ${safeCode}${safeHttpStatus ? `, HTTP ${safeHttpStatus}` : ''}${ambiguousColumn ? `, ambiguous column ${ambiguousColumn}` : ''})\n`)
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
    } catch { process.stderr.write('CLEANUP: Temporary team suspension could not be verified.\n'); process.exitCode = 1 }
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
    } catch { process.stderr.write('CLEANUP: Temporary event cancellation could not be verified.\n'); process.exitCode = 1 }
  }

  if (process.exitCode) {
    process.stderr.write('Fixture cleanup was not fully verified; inspect only the test project before retrying.\n')
  } else if (provisionedTeamCodes.length) {
    process.stdout.write('CLEANUP: Temporary sessions revoked, teams suspended and test event cancelled. Test-created rows were retained; no project data was deleted.\n')
  }
}
