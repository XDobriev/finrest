import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getVenuesAction,
  createVenueAction,
  deleteVenueAction,
} from '../../src/app/actions/venues'
import {
  getTransactionsAction,
  getTransactionByIdAction,
  createTransactionAction,
  createTransactionsBatchAction,
  deleteTransactionAction,
} from '../../src/app/actions/transactions'
import { runDeduplicationAction, resolveDeduplicationPairAction } from '../../src/app/actions/deduplication'
import {
  getInventoryItemsAction,
  createInventoryItemAction,
  deleteInventoryItemAction,
} from '../../src/app/actions/inventory'
import {
  getCashBalancesAction,
  getCashBalanceDetailsAction,
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

test('Server Actions: deduplication detects duplicate income transactions (e.g. iiko sales vs bank acquiring)', async () => {
  // Income 1: Daily shift sales from iiko
  const inc1 = await createTransactionAction({
    venueId: 'venue-1',
    source: 'iiko',
    date: '2026-11-08',
    amount: 145000,
    type: 'income',
    category: 'other',
    counterparty: 'Касса iiko',
    description: 'Выручка кассовой смены за 08.11.2026',
    status: 'unique',
  })

  // Income 2: Acquiring bank payout
  const inc2 = await createTransactionAction({
    venueId: 'venue-1',
    source: 'bank',
    date: '2026-11-08',
    amount: 145000,
    type: 'income',
    category: 'other',
    counterparty: 'АО Т-Банк Эквайринг',
    description: 'Возмещение по эквайрингу за 08.11.2026',
    status: 'unique',
  })

  try {
    const pairs = await runDeduplicationAction('venue-1')
    const matched = pairs.find(
      (p) =>
        (p.leftTransaction.id === inc1.id && p.rightTransaction.id === inc2.id) ||
        (p.leftTransaction.id === inc2.id && p.rightTransaction.id === inc1.id)
    )

    assert.ok(matched, 'Deduplication must detect matching income transactions')
    assert.equal(matched.leftTransaction.type, 'income')
    assert.equal(matched.rightTransaction.type, 'income')

    // Test atomic merge
    const res = await resolveDeduplicationPairAction(matched.id, 'merge')
    assert.equal(res.success, true)

    // Verify right transaction is now duplicate
    const rightUpdated = await getTransactionByIdAction(matched.rightTransaction.id)
    assert.equal(rightUpdated?.status, 'duplicate')
    assert.equal(rightUpdated?.duplicateOfId, matched.leftTransaction.id)
  } finally {
    await deleteTransactionAction(inc1.id)
    await deleteTransactionAction(inc2.id)
  }
})

test('Server Actions: createTransactionsBatchAction batch inserts multiple transactions in 1 DB call', async () => {
  const batchData = [
    {
      venueId: 'venue-1',
      source: 'admin' as const,
      date: '2026-11-08',
      amount: 12000,
      type: 'expense' as const,
      category: 'household' as const,
      counterparty: 'ООO ПакетМаркет',
      description: 'Одноразовая посуда партия 1',
    },
    {
      venueId: 'venue-1',
      source: 'admin' as const,
      date: '2026-11-08',
      amount: 14000,
      type: 'expense' as const,
      category: 'household' as const,
      counterparty: 'ООO ПакетМаркет',
      description: 'Одноразовая посуда партия 2',
    },
  ]

  const result = await createTransactionsBatchAction(batchData)
  assert.equal(result.success, true)
  assert.equal(result.count, 2)

  const list = await getTransactionsAction('venue-1')
  const found1 = list.find((t) => t.description === 'Одноразовая посуда партия 1')
  const found2 = list.find((t) => t.description === 'Одноразовая посуда партия 2')
  assert.ok(found1)
  assert.ok(found2)

  // Clean up
  if (found1) await deleteTransactionAction(found1.id)
  if (found2) await deleteTransactionAction(found2.id)
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
  await setCashBalanceAction('venue-1', '2026-11', 450000, {
    bank: 315000,
    safe: 90000,
    shift: 45000,
  })

  const balances = await getCashBalancesAction('venue-1')
  assert.equal(balances['2026-11'], 450000)

  const details = await getCashBalanceDetailsAction('venue-1', '2026-11')
  assert.ok(details)
  assert.equal(details?.amount, 450000)
  assert.equal(details?.bankBalance, 315000)
  assert.equal(details?.safeBalance, 90000)
  assert.equal(details?.shiftBalance, 45000)
})
