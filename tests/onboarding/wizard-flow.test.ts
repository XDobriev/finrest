import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import {
  getOnboardingStatusAction,
  updateOnboardingStatusAction,
  resetOnboardingAction,
  seedDemoDataAction,
} from '../../src/app/actions/onboarding'
import {
  createTelegramAuthTokenAction,
  getTelegramStatusAction,
} from '../../src/app/actions/telegram'
import { generateDemoDataset } from '../../src/lib/onboarding/demo-data'

describe('Onboarding Wizard Flow & First-Time Experience', () => {
  let userId: string
  let venueId: string

  before(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `wizard_flow_${Date.now()}@finrest.ru`,
        name: 'Новый Ресторатор',
        role: 'OWNER',
        onboardingCompleted: false,
        onboardingStep: 0,
      },
    })
    userId = user.id

    // Create test venue (Step 1)
    const venue = await prisma.venue.create({
      data: {
        name: 'GastroBar Патриаршие',
        address: 'Малый Козихинский пер., 8',
        ownerId: userId,
        dateToleranceDays: 1,
        amountTolerancePercent: 5.0,
        fuzzyMatchThreshold: 0.7,
      },
    })
    venueId = venue.id
  })

  after(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {})
    }
  })

  test('Step 1: Venue is verified and status advances to Step 2', async () => {
    const status = await getOnboardingStatusAction(userId)
    assert.strictEqual(status.completed, false)
    assert.strictEqual(status.hasVenues, true)
    assert.strictEqual(status.venueId, venueId)

    const update = await updateOnboardingStatusAction(2, false, userId)
    assert.strictEqual(update.step, 2)
    assert.strictEqual(update.completed, false)
  })

  test('Step 2: Demo data generator creates rich realistic HoReCa transactions', () => {
    const dataset = generateDemoDataset(venueId)
    assert.ok(dataset.transactions.length >= 20, 'Should generate at least 20 transactions')
    assert.ok(dataset.initialCash.amount > 0, 'Should have positive initial cash')
    assert.ok(dataset.menuItems.length >= 4, 'Should include menu items for engineering')

    // Verify presence of both iiko and bank revenue transactions
    const iikoRevenues = dataset.transactions.filter(
      (t) => t.source === 'iiko' && t.type === 'income'
    )
    const bankAcquiring = dataset.transactions.filter(
      (t) => t.source === 'bank' && t.type === 'income'
    )
    assert.ok(iikoRevenues.length > 0, 'Should contain iiko sales shifts')
    assert.ok(bankAcquiring.length > 0, 'Should contain bank acquiring deposits')

    // Verify key HoReCa expense categories
    const categories = new Set(dataset.transactions.map((t) => t.category))
    assert.ok(categories.has('food'), 'Should contain food expenses')
    assert.ok(categories.has('bar'), 'Should contain bar expenses')
    assert.ok(categories.has('salary'), 'Should contain salary expenses')
    assert.ok(categories.has('rent'), 'Should contain rent expenses')
  })

  test('Step 2: Seed action populates DB and advances status to Step 3', async () => {
    const seed = await seedDemoDataAction(venueId, userId)
    assert.strictEqual(seed.success, true)
    assert.ok(seed.transactionsCount >= 20)
    assert.ok(seed.deduplicationPairsCount >= 1)

    const update = await updateOnboardingStatusAction(3, false, userId)
    assert.strictEqual(update.step, 3)
    assert.strictEqual(update.completed, false)
  })

  test('Step 3: Telegram bot keys and 6-digit PIN are generated', async () => {
    const tgAuth = await createTelegramAuthTokenAction(userId, venueId)
    assert.ok(tgAuth.token.startsWith('auth_'), 'Token should have auth_ prefix')
    assert.match(tgAuth.pin, /^\d{6}$/, 'PIN should be exactly 6 digits')
    assert.ok(tgAuth.deepLink.includes(tgAuth.token), 'Deep-link should include the token')

    // Check polling status before link
    const statusBefore = await getTelegramStatusAction(userId)
    assert.strictEqual(statusBefore.isConnected, false)

    // Simulate bot linking
    await prisma.telegramAccount.create({
      data: {
        userId,
        telegramId: BigInt(Date.now()),
        username: 'restaurateur_demo',
        firstName: 'Иван',
        activeVenueId: venueId,
      },
    })

    // Check polling status after link
    const statusAfter = await getTelegramStatusAction(userId)
    assert.strictEqual(statusAfter.isConnected, true)
    assert.strictEqual(statusAfter.username, 'restaurateur_demo')
    assert.strictEqual(statusAfter.activeVenueName, 'GastroBar Патриаршие')
  })

  test('Step 4: Celebration and full onboarding completion', async () => {
    const finish = await updateOnboardingStatusAction(4, true, userId)
    assert.strictEqual(finish.step, 4)
    assert.strictEqual(finish.completed, true)

    const finalStatus = await getOnboardingStatusAction(userId)
    assert.strictEqual(finalStatus.completed, true)
    assert.strictEqual(finalStatus.step, 4)
  })

  test('Settings: Reset onboarding allows user to replay the tour from step 0', async () => {
    const reset = await resetOnboardingAction(userId)
    assert.strictEqual(reset.step, 0)
    assert.strictEqual(reset.completed, false)

    const statusAfterReset = await getOnboardingStatusAction(userId)
    assert.strictEqual(statusAfterReset.completed, false)
    assert.strictEqual(statusAfterReset.step, 0)
  })

  test('Step 2: 1C Bank Statement parser rejects corrupted files and supports UTF-8 BOM', async () => {
    const { parse1CBankStatement } = await import('../../src/lib/parsers/1c-bank')

    // Corrupted non-1C file
    const corrupted = 'Random text with no header\nFoo=Bar\n123'
    const resCorrupted = parse1CBankStatement(corrupted)
    assert.strictEqual(resCorrupted.success, false)
    assert.strictEqual(resCorrupted.rows.length, 0)
    assert.ok(resCorrupted.errors.length > 0)

    // Valid 1C with UTF-8 BOM and leading blank line
    const bomValid = '\uFEFF\r\n1CClientBankExchange\r\nВерсияФормата=1.03\r\nКодировка=Windows\r\nСекцияДокумент=Платежное поручение\r\nНомер=101\r\nДата=15.11.2026\r\nСумма=45000.00\r\nПлательщик=ООО "Ресторан"\r\nПолучатель=ООО "Мясоторг"\r\nНазначениеПлатежа=Оплата за мясо говядина\r\nКонецДокумента\r\nКонецФайла'
    const resBom = parse1CBankStatement(bomValid)
    assert.strictEqual(resBom.success, true)
    assert.strictEqual(resBom.rows.length, 1)
    assert.strictEqual(resBom.rows[0].amount, 45000)
    assert.strictEqual(resBom.rows[0].category, 'food')
  })
})
