import test from 'node:test'
import assert from 'node:assert/strict'
import { getBalanceSnapshot, upsertBalanceSnapshot } from '../../src/lib/db/balance'
import { prisma } from '../../src/lib/db/client'

test('Balance Repository: calculates default snapshot and persists updates', async () => {
  // 1. Get or create a test venue
  let venue = await prisma.venue.findFirst({
    where: { name: 'Кафе на Арбате' },
  })
  if (!venue) {
    venue = await prisma.venue.create({
      data: { name: 'Кафе на Арбате' },
    })
  }
  assert.ok(venue, 'Demo venue should exist')

  const monthKey = '2026-11'

  // Clean up any existing snapshot for this test run
  await prisma.balanceSnapshot.deleteMany({
    where: { venueId: venue.id, monthKey },
  })

  // 2. Initial fetch should return default computed values
  const initialSnapshot = await getBalanceSnapshot(venue.id, monthKey)
  assert.equal(initialSnapshot.venueId, venue.id)
  assert.equal(initialSnapshot.monthKey, monthKey)
  assert.equal(typeof initialSnapshot.cashAmount, 'number')
  assert.equal(typeof initialSnapshot.inventoryFood, 'number')
  assert.equal(typeof initialSnapshot.inventoryBar, 'number')

  // 3. Upsert custom snapshot
  const saved = await upsertBalanceSnapshot({
    venueId: venue.id,
    monthKey,
    cashAmount: 2500000,
    inventoryFood: 300000,
    inventoryBar: 200000,
    accountsReceivable: 100000,
    accountsPayable: 800000,
    payrollPayable: 500000,
    taxesPayable: 120000,
    guestPrepayments: 80000,
    safetyReserveDays: 14,
  })

  assert.equal(saved.cashAmount, 2500000)
  assert.equal(saved.accountsPayable, 800000)
  assert.equal(saved.safetyReserveDays, 14)

  // 4. Fetch again to verify persistence
  const fetched = await getBalanceSnapshot(venue.id, monthKey)
  assert.equal(fetched.cashAmount, 2500000)
  assert.equal(fetched.accountsPayable, 800000)
  assert.equal(fetched.safetyReserveDays, 14)
})
