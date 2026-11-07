import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../../src/lib/auth/password'
import { createSessionToken, verifySessionToken } from '../../src/lib/auth/jwt'
import { createUser, findUserByEmail, validateUserCredentials } from '../../src/lib/db/users'

test('Auth: password hashing and verification', async () => {
  const plain = 'SuperSecret123!'
  const hashed = await hashPassword(plain)

  assert.notEqual(hashed, plain)
  assert.equal(typeof hashed, 'string')
  assert.equal(await verifyPassword(plain, hashed), true)
  assert.equal(await verifyPassword('WrongPassword', hashed), false)
})

test('Auth: JWT token creation and verification', async () => {
  const payload = {
    userId: 'user-test-123',
    email: 'owner@restaurant.ru',
    role: 'OWNER' as const,
  }

  const token = await createSessionToken(payload)
  assert.equal(typeof token, 'string')
  assert.ok(token.length > 20)

  const verified = await verifySessionToken(token)
  assert.ok(verified)
  assert.equal(verified?.userId, 'user-test-123')
  assert.equal(verified?.email, 'owner@restaurant.ru')
  assert.equal(verified?.role, 'OWNER')

  // Verify invalid token returns null
  const invalid = await verifySessionToken('invalid.token.here')
  assert.equal(invalid, null)
})

test('Auth: database user lifecycle and credentials validation', async () => {
  const testEmail = `test_${Date.now()}@finrest.local`
  const password = 'Password@2026'
  const hashedPassword = await hashPassword(password)

  // Create user
  const user = await createUser({
    email: testEmail,
    passwordHash: hashedPassword,
    name: 'Иван Ресторатор',
    role: 'OWNER',
  })

  assert.ok(user.id)
  assert.equal(user.email, testEmail)
  assert.equal(user.name, 'Иван Ресторатор')
  assert.equal(user.role, 'OWNER')

  // Find user by email
  const found = await findUserByEmail(testEmail)
  assert.ok(found)
  assert.equal(found?.id, user.id)

  // Validate valid credentials
  const validUser = await validateUserCredentials(testEmail, password)
  assert.ok(validUser)
  assert.equal(validUser?.id, user.id)

  // Validate invalid password
  const badPassword = await validateUserCredentials(testEmail, 'WrongPassword!')
  assert.equal(badPassword, null)

  // Validate non-existent user
  const nonExistent = await validateUserCredentials('nobody@finrest.local', 'password')
  assert.equal(nonExistent, null)
})
