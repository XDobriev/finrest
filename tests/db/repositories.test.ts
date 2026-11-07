import test from 'node:test'
import assert from 'node:assert/strict'
import { getVenues, getVenueById } from '../../src/lib/db/venues'
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
} from '../../src/lib/db/transactions'

test('Venue repository: fetches venues from database', async () => {
  const venues = await getVenues()
  assert.ok(Array.isArray(venues), 'venues should be an array')
  assert.ok(venues.length > 0, 'there should be at least one venue')

  const firstVenue = venues[0]
  const fetched = await getVenueById(firstVenue.id)
  assert.ok(fetched, 'fetched venue should exist')
  assert.equal(fetched?.id, firstVenue.id)
})

test('Transaction repository: filters transactions by venue and source', async () => {
  const allTxs = await getTransactions('venue-1')
  assert.ok(allTxs.length > 0, 'venue-1 should have seeded transactions')

  const bankTxs = await getTransactions('venue-1', { source: 'bank' })
  assert.ok(bankTxs.length > 0, 'should find bank transactions')
  assert.ok(bankTxs.every((t) => t.source === 'bank'), 'all returned transactions must be from bank')
})

test('Transaction repository: create and delete lifecycle', async () => {
  const newTx = await createTransaction({
    venueId: 'venue-1',
    source: 'manual',
    date: '2026-11-08',
    amount: 15400,
    type: 'expense',
    category: 'household',
    counterparty: 'ООО ХозМаг',
    description: 'Тестовая закупка инвентаря',
  })

  assert.ok(newTx.id, 'created transaction must have an id')
  assert.equal(newTx.amount, 15400)
  assert.equal(newTx.counterparty, 'ООО ХозМаг')

  // Clean up
  await deleteTransaction(newTx.id)
  const afterDelete = await getTransactions('venue-1')
  assert.ok(!afterDelete.some((t) => t.id === newTx.id), 'transaction must be removed')
})
