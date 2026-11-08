import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../../src/lib/auth/password'
import { createSessionToken, verifySessionToken } from '../../src/lib/auth/jwt'
import { createUser, findUserByEmail, validateUserCredentials } from '../../src/lib/db/users'
import { getCurrentUserAction } from '../../src/app/actions/auth'

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

test('Auth: getCurrentUserAction returns null when session token is missing (no auth bypass)', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers')
  const originalCookies = nextHeaders.cookies
  const originalEnv = process.env.ALLOW_DEV_FALLBACK_AUTH
  delete process.env.ALLOW_DEV_FALLBACK_AUTH

  try {
    nextHeaders.cookies = async () => ({
      get: () => undefined,
      set: () => {},
      delete: () => {},
    })

    const user = await getCurrentUserAction()
    assert.equal(user, null, 'Unauthenticated request must return null, not impersonate default user')
  } finally {
    nextHeaders.cookies = originalCookies
    if (originalEnv !== undefined) {
      process.env.ALLOW_DEV_FALLBACK_AUTH = originalEnv
    } else {
      delete process.env.ALLOW_DEV_FALLBACK_AUTH
    }
  }
})

test('Auth: getCurrentUserAction returns user when valid session token is present', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers')
  const originalCookies = nextHeaders.cookies

  // Create a real user in DB to ensure findUserById works
  const testEmail = `auth_test_${Date.now()}@finrest.local`
  const passwordHash = await hashPassword('TestPass123!')
  const created = await createUser({
    email: testEmail,
    passwordHash,
    name: 'Тестовый Пользователь',
    role: 'MANAGER',
  })

  const token = await createSessionToken({
    userId: created.id,
    email: created.email,
    role: created.role as 'OWNER' | 'MANAGER' | 'ACCOUNTANT',
    name: created.name,
  })

  try {
    nextHeaders.cookies = async () => ({
      get: (name: string) => (name === 'finrest_session' ? { value: token } : undefined),
      set: () => {},
      delete: () => {},
    })

    const user = await getCurrentUserAction()
    assert.ok(user)
    assert.equal(user?.userId, created.id)
    assert.equal(user?.email, testEmail)
    assert.equal(user?.role, 'MANAGER')
    assert.equal(user?.name, 'Тестовый Пользователь')
  } finally {
    nextHeaders.cookies = originalCookies
  }
})

test('Auth: getCurrentUserAction returns null when invalid token is provided', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers')
  const originalCookies = nextHeaders.cookies

  try {
    nextHeaders.cookies = async () => ({
      get: (name: string) => (name === 'finrest_session' ? { value: 'tampered.or.invalid.token' } : undefined),
      set: () => {},
      delete: () => {},
    })

    const user = await getCurrentUserAction()
    assert.equal(user, null)
  } finally {
    nextHeaders.cookies = originalCookies
  }
})

test('Auth: getCurrentUserAction dev fallback only works if explicitly enabled in development', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nextHeaders = require('next/headers')
  const originalCookies = nextHeaders.cookies
  const origNodeEnv = process.env.NODE_ENV
  const origFallback = process.env.ALLOW_DEV_FALLBACK_AUTH

  try {
    nextHeaders.cookies = async () => ({
      get: () => undefined,
      set: () => {},
      delete: () => {},
    })

    // 1. Explicitly enabled in development mode -> can return default seed user
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
    process.env.ALLOW_DEV_FALLBACK_AUTH = 'true'
    const devUser = await getCurrentUserAction()
    assert.ok(devUser, 'Dev fallback should return user when explicitly configured in dev')

    // 2. Disabled in development mode -> must return null
    process.env.ALLOW_DEV_FALLBACK_AUTH = 'false'
    const devDisabledUser = await getCurrentUserAction()
    assert.equal(devDisabledUser, null, 'Must return null when dev fallback is not true')

    // 3. In production mode, even if ALLOW_DEV_FALLBACK_AUTH=true, must return null
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    process.env.ALLOW_DEV_FALLBACK_AUTH = 'true'
    const prodUser = await getCurrentUserAction()
    assert.equal(prodUser, null, 'Must NEVER return dev fallback in production')
  } finally {
    nextHeaders.cookies = originalCookies
    ;(process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv
    if (origFallback !== undefined) {
      process.env.ALLOW_DEV_FALLBACK_AUTH = origFallback
    } else {
      delete process.env.ALLOW_DEV_FALLBACK_AUTH
    }
  }
})


