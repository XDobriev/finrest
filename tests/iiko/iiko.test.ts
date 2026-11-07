import test from 'node:test'
import assert from 'node:assert/strict'
import { IikoClient } from '../../src/lib/iiko/client'
import { syncVenueIiko } from '../../src/lib/iiko/sync'
import { prisma } from '../../src/lib/db/client'

test('iikoClient: authenticates and fetches organizations in demo/sandbox mode', async () => {
  const client = new IikoClient({ apiLogin: 'demo_restaurant_api_key' })
  const auth = await client.authenticate()

  assert.ok(auth.token)
  assert.equal(typeof auth.token, 'string')

  const orgs = await client.getOrganizations()
  assert.ok(Array.isArray(orgs))
  assert.ok(orgs.length > 0)
  assert.ok(orgs[0].id)
  assert.ok(orgs[0].name)
})

test('iikoClient: fetches menu nomenclature and formats as inventory items', async () => {
  const client = new IikoClient({ apiLogin: 'demo_restaurant_api_key' })
  await client.authenticate()

  const orgs = await client.getOrganizations()
  const orgId = orgs[0].id

  const items = await client.getNomenclature(orgId)
  assert.ok(Array.isArray(items))
  assert.ok(items.length > 0)

  const firstItem = items[0]
  assert.ok(firstItem.name)
  assert.ok(firstItem.pricePerUnit >= 0)
  assert.ok(['кг', 'л', 'шт', 'порц'].includes(firstItem.unit))
  assert.ok(['food', 'bar', 'household'].includes(firstItem.category))
})

test('iikoClient: fetches daily sales shifts and maps to FinRest transactions', async () => {
  const client = new IikoClient({ apiLogin: 'demo_restaurant_api_key' })
  await client.authenticate()

  const orgs = await client.getOrganizations()
  const orgId = orgs[0].id

  const sales = await client.getDailySales(orgId, {
    dateFrom: '2026-11-01',
    dateTo: '2026-11-07',
  })

  assert.ok(Array.isArray(sales))
  assert.ok(sales.length > 0)

  for (const shift of sales) {
    assert.ok(shift.date)
    assert.ok(shift.amount > 0)
    assert.equal(shift.type, 'income')
    assert.equal(shift.source, 'iiko')
  }
})

test('iikoSync: executes end-to-end sync for a venue into PostgreSQL', async () => {
  // Create a dedicated test venue
  const testVenue = await prisma.venue.create({
    data: {
      name: 'iiko Тестовый Ресторан',
      iikoApiKey: 'demo_restaurant_api_key',
      iikoOrgId: 'demo-org-1',
      iikoAutoSync: true,
    },
  })

  try {
    const syncResult = await syncVenueIiko(testVenue.id)

    assert.equal(syncResult.success, true)
    assert.ok(syncResult.syncedSalesCount > 0)
    assert.ok(syncResult.syncedInventoryCount > 0)

    // Verify transactions were saved to database
    const savedTxs = await prisma.transaction.findMany({
      where: { venueId: testVenue.id, source: 'iiko' },
    })
    assert.ok(savedTxs.length >= syncResult.syncedSalesCount)

    // Verify inventory items were saved to database
    const savedInventory = await prisma.inventoryItem.findMany({
      where: { venueId: testVenue.id },
    })
    assert.ok(savedInventory.length >= syncResult.syncedInventoryCount)

    // Verify last sync timestamp was updated
    const updatedVenue = await prisma.venue.findUnique({
      where: { id: testVenue.id },
    })
    assert.ok(updatedVenue?.iikoLastSyncAt)
  } finally {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { venueId: testVenue.id } })
    await prisma.inventoryItem.deleteMany({ where: { venueId: testVenue.id } })
    await prisma.venue.delete({ where: { id: testVenue.id } })
  }
})
