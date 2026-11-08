import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import {
  createTelegramAuthTokenAction,
  getTelegramStatusAction,
  disconnectTelegramAction,
} from '../../src/app/actions/telegram'

test('Telegram Server Actions: generates auth token and checks connection status', async () => {
  const user = await prisma.user.create({
    data: {
      email: `act_tg_${Date.now()}@finrest.ru`,
      name: 'Owner Action',
    },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Action Resto', ownerId: user.id },
  })

  try {
    // 1. Initial status is disconnected
    const initialStatus = await getTelegramStatusAction(user.id)
    assert.equal(initialStatus.isConnected, false)

    // 2. Generate auth token
    const tokenResult = await createTelegramAuthTokenAction(user.id, venue.id)
    assert.ok(tokenResult.token.startsWith('auth_'))
    assert.match(tokenResult.pin, /^\d{6}$/)
    assert.ok(tokenResult.deepLink.includes(tokenResult.token))

    // 3. Connect mock telegram account
    await prisma.telegramAccount.create({
      data: {
        telegramId: BigInt(444555666),
        userId: user.id,
        activeVenueId: venue.id,
        username: 'action_owner',
      },
    })

    const connectedStatus = await getTelegramStatusAction(user.id)
    assert.equal(connectedStatus.isConnected, true)
    assert.equal(connectedStatus.username, 'action_owner')

    // 4. Disconnect
    const disconnectResult = await disconnectTelegramAction(user.id)
    assert.equal(disconnectResult.success, true)

    const afterDisconnect = await getTelegramStatusAction(user.id)
    assert.equal(afterDisconnect.isConnected, false)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
