import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getVenuesAction,
  createVenueAction,
  deleteVenueAction,
} from '../../src/app/actions/venues'
import {
  getTransactionsAction,
  createTransactionAction,
  deleteTransactionAction,
} from '../../src/app/actions/transactions'
import { runDeduplicationAction } from '../../src/app/actions/deduplication'
import {
  getInventoryItemsAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
} from '../../src/app/actions/inventory'
import {
  getCashBalancesAction,
  setCashBalanceAction,
} from '../../src/app/actions/cash'

test('Server Actions: getVenuesAction returns formatted venues', async () => {
  const venues = await getVenuesAction()
  assert.ok(Array.isArray(venues))
  assert.ok(venues.length > 0)
  assert.equal(typeof venues[0].createdAt, 'string')
  assert.ok(venues[0].deduplicationSettings)
})

test('Server Actions: venue creation and deletion lifecycle', async () => {
  const created = await createVenueAction('Тестовая Кофейня', 'ул. Тестовая, 1')
  assert.ok(created.id)
  assert.equal(created.name, 'Тестовая Кофейня')

  const res = await deleteVenueAction(created.id)
  assert.equal(res.success, true)
})

test('Server Actions: transactions and real deduplication run', async () => {
  const txs = await getTransactionsAction('venue-1')
  assert.ok(txs.length > 0)

  // Create two matching expenses (e.g. one from iiko and one from bank)
  const tx1 = await createTransactionAction({
    venueId: 'venue-1',
    source: 'iiko',
    date: '2026-11-08',
    amount: 75000,
    type: 'expense',
    category: 'food',
    counterparty: 'ООО МясоСнаб',
    description: 'Поставка мяса говядина',
    status: 'unique',
  })

  const tx2 = await createTransactionAction({
    venueId: 'venue-1',
    source: 'bank',
    date: '2026-11-08',
    amount: 75000,
    type: 'expense',
    category: 'food',
    counterparty: 'ООО МЯСОСНАБ',
    description: 'Оплата по счету 124',
    status: 'unique',
  })

  // Run real deduplication action
  const pairs = await runDeduplicationAction('venue-1')
  assert.ok(Array.isArray(pairs))
  assert.ok(pairs.length > 0, 'deduplication should find matching pairs')

  const matchedPair = pairs.find(
    (p) =>
      (p.leftTransaction.id === tx1.id && p.rightTransaction.id === tx2.id) ||
      (p.leftTransaction.id === tx2.id && p.rightTransaction.id === tx1.id)
  )
  assert.ok(matchedPair, 'should find the matching pair between tx1 and tx2')
  assert.ok(matchedPair.matchScore >= 60)

  // Clean up
  await deleteTransactionAction(tx1.id)
  await deleteTransactionAction(tx2.id)
})

test('Server Actions: inventory item lifecycle', async () => {
  const item = await createInventoryItemAction({
    venueId: 'venue-1',
    name: 'Кофе зерновой Эфиопия',
    category: 'bar',
    unit: 'кг',
    expectedQty: 20,
    actualQty: 18.5,
    pricePerUnit: 1400,
  })

  assert.ok(item.id)
  assert.equal(item.name, 'Кофе зерновой Эфиопия')

  const list = await getInventoryItemsAction('venue-1')
  assert.ok(list.some((i) => i.id === item.id))

  await deleteInventoryItemAction(item.id)
  const afterList = await getInventoryItemsAction('venue-1')
  assert.ok(!afterList.some((i) => i.id === item.id))
})

test('Server Actions: cash balances upsert and fetch', async () => {
  await setCashBalanceAction('venue-1', '2026-11', 450000)

  const balances = await getCashBalancesAction('venue-1')
  assert.equal(balances['2026-11'], 450000)
})
