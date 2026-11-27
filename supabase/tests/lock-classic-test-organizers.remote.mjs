import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const projectRef = 'bfzlszktufjqlfiyknga'
const supabaseUrl = process.env.HUNT18_TEST_SUPABASE_URL
const serviceRoleKey = process.env.HUNT18_TEST_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || new URL(supabaseUrl).hostname !== `${projectRef}.supabase.co`) {
  throw new Error('Refusing to run: URL must identify the approved test project.')
}
if (!serviceRoleKey) throw new Error('Provide the test-project service-role key through process environment.')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

try {
  let page = 1
  let lockedAccounts = 0
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    assert.ifError(error)

    const testOrganizers = data.users.filter((user) =>
      user.email?.startsWith('classic-test-organizer-'),
    )
    for (const user of testOrganizers) {
      const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
        ban_duration: '876000h',
      })
      assert.ifError(banError)
      const { data: check, error: checkError } = await admin.auth.admin.getUserById(user.id)
      assert.ifError(checkError)
      assert.ok(check.user?.banned_until)
      lockedAccounts += 1
    }

    if (data.users.length < 1000) break
    page += 1
  }

  process.stdout.write(`PASS: locked ${lockedAccounts} synthetic Classic Sudoku organizer account(s); no records deleted.\n`)
} catch {
  process.stderr.write('FAIL: synthetic organizer account lock could not be verified.\n')
  process.exitCode = 1
}
