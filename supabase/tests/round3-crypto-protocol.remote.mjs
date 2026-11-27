import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const projectRef = 'bfzlszktufjqlfiyknga'
const supabaseUrl = process.env.HUNT18_TEST_SUPABASE_URL
const publishableKey = process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || new URL(supabaseUrl).hostname !== `${projectRef}.supabase.co`) {
  throw new Error('Refusing to run: test URL must identify the approved test project.')
}
if (!publishableKey || !serviceRoleKey) {
  throw new Error('Secure test-project environment variables are required.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const anonymous = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})
const clients = []
const teamCodes = []
const nonfatalFailures = []
let eventId
let organizerId
let check = 'setup'

const testAnswers = [
  { key: 'TEMP-KEY-ONE', plaintext: 'TEMP PLAINTEXT ONE' },
  { key: 'TEMP-KEY-TWO', plaintext: 'HEX PLAINTEXT OK' },
  { key: null, plaintext: 'PLAINTEXT ONLY' },
]
const fragments = ['TEMP-FRAGMENT-A', 'TEMP-FRAGMENT-B', 'TEMP-FRAGMENT-C']
const finalCode = 'TEMP-ONLY-FINAL-CODE'

function passed(name) {
  process.stdout.write(`PASS: ${name}\n`)
}

function safeDatabaseDiagnostic(error) {
  return [error?.message, error?.details, error?.hint]
    .filter(value => typeof value === 'string')
    .join(' ')
    .replace(/TEMP-[A-Z0-9-]+/gi, '[fixture]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^a-z0-9 _.,:()\-]/gi, ' ')
    .slice(0, 180)
}

function credential() {
  return `${randomUUID()}-Temporary-QA!`
}

async function createOrganizer() {
  const email = `round3-organizer-${randomUUID()}@teams.huntfor18.invalid`
  const password = credential()
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.ifError(error)
  assert.ok(data.user?.id)
  organizerId = data.user.id
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  clients.push(client)
  const login = await client.auth.signInWithPassword({ email, password })
  assert.ifError(login.error)
  assert.ok(login.data.session?.access_token)
  const role = await admin.from('organizer_roles').insert({ user_id: organizerId, role: 'organizer' })
  assert.ifError(role.error)
  return { client, token: login.data.session.access_token }
}

async function provisionTeam(organizerToken, suffix) {
  const team = {
    event_id: eventId,
    team_code: `TEMP-R3-${randomUUID().slice(0, 12)}-${suffix}`,
    team_name: `Temporary Round 3 Test ${suffix}`,
    access_code: credential(),
  }
  teamCodes.push(team.team_code)
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

async function loginTeam(team) {
  const response = await fetch(`${supabaseUrl}/functions/v1/team-login`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({ team_code: team.team_code, access_code: team.access_code }),
  })
  const result = await response.json().catch(() => ({}))
  assert.equal(response.status, 200)
  assert.equal(typeof result.token_hash, 'string')
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  clients.push(client)
  const verified = await client.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' })
  result.token_hash = undefined
  assert.ifError(verified.error)
  assert.ok(verified.data.session)
  return client
}

function challenge(slot) {
  return {
    slot,
    title: `DEMO ONLY — Round 3 test file ${slot}`,
    description: `Temporary test description ${slot}; not competition content.`,
    difficulty: ['easy', 'medium', 'hard'][slot - 1],
    encrypted_content: `TEMPORARY TEST CIPHERTEXT ${slot}`,
    known_plaintext: [],
    clue: `Temporary test clue ${slot}.`,
    accepted_formats: slot === 2 ? ['hex'] : ['text'],
    requires_key: slot !== 3,
    requires_plaintext: true,
    case_sensitive: false,
    normalize_whitespace: true,
    maximum_marks: null,
    associated_victims: [[13, 14], [15, 16], [17, 18]][slot - 1],
    expected_key: testAnswers[slot - 1].key,
    expected_plaintext: testAnswers[slot - 1].plaintext,
    hints: [`Temporary hint ${slot}.`],
    hint_deductions: [null],
    code_fragment: fragments[slot - 1],
  }
}

try {
  check = 'temporary event and rounds'
  const { data: event, error: eventError } = await admin.from('events')
    .insert({ name: `Temporary Round 3 integration ${randomUUID().slice(0, 8)}`, status: 'draft' })
    .select('id').single()
  assert.ifError(eventError)
  eventId = event.id
  const rounds = [1, 2, 3, 4].map(number => ({
    event_id: eventId,
    round_number: number,
    round_name: `Temporary test round ${number}`,
    duration_minutes: 1,
    status: number === 3 ? 'ready' : 'locked',
    display_order: number,
  }))
  const roundInsert = await admin.from('rounds').insert(rounds)
  assert.ifError(roundInsert.error)

  check = 'temporary organizer and two provisioned teams'
  const organizer = await createOrganizer()
  const teamOne = await provisionTeam(organizer.token, 'A')
  const teamTwo = await provisionTeam(organizer.token, 'B')
  const participantOne = await loginTeam(teamOne)
  const participantTwo = await loginTeam(teamTwo)
  passed('test-only organizer and two teams provisioned through hosted authorization flow')

  check = 'organizer-only configuration access'
  const anonymousConfig = await anonymous.rpc('get_round3_organizer_configuration', { p_event_id: eventId })
  const participantConfig = await participantOne.rpc('get_round3_organizer_configuration', { p_event_id: eventId })
  const unauthorizedSave = await participantOne.rpc('save_round3_challenge_draft', {
    p_event_id: eventId, p_slot: 1, p_configuration: challenge(1),
  })
  assert.ok(anonymousConfig.error)
  assert.ok(participantConfig.error)
  assert.ok(unauthorizedSave.error)
  passed('anonymous and participant sessions cannot read or alter organizer configuration')

  check = 'independent challenge draft saves and protected organizer answers'
  for (let slot = 1; slot <= 3; slot += 1) {
    const saved = await organizer.client.rpc('save_round3_challenge_draft', {
      p_event_id: eventId, p_slot: slot, p_configuration: challenge(slot),
    })
    assert.ifError(saved.error)
  }
  const savedCode = await organizer.client.rpc('save_round3_final_code_draft', {
    p_event_id: eventId, p_final_code: finalCode,
  })
  assert.ifError(savedCode.error)
  const config = await organizer.client.rpc('get_round3_organizer_configuration', { p_event_id: eventId })
  assert.ifError(config.error)
  assert.equal(config.data.challenges.length, 3)
  assert.deepEqual(config.data.challenges.map(row => row.slot), [1, 2, 3])
  assert.ok(config.data.challenges.every(row => row.answer_configured))
  assert.equal(config.data.published, false)
  passed('three independent drafts persist; organizer configuration omits expected answer values')

  check = 'demo publication without round activation'
  const publish = await organizer.client.rpc('publish_round3_configuration', {
    p_event_id: eventId, p_demo_only: true,
  })
  assert.ifError(publish.error)
  const publishedConfig = await organizer.client.rpc('get_round3_organizer_configuration', { p_event_id: eventId })
  assert.ifError(publishedConfig.error)
  assert.equal(publishedConfig.data.published, true)
  const stillReady = await admin.from('rounds').select('status').eq('event_id', eventId).eq('round_number', 3).single()
  assert.ifError(stillReady.error)
  assert.equal(stillReady.data.status, 'ready')
  passed('publishing demo challenge content does not activate or change the round')

  check = 'participant content visibility and answer secrecy'
  const boardOne = await participantOne.rpc('load_round3_challenges')
  const boardTwo = await participantTwo.rpc('load_round3_challenges')
  check = 'first team challenge load RPC'
  if (boardOne.error) {
    const error = new Error()
    error.code = boardOne.error.code
    error.safeDbDetail = safeDatabaseDiagnostic(boardOne.error)
    throw error
  }
  check = 'second team challenge load RPC'
  if (boardTwo.error) {
    const error = new Error()
    error.code = boardTwo.error.code
    error.safeDbDetail = safeDatabaseDiagnostic(boardTwo.error)
    throw error
  }
  check = 'participant challenge count'
  assert.equal(boardOne.data.challenges.length, 3)
  check = 'team-specific stable challenge order'
  const orderSignature = board => board.challenges.map(row => row.slot).join(',')
  for (const [teamIndex, board] of [boardOne.data, boardTwo.data].entries()) {
    const displayOrder = board.challenges.map(row => row.display_order).sort((a, b) => a - b)
    if (JSON.stringify(displayOrder) !== '[1,2,3]') {
      nonfatalFailures.push(`team ${teamIndex + 1} display order ${displayOrder.map(value => String(value)).join(',')}`)
    }
  }
  let differentlyOrderedParticipant = participantTwo
  let differentlyOrderedBoard = boardTwo.data
  for (let attempt = 0; orderSignature(differentlyOrderedBoard) === orderSignature(boardOne.data) && attempt < 12; attempt++) {
    const additionalTeam = await provisionTeam(organizer.token, `ORDER-${attempt + 1}`)
    differentlyOrderedParticipant = await loginTeam(additionalTeam)
    const additionalBoard = await differentlyOrderedParticipant.rpc('load_round3_challenges')
    assert.ifError(additionalBoard.error)
    assert.equal(additionalBoard.data.challenges.length, 3)
    const displayOrder = additionalBoard.data.challenges.map(row => row.display_order).sort((a, b) => a - b)
    assert.deepEqual(displayOrder, [1, 2, 3])
    differentlyOrderedBoard = additionalBoard.data
  }
  assert.notEqual(orderSignature(differentlyOrderedBoard), orderSignature(boardOne.data))
  passed('separate teams receive different complete randomized challenge orders')
  const serialized = JSON.stringify(boardOne.data)
  const protectedValues = [
    ...testAnswers.flatMap(answer => [answer.key, answer.plaintext].filter(Boolean)),
    ...fragments,
    finalCode,
    'Temporary hint 1.',
  ]
  check = 'participant payload protects configured answers'
  for (const value of protectedValues.slice(0, 5)) assert.ok(!serialized.includes(value))
  check = 'participant payload protects fragments and final code'
  for (const value of [...fragments, finalCode]) assert.ok(!serialized.includes(value))
  check = 'participant payload omits unrequested hints'
  assert.ok(!serialized.includes('Temporary hint 1.'))
  check = 'participant cannot directly query challenge definitions'
  const directSecrets = await participantOne.from('round3_challenge_definitions').select('*')
  check = 'participant cannot directly query team progress'
  const directProgress = await participantOne.from('team_round3_progress').select('*')
  assert.ok(directSecrets.error)
  assert.ok(directProgress.error)
  passed('published puzzle content is available while answers, fragments, final code, and unrequested hints stay hidden')

  check = 'workspace autosave and restoration'
  const workspace = { scratchpad: 'TEMP SAVED WORK', key: 'TEMP-KEY-WORK', plaintext: 'TEMP PLAINTEXT WORK' }
  const savedWorkspace = await participantOne.rpc('save_round3_workspace', { p_slot: 1, p_workspace: workspace })
  assert.ifError(savedWorkspace.error)
  const restoredBoard = await participantOne.rpc('load_round3_challenges')
  assert.ifError(restoredBoard.error)
  assert.deepEqual(restoredBoard.data.challenges.find(row => row.slot === 1).workspace, workspace)
  passed('team workspace restores from server after a fresh challenge load')

  check = 'hint persistence and duplicate prevention'
  const hint = await participantOne.rpc('request_round3_hint', { p_slot: 1, p_hint_index: 1 })
  assert.ifError(hint.error)
  assert.equal(hint.data.text, 'Temporary hint 1.')
  assert.equal(hint.data.already_used, false)
  assert.equal(hint.data.configured_deduction, null)
  const hintAgain = await participantOne.rpc('request_round3_hint', { p_slot: 1, p_hint_index: 1 })
  assert.ifError(hintAgain.error)
  assert.equal(hintAgain.data.already_used, true)
  const afterHint = await participantOne.rpc('load_round3_challenges')
  assert.ifError(afterHint.error)
  const slotOne = afterHint.data.challenges.find(row => row.slot === 1)
  assert.equal(slotOne.hint_count, 1)
  assert.equal(slotOne.hints.length, 1)
  passed('hint usage is recorded once per challenge and repeated requests do not duplicate records')

  check = 'incorrect answers reveal no rewards'
  const wrong = await participantOne.rpc('submit_round3_challenge', {
    p_slot: 1, p_key: 'WRONG', p_plaintext: 'WRONG', p_answer_format: 'text',
  })
  assert.ifError(wrong.error)
  assert.equal(wrong.data.correct, false)
  const noUnlock = await participantOne.from('team_round3_evidence_unlocks').select('victim_number')
  assert.ifError(noUnlock.error)
  assert.equal(noUnlock.data.length, 0)
  passed('incorrect key/plaintext attempts reveal no victim or code-fragment evidence')

  check = 'server-side answer formats and rewards'
  const validInputs = [
    { slot: 1, key: testAnswers[0].key, plaintext: testAnswers[0].plaintext, format: 'text' },
    { slot: 2, key: testAnswers[1].key, plaintext: Buffer.from(testAnswers[1].plaintext).toString('hex'), format: 'hex' },
    { slot: 3, key: '', plaintext: testAnswers[2].plaintext, format: 'text' },
  ]
  for (const answer of validInputs) {
    check = `server-side answer validation for slot ${answer.slot}`
    const result = await participantOne.rpc('submit_round3_challenge', {
      p_slot: answer.slot,
      p_key: answer.key,
      p_plaintext: answer.plaintext,
      p_answer_format: answer.format,
    })
    if (result.error) {
      const error = new Error()
      error.code = result.error.code
      throw error
    }
    if (result.data.correct !== true || result.data.completed !== true) {
      const error = new Error()
      error.code = 'ANSWER_REJECTED'
      error.safeDbDetail = `slot ${answer.slot}, format ${answer.format}, completed ${String(result.data.completed)}`
      throw error
    }
  }
  passed('accepted text and hex input formats validate on the server')
  check = 'completed challenge progress restoration'
  const completedBoard = await participantOne.rpc('load_round3_challenges')
  assert.ifError(completedBoard.error)
  check = 'all three challenge completion states persisted'
  assert.equal(completedBoard.data.challenges.filter(row => row.completed).length, 3)
  check = 'completed challenges reveal the six mapped victims'
  assert.deepEqual(completedBoard.data.challenges.flatMap(row => row.victims).sort((a, b) => a - b), [13, 14, 15, 16, 17, 18])
  check = 'completed challenges reveal the three code fragments'
  assert.deepEqual(completedBoard.data.challenges.map(row => row.fragment).sort(), [...fragments].sort())
  passed('text and hex plaintext formats validate server-side; completion reveals each fragment and mapped victims')

  check = 'duplicate rewards and cross-team isolation'
  const repeat = await participantOne.rpc('submit_round3_challenge', {
    p_slot: 1, p_key: testAnswers[0].key, p_plaintext: testAnswers[0].plaintext, p_answer_format: 'text',
  })
  assert.ifError(repeat.error)
  assert.equal(repeat.data.completed, true)
  const teamOneEvidence = await participantOne.from('team_round3_evidence_unlocks').select('team_id,victim_number').order('victim_number')
  assert.ifError(teamOneEvidence.error)
  assert.deepEqual(teamOneEvidence.data.map(row => row.victim_number), [13, 14, 15, 16, 17, 18])
  assert.ok(teamOneEvidence.data.every(row => row.team_id === teamOne.id))
  const teamTwoBoard = await differentlyOrderedParticipant.rpc('load_round3_challenges')
  assert.ifError(teamTwoBoard.error)
  assert.equal(teamTwoBoard.data.challenges.filter(row => row.completed).length, 0)
  assert.ok(teamTwoBoard.data.challenges.every(row => row.fragment === null && row.victims.length === 0))
  const crossRead = await differentlyOrderedParticipant.from('team_round3_evidence_unlocks').select('team_id,victim_number').eq('team_id', teamOne.id)
  assert.ifError(crossRead.error)
  assert.equal(crossRead.data.length, 0)
  passed('retries do not duplicate rewards; team two cannot see team one progress or evidence')

  check = 'final-code validation and persistence'
  const early = await participantTwo.rpc('submit_round3_final_code', { p_code: finalCode })
  assert.ifError(early.error)
  assert.equal(early.data, false)
  const wrongFinal = await participantOne.rpc('submit_round3_final_code', { p_code: 'WRONG FINAL CODE' })
  assert.ifError(wrongFinal.error)
  assert.equal(wrongFinal.data, false)
  const correctFinal = await participantOne.rpc('submit_round3_final_code', { p_code: finalCode })
  assert.ifError(correctFinal.error)
  assert.equal(correctFinal.data, true)
  const repeatFinal = await participantOne.rpc('submit_round3_final_code', { p_code: finalCode })
  assert.ifError(repeatFinal.error)
  assert.equal(repeatFinal.data, true)
  const restoredFinal = await participantOne.rpc('load_round3_challenges')
  assert.ifError(restoredFinal.error)
  assert.equal(restoredFinal.data.final_code_complete, true)
  const roundFour = await admin.from('rounds').select('status').eq('event_id', eventId).eq('round_number', 4).single()
  assert.ifError(roundFour.error)
  assert.equal(roundFour.data.status, 'locked')
  passed('final code is protected, requires all challenges, persists idempotently, and does not activate Round 4')

  check = 'configuration freeze after participant activity'
  const editAfterPlay = await organizer.client.rpc('save_round3_challenge_draft', {
    p_event_id: eventId, p_slot: 1, p_configuration: challenge(1),
  })
  assert.ok(editAfterPlay.error)
  passed('organizer drafts are frozen once team progress starts')

  check = 'anonymous participant RPC rejection'
  const anonymousLoad = await anonymous.rpc('load_round3_challenges')
  const anonymousSubmit = await anonymous.rpc('submit_round3_challenge', {
    p_slot: 1, p_key: testAnswers[0].key, p_plaintext: testAnswers[0].plaintext, p_answer_format: 'text',
  })
  assert.ok(anonymousLoad.error)
  assert.ok(anonymousSubmit.error)
  passed('anonymous callers cannot load or submit Round 3')

  if (nonfatalFailures.length) {
    const error = new Error()
    error.code = 'TEST_ASSERTION'
    error.safeDbDetail = nonfatalFailures.join('; ')
    throw error
  }
} catch (error) {
  const safeCode = error?.cause?.code ?? error?.code ?? 'ASSERTION_OR_SETUP_ERROR'
  const safeDbDetail = error?.safeDbDetail
  process.stderr.write(`FAIL: ${check} (code ${safeCode}${safeDbDetail ? `, ${safeDbDetail}` : ''}). Fixture data withheld.\n`)
  process.exitCode = 1
} finally {
  for (const client of clients) {
    try { await client.auth.signOut({ scope: 'global' }) } catch { process.exitCode = 1 }
  }
  if (teamCodes.length) {
    try {
      const { error } = await admin.from('teams').update({ status: 'suspended' }).in('team_code', teamCodes)
      if (error) throw error
      const { data, error: verify } = await admin.from('teams').select('status').in('team_code', teamCodes)
      if (verify || !data?.length || data.some(team => team.status !== 'suspended')) throw verify ?? new Error('suspension verification failed')
    } catch {
      process.stderr.write('CLEANUP ERROR: test-created teams could not be verified as suspended.\n')
      process.exitCode = 1
    }
  }
  if (eventId) {
    try {
      await admin.from('rounds').update({ status: 'ended' }).eq('event_id', eventId).eq('round_number', 3)
      const { error } = await admin.from('events').update({ status: 'cancelled' }).eq('id', eventId)
      if (error) throw error
    } catch {
      process.stderr.write('CLEANUP ERROR: test event cancellation could not be verified.\n')
      process.exitCode = 1
    }
  }
  if (organizerId) {
    try {
      const { error } = await admin.from('organizer_roles').delete().eq('user_id', organizerId)
      if (error) throw error
      await admin.auth.admin.updateUserById(organizerId, { ban_duration: '876000h' })
    } catch {
      process.stderr.write('CLEANUP ERROR: temporary organizer role deactivation could not be verified.\n')
      process.exitCode = 1
    }
  }
  if (teamCodes.length) {
    process.stdout.write('CLEANUP: own sessions revoked, test teams suspended, organizer role deactivated, and test event cancelled. No existing data was deleted.\n')
  }
}
