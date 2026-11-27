import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRef = 'bfzlszktufjqlfiyknga'
const projectName = 'the-hunt-for-18-test'
const linkedRef = readFileSync(resolve('supabase/.temp/project-ref'), 'utf8').trim()
if (linkedRef !== projectRef) {
  throw new Error('Refusing hosted tests: linked project reference is not the approved test project.')
}

const command = 'npm.cmd exec --yes --package=supabase -- supabase projects api-keys --remote=bfzlszktufjqlfiyknga --reveal --output json'
const keyProcess = spawnSync('cmd.exe', ['/d', '/s', '/c', command], {
  cwd: process.cwd(),
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 8 * 1024 * 1024,
})
const keyOutput = `${keyProcess.stdout ?? ''}\n${keyProcess.stderr ?? ''}`
if (keyProcess.status !== 0 || !keyOutput.includes(`project ${projectName} (${projectRef})`)) {
  throw new Error('Test API key retrieval failed or the CLI target did not match the approved test project; output suppressed.')
}

const lines = keyOutput.split(/\r?\n/)
const jsonStart = lines.findIndex(line => line.trim() === '[')
if (jsonStart < 0) throw new Error('Test API key metadata was unavailable; output suppressed.')
const jsonEnd = lines.findLastIndex(line => line.trim() === ']')
if (jsonEnd < jsonStart) throw new Error('Test API key metadata was incomplete; output suppressed.')
let keyRows
try {
  keyRows = JSON.parse(lines.slice(jsonStart, jsonEnd + 1).join('\n'))
} catch {
  throw new Error('Test API key metadata could not be parsed; output suppressed.')
}

const publishableKey = keyRows.find(row => row.type === 'publishable')?.api_key
const serviceRoleKey = keyRows.find(row => row.type === 'legacy' && row.name === 'service_role')?.api_key
  ?? keyRows.find(row => row.type === 'secret')?.api_key
if (typeof publishableKey !== 'string' || typeof serviceRoleKey !== 'string') {
  throw new Error('Required test-project key types were unavailable; values suppressed.')
}

process.env.HUNT18_TEST_SUPABASE_URL = `https://${projectRef}.supabase.co`
process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY = publishableKey
process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey
process.env.VITE_SUPABASE_URL = `https://${projectRef}.supabase.co`
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = publishableKey

const suites = [
  ['Authentication', 'supabase/tests/team-auth.remote.mjs'],
  ['Round 1', 'supabase/tests/classic-sudoku.remote.mjs'],
  ['Round 2', 'supabase/tests/round2-password-breaker.remote.mjs'],
  ['Round 3', 'supabase/tests/round3-crypto-protocol.remote.mjs'],
]
const suiteAliases = new Map([['auth', 'Authentication'], ['round1', 'Round 1'], ['round2', 'Round 2'], ['round3', 'Round 3']])
const requestedSuite = process.argv[2]
const selectedSuites = requestedSuite
  ? suites.filter(([name]) => name === suiteAliases.get(requestedSuite))
  : suites
if (selectedSuites.length === 0) throw new Error('Unknown hosted suite selector.')

let failed = false
for (const [name, script] of selectedSuites) {
  process.stdout.write(`\n=== ${name} hosted suite ===\n`)
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error || result.status !== 0) {
    process.stderr.write(`${name} hosted suite failed (exit ${result.status ?? 'spawn error'}).\n`)
    failed = true
    break
  }
}

delete process.env.HUNT18_TEST_SUPABASE_URL
delete process.env.HUNT18_TEST_SUPABASE_PUBLISHABLE_KEY
delete process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY
delete process.env.VITE_SUPABASE_URL
delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (failed) process.exitCode = 1
else process.stdout.write('\nSelected hosted suite(s) completed successfully.\n')
