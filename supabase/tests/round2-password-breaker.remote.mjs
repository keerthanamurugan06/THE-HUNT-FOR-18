import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const projectRef = 'bfzlszktufjqlfiyknga'
const supabaseUrl = process.env.HUNT18_TEST_SUPABASE_URL
const publishableKey = process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || new URL(supabaseUrl).hostname !== `${projectRef}.supabase.co`) throw new Error('Refusing to run against a project other than the approved test ref.')
if (!publishableKey || !serviceRoleKey) throw new Error('Secure test API-key environment is missing.')

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
const anon = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
const clients = []
const teamCodes = []
let eventId
let organizerId
let check = 'setup'
const passed = name => process.stdout.write(`PASS: ${name}\n`)
const credential = () => `${randomUUID()}-Temporary-Only-QA!`
const phrase = 'lantern paper signal river window cipher'
const answers = Array.from({ length: 6 }, (_, i) => `TEMP-DEMO-ANSWER-${i + 1}`)
const words = ['lantern', 'paper', 'signal', 'river', 'window', 'cipher']

async function makeOrganizer() {
  const email = `round2-test-${randomUUID()}@teams.huntfor18.invalid`
  const password = credential()
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  assert.ifError(error); assert.ok(data.user?.id); organizerId = data.user.id
  const client = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  clients.push(client)
  const login = await client.auth.signInWithPassword({ email, password })
  assert.ifError(login.error); assert.ok(login.data.session)
  const role = await admin.from('organizer_roles').insert({ user_id: organizerId, role: 'organizer' })
  assert.ifError(role.error)
  return { client, token: login.data.session.access_token }
}

async function provision(organizerToken, suffix) {
  const record = { event_id: eventId, team_code: `TEMP-R2-${randomUUID().slice(0, 10)}-${suffix}`, team_name: `Temporary Round 2 test ${suffix}`, access_code: credential() }
  teamCodes.push(record.team_code)
  const response = await fetch(`${supabaseUrl}/functions/v1/provision-team`, { method: 'POST', headers: { apikey: publishableKey, authorization: `Bearer ${organizerToken}`, 'content-type': 'application/json' }, body: JSON.stringify(record) })
  const data = await response.json().catch(() => ({}))
  assert.equal(response.status, 201); assert.ok(data.team?.id)
  return { ...record, id: data.team.id }
}

async function loginTeam(team) {
  const response = await fetch(`${supabaseUrl}/functions/v1/team-login`, { method: 'POST', headers: { apikey: publishableKey, 'content-type': 'application/json' }, body: JSON.stringify({ team_code: team.team_code, access_code: team.access_code }) })
  const result = await response.json().catch(() => ({}))
  assert.equal(response.status, 200); assert.equal(typeof result.token_hash, 'string')
  const client = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
  clients.push(client)
  const verified = await client.auth.verifyOtp({ token_hash: result.token_hash, type: 'magiclink' })
  result.token_hash = undefined
  assert.ifError(verified.error); assert.ok(verified.data.session)
  return client
}

function demoChallenges() {
  return answers.map((answer, i) => ({
    slot: i + 1,
    title: `DEMO ONLY — Temporary password file ${i + 1}`,
    question_text: `Temporary demonstration question ${i + 1}. This is not competition content.`,
    puzzle_content: `Temporary demonstration puzzle placeholder ${i + 1}.`,
    built_in_clue: `Temporary demonstration clue ${i + 1}.`,
    difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
    required_round1_victim: i === 0 ? 1 : null,
    associated_victim: i + 7,
    maximum_marks: 1,
    correct_password: answer,
    solution_explanation: `Temporary demonstration explanation ${i + 1}.`,
    hidden_word: `temporary-${words[i]}`,
  }))
}

async function solve(client, slot) {
  return client.rpc('submit_round2_challenge', { p_slot: slot, p_password: answers[slot - 1] })
}

