import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import { TBankClient } from '../../src/lib/bank/tbank-client'
import { TochkaClient } from '../../src/lib/bank/tochka-client'
import { syncBankConnection } from '../../src/lib/bank/sync'
import {
  connectBankAction,
  getBankConnectionsAction,
  disconnectBankAction,
  syncBankAction,
  testBankAction,
} from '../../src/app/actions/bank'

test('T-Bank Client: mock/sandbox mode returns realistic HoReCa statement', async () => {
  const client = new TBankClient({
    token: 'tbank_sandbox_token_123',
    isSandbox: true,
  })

  const isValid = await client.testConnection()
  assert.equal(isValid, true)

  const statement = await client.getStatement({
    accountNumber: '40702810900000012345',
    dateFrom: '2026-11-01',
    dateTo: '2026-11-08',
  })

  assert.ok(Array.isArray(statement))
  assert.ok(statement.length >= 3, 'Should return multiple operations')

  // Check acquiring payout operation
  const acquiring = statement.find((tx) => tx.type === 'income')
  assert.ok(acquiring, 'Must have income acquiring payout')
  assert.ok(acquiring.amount > 0)
  assert.match(acquiring.counterparty, /Т-Банк|Эквайринг|Тинькофф/i)

  // Check supplier expense operation
  const supplierExpense = statement.find((tx) => tx.type === 'expense' && /мяс|овощ|продукт|постав/i.test(tx.counterparty + ' ' + tx.paymentPurpose))
  assert.ok(supplierExpense, 'Must have supplier expense operation')
})

test('Tochka Client: mock/sandbox mode returns realistic statement and validates connection', async () => {
  const client = new TochkaClient({
    token: 'tochka_mock_token_456',
    isSandbox: true,
  })

  const isValid = await client.testConnection()
  assert.equal(isValid, true)

  const statement = await client.getStatement({
    accountNumber: '40702810800000067890',
    dateFrom: '2026-11-01',
    dateTo: '2026-11-08',
  })

  assert.ok(Array.isArray(statement))
  assert.ok(statement.length >= 3)
  const expense = statement.find((tx) => tx.type === 'expense')
  assert.ok(expense)
})

test('Bank Sync Pipeline: imports transactions and triggers auto-matching with iiko', async () => {
  const user = await prisma.user.create({
    data: { email: `bank_sync_test_${Date.now()}@finrest.ru`, name: 'Bank Test Owner' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'ГастроБар Банк Тест', ownerId: user.id },
  })

  try {
    // 1. Create a matching iiko transaction for deduplication test
    // An acquiring income on 2026-11-07 for 185,000 ₽
    const iikoTx = await prisma.transaction.create({
      data: {
        venueId: venue.id,
        source: 'iiko',
        date: new Date('2026-11-07T21:00:00Z'),
        amount: 185000,
        type: 'income',
        category: 'other',
        counterparty: 'Касса iiko Эквайринг',
        description: 'Выручка безналичная смена №142',
        status: 'unique',
      },
    })
    assert.ok(iikoTx.id)

    // 2. Connect T-Bank for this venue
    const connection = await prisma.bankConnection.create({
      data: {
        venueId: venue.id,
        bankType: 'TBANK',
        accountNumber: '40702810900000012345',
        token: 'sandbox_token_abc',
        isSandbox: true,
        status: 'connected',
      },
    })

    // 3. Run Bank Sync
    const result = await syncBankConnection(connection.id)
    assert.equal(result.success, true)
    assert.ok(result.syncedCount >= 3)

    // 4. Verify transactions exist in DB with source: 'bank'
    const bankTxs = await prisma.transaction.findMany({
      where: { venueId: venue.id, source: 'bank' },
    })
    assert.ok(bankTxs.length >= 3)

    // 5. Test idempotency: syncing again should NOT duplicate transactions
    const secondSync = await syncBankConnection(connection.id)
    assert.equal(secondSync.success, true)
    assert.equal(secondSync.syncedCount, 0, 'Second sync must be idempotent and not re-insert existing txs')

    const bankTxsAfter = await prisma.transaction.findMany({
      where: { venueId: venue.id, source: 'bank' },
    })
    assert.equal(bankTxsAfter.length, bankTxs.length)

    // 6. Verify deduplication was run and matched bank acquiring with iiko sales
    const pairs = await prisma.deduplicationPair.findMany({
      where: { venueId: venue.id },
    })
    assert.ok(pairs.length >= 1, 'Auto-matching must generate deduplication pair')

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Bank Server Actions: connect, list, sync, disconnect lifecycle', async () => {
  const user = await prisma.user.create({
    data: { email: `bank_actions_${Date.now()}@finrest.ru`, name: 'Bank Action User' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Бистро Банк Экшн', ownerId: user.id },
  })

  try {
    // 1. Test connection action
    const testRes = await testBankAction('TBANK', 'valid_test_token', true)
    assert.equal(testRes.success, true)

    // 2. Connect bank action
    const conn = await connectBankAction(venue.id, {
      bankType: 'TBANK',
      accountNumber: '40702810999999999999',
      token: 'demo_token_key',
      isSandbox: true,
    })
    assert.ok(conn.id)
    assert.equal(conn.bankType, 'TBANK')

    // 3. List connections action
    const list = await getBankConnectionsAction(venue.id)
    assert.equal(list.length, 1)
    assert.equal(list[0].id, conn.id)

    // 4. Sync bank action
    const syncRes = await syncBankAction(conn.id)
    assert.equal(syncRes.success, true)

    // 5. Disconnect bank action
    const discRes = await disconnectBankAction(conn.id)
    assert.equal(discRes.success, true)

    const listAfter = await getBankConnectionsAction(venue.id)
    const disconnectedConn = listAfter.find((c) => c.id === conn.id)
    assert.equal(disconnectedConn?.status, 'disconnected')

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})
