import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import {
  getOnboardingStatusAction,
  updateOnboardingStatusAction,
  resetOnboardingAction,
  seedDemoDataAction,
} from '../../src/app/actions/onboarding'
import { hashPassword } from '../../src/lib/auth/password'

describe('Onboarding Actions & Demo Seeding Lifecycle', () => {
  let testUser: { id: string; email: string }
  let testVenueId: string

  before(async () => {
    const passwordHash = await hashPassword('secret123')
    testUser = await prisma.user.create({
      data: {
        email: `onboarding_test_${Date.now()}@finrest.ru`,
        passwordHash,
        name: 'Тестовый Ресторатор',
        role: 'OWNER',
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    })
  })

  after(async () => {
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {})
    }
  })

  test('getOnboardingStatusAction retrieves initial state for a user', async () => {
    const status = await getOnboardingStatusAction(testUser.id)
    assert.strictEqual(status.completed, false)
    assert.strictEqual(status.step, 0)
    assert.strictEqual(status.hasVenues, false)
    assert.strictEqual(status.venueId, null)
  })

  test('updateOnboardingStatusAction updates step and completion flag', async () => {
    const step1Result = await updateOnboardingStatusAction(1, false, testUser.id)
    assert.strictEqual(step1Result.step, 1)
    assert.strictEqual(step1Result.completed, false)

    const completedResult = await updateOnboardingStatusAction(3, true, testUser.id)
    assert.strictEqual(completedResult.step, 3)
    assert.strictEqual(completedResult.completed, true)

    const recheck = await getOnboardingStatusAction(testUser.id)
    assert.strictEqual(recheck.completed, true)
    assert.strictEqual(recheck.step, 3)
  })

  test('resetOnboardingAction resets step and completed flag back to 0 and false', async () => {
    const resetResult = await resetOnboardingAction(testUser.id)
    assert.strictEqual(resetResult.completed, false)
    assert.strictEqual(resetResult.step, 0)

    const recheck = await getOnboardingStatusAction(testUser.id)
    assert.strictEqual(recheck.completed, false)
    assert.strictEqual(recheck.step, 0)
  })

  test('seedDemoDataAction populates venue with rich restaurant data', async () => {
    // Create venue for test user
    const venue = await prisma.venue.create({
      data: {
        name: 'GastroBar Онбординг Демо',
        address: 'ул. Арбат, 15',
        ownerId: testUser.id,
      },
    })
    testVenueId = venue.id

    const seedResult = await seedDemoDataAction(testVenueId, testUser.id)
    assert.strictEqual(seedResult.success, true)
    assert.ok(seedResult.transactionsCount >= 20, 'Should seed at least 20 transactions')
    assert.ok(seedResult.deduplicationPairsCount >= 1, 'Should find at least 1 duplicate pair')
    assert.ok(seedResult.menuItemsCount >= 4, 'Should seed at least 4 menu items')

    // Verify DB records
    const txCount = await prisma.transaction.count({ where: { venueId: testVenueId } })
    assert.strictEqual(txCount, seedResult.transactionsCount)

    const pairsCount = await prisma.deduplicationPair.count({ where: { venueId: testVenueId } })
    assert.strictEqual(pairsCount, seedResult.deduplicationPairsCount)

    const menuCount = await prisma.menuItem.count({ where: { venueId: testVenueId } })
    assert.strictEqual(menuCount, seedResult.menuItemsCount)

    const cashBalance = await prisma.cashBalance.findFirst({ where: { venueId: testVenueId } })
    assert.ok(cashBalance !== null, 'Should seed cash balance snapshot')
    assert.ok(cashBalance.amount > 0, 'Cash balance amount should be positive')
  })
})
