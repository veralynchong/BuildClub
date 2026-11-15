import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const login = readFileSync(new URL('../src/components/LoginScreen.tsx', import.meta.url), 'utf8')

test('the sign-in page speaks to a tester, not to an agency, and offers no Coming-soon Client option', () => {
  assert.match(login, /Sign in with the account we sent you\./)
  assert.doesNotMatch(login, /agency set up/i)
  assert.doesNotMatch(login, /you@agency\.com/)
  assert.doesNotMatch(login, /Coming soon/)
  assert.doesNotMatch(login, /<strong>Client<\/strong>/)
})