try {
  check = 'test event and rounds'
  const { data: event, error: eventError } = await admin.from('events').insert({ name: `Temporary Round 2 integration ${randomUUID().slice(0, 8)}`, status: 'draft' }).select('id').single()
  assert.ifError(eventError); eventId = event.id
  const rounds = [1, 2, 3, 4].map(n => ({ event_id: eventId, round_number: n, round_name: `Temporary test round ${n}`, duration_minutes: 1, status: n === 2 ? 'locked' : 'locked', display_order: n }))
  const roundInsert = await admin.from('rounds').insert(rounds)
  assert.ifError(roundInsert.error)

  check = 'organizer and participant fixture setup'
  const organizer = await makeOrganizer()
  const teamOne = await provision(organizer.token, 'A')
  const teamTwo = await provision(organizer.token, 'B')
  const participantOne = await loginTeam(teamOne)
  const participantTwo = await loginTeam(teamTwo)
  passed('temporary organizer and two approved teams created through existing hosted provisioning flow')

  check = 'organizer-only configuration'
  const anonConfig = await anon.rpc('get_round2_organizer_configuration', { p_event_id: eventId })
  assert.ok(anonConfig.error)
  const participantConfig = await participantOne.rpc('get_round2_organizer_configuration', { p_event_id: eventId })
  assert.ok(participantConfig.error)
  const unauthorizedSave = await participantOne.rpc('save_round2_configuration', { p_event_id: eventId, p_challenges: demoChallenges(), p_final_phrase: phrase, p_demo_only: true })
  assert.ok(unauthorizedSave.error)
  const configSave = await organizer.client.rpc('save_round2_configuration', { p_event_id: eventId, p_challenges: demoChallenges(), p_final_phrase: phrase, p_demo_only: true })
  assert.ifError(configSave.error); assert.equal(configSave.data, 1)
  const organizerConfig = await organizer.client.rpc('get_round2_organizer_configuration', { p_event_id: eventId })
  assert.ifError(organizerConfig.error); assert.equal(organizerConfig.data.challenges.length, 6)
  assert.ok(organizerConfig.data.challenges.every(c => c.answer_configured))
  passed('only organizer-role session can read or save the six challenge configuration slots')

  check = 'configuration activation lock and demo finalization guard'
  const badFinalization = await organizer.client.rpc('save_round2_configuration', { p_event_id: eventId, p_challenges: demoChallenges().map(c => ({ ...c, correct_password: credential() })), p_final_phrase: 'temporary demo phrase is not final', p_demo_only: false })
  assert.ok(badFinalization.error)
  const activate = await admin.from('rounds').update({ status: 'running' }).eq('event_id', eventId).eq('round_number', 2)
  assert.ifError(activate.error)
  const activeEdit = await organizer.client.rpc('save_round2_configuration', { p_event_id: eventId, p_challenges: demoChallenges(), p_final_phrase: null, p_demo_only: true })
  assert.ok(activeEdit.error)
  const unchanged = await organizer.client.rpc('get_round2_organizer_configuration', { p_event_id: eventId })
  assert.ifError(unchanged.error); assert.equal(unchanged.data.challenges[0].title, 'DEMO ONLY — Temporary password file 1')
  passed('demo content cannot be marked final and active-round configuration edits are rejected')

  check = 'Round 1 evidence fixture for the dependency'
  const round1 = await participantOne.rpc('load_round1_sudokus')
  assert.ifError(round1.error)
  const classicSolution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
  const saveClassic = await participantOne.from('team_sudoku_progress').update({ board: classicSolution }).eq('puzzle_type', 'classic').eq('status', 'in_progress').select('id').maybeSingle()
  assert.ifError(saveClassic.error); assert.ok(saveClassic.data?.id)
  const completeClassic = await participantOne.rpc('complete_round1_sudoku', { p_puzzle_type: 'classic' })
  assert.ifError(completeClassic.error); assert.equal(completeClassic.data, 1)
  passed('dependency team received Round 1 victim 01 through server-validated Round 1 completion')

  check = 'six challenges, randomized order and protected participant payload'
  const boardOne = await participantOne.rpc('load_round2_challenges')
  const boardTwo = await participantTwo.rpc('load_round2_challenges')
  assert.ifError(boardOne.error); assert.ifError(boardTwo.error)
  assert.equal(boardOne.data.challenges.length, 6); assert.equal(boardTwo.data.challenges.length, 6)
  for (const board of [boardOne.data, boardTwo.data]) assert.deepEqual(board.challenges.map(c => c.display_order).sort((a,b)=>a-b), [1,2,3,4,5,6])
  const serialized = JSON.stringify(boardOne.data)
  for (const secret of [...answers, phrase, ...words.map(w => `temporary-${w}`), ...demoChallenges().map(c => c.solution_explanation)]) assert.ok(!serialized.includes(secret))
  assert.equal(boardTwo.data.challenges.find(c => c.slot === 1).is_available, false)
  assert.equal(boardTwo.data.challenges.find(c => c.slot === 1).question_text, null)
  assert.equal(typeof boardTwo.data.challenges.find(c => c.slot === 1).built_in_clue, 'string')
  assert.ok(boardTwo.data.challenges.filter(c => c.slot !== 1).every(c => c.is_available))
  const repeatLoad = await participantOne.rpc('load_round2_challenges')
  assert.ifError(repeatLoad.error)
  assert.deepEqual(repeatLoad.data.challenges.map(c=>[c.slot,c.display_order]), boardOne.data.challenges.map(c=>[c.slot,c.display_order]))
  const protectedDirect = await participantOne.from('round2_challenge_definitions').select('*')
  assert.ok(protectedDirect.error)
  const hiddenSecretDirect = await participantOne.from('team_round2_progress').select('*')
  assert.ok(hiddenSecretDirect.error)
  passed('six shared slots load in stable per-team randomized permutations with answer/explanation/word protection')

  check = 'Round 1 evidence dependency and wrong-password rejection'
  const blocked = await solve(participantTwo, 1)
  assert.ok(blocked.error)
  const wrong = await participantOne.rpc('submit_round2_challenge', { p_slot: 1, p_password: 'DEFINITELY-WRONG' })
  assert.ifError(wrong.error); assert.equal(wrong.data.correct, false)
  const noReward = await participantOne.from('team_round2_evidence_unlocks').select('victim_number').eq('slot', 1)
  assert.ifError(noReward.error); assert.equal(noReward.data.length, 0)
  passed('missing Round 1 evidence blocks only its dependent challenge; invalid passwords give no reward')

  check = 'correct password rewards and duplicate prevention'
  for (const slot of [3, 2, 6, 1, 5, 4]) {
    const result = await solve(participantOne, slot)
    assert.ifError(result.error); assert.equal(result.data.correct, true); assert.equal(result.data.victim_number, slot + 6); assert.equal(result.data.revealed_word, `temporary-${words[slot - 1]}`)
    const retry = await solve(participantOne, slot)
    assert.ifError(retry.error); assert.deepEqual(retry.data, result.data)
  }
  const teamOneRewards = await participantOne.from('team_round2_evidence_unlocks').select('team_id,slot,victim_number').order('victim_number')
  assert.ifError(teamOneRewards.error); assert.deepEqual(teamOneRewards.data.map(x=>x.victim_number), [7,8,9,10,11,12]); assert.ok(teamOneRewards.data.every(x=>x.team_id===teamOne.id))
  passed('all six correct answers reveal the mapped victim and word; retries do not duplicate rewards')

  check = 'team-specific progress isolation and refresh restoration'
  for (const slot of [2,3,4,5,6]) { const result = await solve(participantTwo, slot); assert.ifError(result.error); assert.equal(result.data.correct, true) }
  const teamTwoBoard = await participantTwo.rpc('load_round2_challenges')
  assert.ifError(teamTwoBoard.error); assert.equal(teamTwoBoard.data.challenges.filter(c=>c.completed).length,5); assert.ok(teamTwoBoard.data.challenges.find(c=>c.slot===1).is_available===false)
  const ownRows = await participantTwo.from('team_round2_evidence_unlocks').select('team_id,victim_number')
  assert.ifError(ownRows.error); assert.deepEqual(ownRows.data.map(x=>x.victim_number).sort((a,b)=>a-b), [8,9,10,11,12]); assert.ok(ownRows.data.every(x=>x.team_id===teamTwo.id))
  const crossRead = await participantTwo.from('team_round2_evidence_unlocks').select('team_id,victim_number').eq('team_id',teamOne.id)
  assert.ifError(crossRead.error); assert.equal(crossRead.data.length,0)
  const noPhraseUntilSix = await participantTwo.rpc('submit_round2_final_phrase', { p_phrase: phrase })
  assert.ok(noPhraseUntilSix.error)
  passed('teams restore independent progress and evidence; five non-dependent challenges remain usable without Round 1 evidence')

  check = 'final phrase validation and Round 3 remains organizer-controlled'
  check = 'incorrect six-word phrase is accepted for penalty-free checking'
  const badPhrase = await participantOne.rpc('submit_round2_final_phrase', { p_phrase: 'wrong phrase has six harmless words' })
  assert.ifError(badPhrase.error); assert.equal(badPhrase.data, false)
  check = 'correct final phrase validation'
  const correctPhrase = await participantOne.rpc('submit_round2_final_phrase', { p_phrase: phrase })
  assert.ifError(correctPhrase.error); assert.equal(correctPhrase.data, true)
  check = 'final phrase duplicate prevention'
  const repeatPhrase = await participantOne.rpc('submit_round2_final_phrase', { p_phrase: phrase })
  assert.ifError(repeatPhrase.error); assert.equal(repeatPhrase.data, true)
  check = 'final phrase completion persistence'
  const restoredPhraseState = await participantOne.rpc('load_round2_challenges')
  assert.ifError(restoredPhraseState.error); assert.equal(restoredPhraseState.data.phrase_complete,true)
  check = 'final phrase does not activate Round 3'
  const round3 = await admin.from('rounds').select('status').eq('event_id',eventId).eq('round_number',3).single()
  assert.ifError(round3.error); assert.equal(round3.data.status,'locked')
  passed('incorrect phrase has no penalty; correct phrase is idempotent and does not open Round 3')

  check = 'organizer configuration frozen after participant activity'
  const afterPlayEdit = await organizer.client.rpc('save_round2_configuration', { p_event_id: eventId, p_challenges: demoChallenges(), p_final_phrase: null, p_demo_only: true })
  assert.ok(afterPlayEdit.error)
  passed('configuration remains locked after teams start and progress')

  check = 'unauthenticated participant RPC rejection'
  const unauthLoad = await anon.rpc('load_round2_challenges')
  const unauthSubmit = await anon.rpc('submit_round2_challenge', { p_slot: 1, p_password: answers[0] })
  assert.ok(unauthLoad.error); assert.ok(unauthSubmit.error)
  passed('anonymous callers cannot load or submit Round 2')
} catch (error) {
  process.stderr.write(`FAIL: ${check} (code ${error?.code ?? 'ASSERTION_OR_SETUP_ERROR'}). Details withheld to avoid printing fixture data.\n`)
  process.exitCode = 1
} finally {
  for (const client of clients) { try { await client.auth.signOut({ scope: 'global' }) } catch { process.exitCode = 1 } }
  if (teamCodes.length) {
    try {
      const { error } = await admin.from('teams').update({ status: 'suspended' }).in('team_code', teamCodes)
      if (error) throw error
      const { data, error: verify } = await admin.from('teams').select('status').in('team_code', teamCodes)
      if (verify || !data?.length || data.some(t=>t.status!=='suspended')) throw verify ?? new Error('team suspension verification failed')
    } catch { process.stderr.write('CLEANUP ERROR: test-created teams were not fully verified as suspended.\n'); process.exitCode = 1 }
  }
  if (eventId) {
    try {
      await admin.from('rounds').update({ status: 'ended' }).eq('event_id', eventId).eq('round_number', 2)
      const { error } = await admin.from('events').update({ status: 'cancelled' }).eq('id', eventId)
      if (error) throw error
    } catch { process.stderr.write('CLEANUP ERROR: test event cancellation could not be verified.\n'); process.exitCode = 1 }
  }
  if (organizerId) {
    try {
      const { error } = await admin.from('organizer_roles').delete().eq('user_id', organizerId)
      if (error) throw error
      await admin.auth.admin.updateUserById(organizerId, { ban_duration: '876000h' })
    } catch { process.stderr.write('CLEANUP ERROR: temporary organizer role deactivation could not be verified.\n'); process.exitCode = 1 }
  }
  if (teamCodes.length) process.stdout.write('CLEANUP: own test sessions revoked, temporary teams suspended, organizer role deactivated and test event cancelled. No existing teams or project data were deleted.\n')
}
