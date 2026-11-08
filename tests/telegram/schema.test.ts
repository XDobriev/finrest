import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'

test('Telegram DB Schema: models lifecycle and relations', async () => {
  // Setup a test user
  const user = await prisma.user.create({
    data: {
      email: `tg_test_${Date.now()}@finrest.ru`,
      name: 'Chef Test',
      role: 'MANAGER',
    },
  })

  // Setup a test venue
  const venue = await prisma.venue.create({
    data: {
      name: 'Telegram Test Bistro',
      ownerId: user.id,
    },
  })

  try {
    // 1. Create TelegramAuthToken with 6-digit PIN and deep-link token
    const token = await prisma.telegramAuthToken.create({
      data: {
        userId: user.id,
        token: `auth_${Date.now()}`,
        pin: '482195',
        venueId: venue.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })
    assert.ok(token.id)
    assert.equal(token.pin, '482195')

    // 2. Create TelegramAccount linked to User
    const tgAccount = await prisma.telegramAccount.create({
      data: {
        telegramId: BigInt(987654321),
        username: 'chef_khamzat',
        firstName: 'Khamzat',
        userId: user.id,
        activeVenueId: venue.id,
      },
    })
    assert.ok(tgAccount.id)
    assert.equal(tgAccount.telegramId, BigInt(987654321))
    assert.equal(tgAccount.activeVenueId, venue.id)

    // 3. Create TelegramSession
    const session = await prisma.telegramSession.create({
      data: {
        telegramAccountId: tgAccount.id,
        key: 'fsm_state',
        value: { step: 'awaiting_expense_photo', amount: 15400 },
      },
    })
    assert.ok(session.id)
    assert.deepEqual(session.value, { step: 'awaiting_expense_photo', amount: 15400 })

    // 4. Create Transaction and ReceiptScan
    const tx = await prisma.transaction.create({
      data: {
        venueId: venue.id,
        source: 'manual',
        date: new Date('2026-11-08'),
        amount: 14500,
        type: 'expense',
        category: 'food',
        counterparty: 'Фуд Сити',
        description: 'Свежая зелень и томаты',
        status: 'unique',
      },
    })

    const scan = await prisma.receiptScan.create({
      data: {
        telegramAccountId: tgAccount.id,
        venueId: venue.id,
        sourceType: 'vision_llm',
        rawText: 'Томаты 20кг 9000, Зелень 5500',
        extractedAmount: 14500,
        extractedDate: new Date('2026-11-08'),
        extractedVendor: 'Фуд Сити',
        category: 'food',
        confidence: 0.95,
        status: 'confirmed',
        transactionId: tx.id,
      },
    })
    assert.ok(scan.id)
    assert.equal(scan.status, 'confirmed')
    assert.equal(scan.transactionId, tx.id)

    // Verify relations queries
    const loadedAccount = await prisma.telegramAccount.findUnique({
      where: { telegramId: BigInt(987654321) },
      include: {
        user: true,
        venue: true,
        receiptScans: true,
        sessions: true,
      },
    })
    assert.ok(loadedAccount)
    assert.equal(loadedAccount.user.id, user.id)
    assert.equal(loadedAccount.venue?.id, venue.id)
    assert.equal(loadedAccount.receiptScans.length, 1)
    assert.equal(loadedAccount.sessions.length, 1)

  } finally {
    // Cleanup
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
