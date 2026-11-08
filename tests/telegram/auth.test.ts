import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import {
  generateAuthToken,
  verifyAndLinkTelegramAccount,
  getTelegramAccount,
  setActiveVenue,
} from '../../src/lib/telegram/auth'

test('Telegram Auth: generate token/PIN and link account successfully via deep-link token', async () => {
  // Create test user and venue
  const user = await prisma.user.create({
    data: {
      email: `tg_auth_test_${Date.now()}@finrest.ru`,
      name: 'Owner Elena',
      role: 'OWNER',
    },
  })
  const venue = await prisma.venue.create({
    data: {
      name: 'Bistro Mon Repos',
      ownerId: user.id,
    },
  })

  try {
    // 1. Generate auth token and PIN
    const authData = await generateAuthToken(user.id, venue.id)
    assert.ok(authData.token.startsWith('auth_'))
    assert.match(authData.pin, /^\d{6}$/)
    assert.ok(authData.expiresAt.getTime() > Date.now())

    // 2. Link using deep-link token
    const linkResult = await verifyAndLinkTelegramAccount(
      {
        id: 777123456,
        username: 'elena_rest',
        firstName: 'Elena',
        lastName: 'Petrova',
      },
      authData.token
    )

    assert.equal(linkResult.success, true)
    assert.ok(linkResult.account)
    assert.equal(linkResult.account?.userId, user.id)
    assert.equal(linkResult.account?.activeVenueId, venue.id)

    // 3. Verify token was consumed and cannot be reused
    const secondTry = await verifyAndLinkTelegramAccount(
      { id: 888999000 },
      authData.token
    )
    assert.equal(secondTry.success, false)

    // 4. Check getTelegramAccount
    const fetched = await getTelegramAccount(777123456)
    assert.ok(fetched)
    assert.equal(fetched.user.email, user.email)
    assert.equal(fetched.venue?.name, 'Bistro Mon Repos')

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Auth: link account successfully via 6-digit PIN with formatting (482-195)', async () => {
  const user = await prisma.user.create({
    data: {
      email: `tg_pin_test_${Date.now()}@finrest.ru`,
      name: 'Chef Maxim',
      role: 'MANAGER',
    },
  })
  const venue1 = await prisma.venue.create({
    data: { name: 'Restaurant Meat & Fire', ownerId: user.id },
  })
  const venue2 = await prisma.venue.create({
    data: { name: 'Bar Neon Lights', ownerId: user.id },
  })

  try {
    const authData = await generateAuthToken(user.id, venue1.id)

    // Format PIN with dash e.g. "123-456"
    const formattedPin = `${authData.pin.slice(0, 3)}-${authData.pin.slice(3)}`

    const linkResult = await verifyAndLinkTelegramAccount(
      { id: 999111222, username: 'maxim_chef' },
      formattedPin
    )
    assert.equal(linkResult.success, true)
    assert.ok(linkResult.account)
    assert.equal(linkResult.account.activeVenueId, venue1.id)

    // Test switching active venue
    const switchSuccess = await setActiveVenue(999111222, venue2.id)
    assert.equal(switchSuccess, true)

    const updated = await getTelegramAccount(999111222)
    assert.equal(updated?.activeVenueId, venue2.id)

  } finally {
    await prisma.venue.delete({ where: { id: venue1.id } }).catch(() => {})
    await prisma.venue.delete({ where: { id: venue2.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Auth: rejects expired token or invalid PIN', async () => {
  const user = await prisma.user.create({
    data: {
      email: `tg_exp_test_${Date.now()}@finrest.ru`,
    },
  })

  try {
    // Expired token
    await prisma.telegramAuthToken.create({
      data: {
        userId: user.id,
        token: 'auth_expired_test',
        pin: '111222',
        expiresAt: new Date(Date.now() - 1000), // in the past
      },
    })

    const resultExpired = await verifyAndLinkTelegramAccount(
      { id: 12345 },
      'auth_expired_test'
    )
    assert.equal(resultExpired.success, false)

    const resultInvalid = await verifyAndLinkTelegramAccount(
      { id: 12345 },
      '000000'
    )
    assert.equal(resultInvalid.success, false)

  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
