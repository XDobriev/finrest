import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import {
  generateFlashReportData,
  formatFlashReportMessage,
  sendEveningFlashReports,
} from '../../src/lib/telegram/flash-report'

test('Flash Report: calculates daily metrics and formats report correctly', async () => {
  const user = await prisma.user.create({
    data: {
      email: `flash_test_${Date.now()}@finrest.ru`,
      name: 'Manager Flash',
    },
  })

  const venue = await prisma.venue.create({
    data: {
      name: 'Панорама',
      ownerId: user.id,
    },
  })

  const targetDate = new Date('2026-11-08T18:00:00Z')

  try {
    // Add transactions for this date
    // 1. Income: Bank acquiring 206,500 + Cash sales 42,000 = 248,500
    await prisma.transaction.createMany({
      data: [
        {
          venueId: venue.id,
          source: 'bank',
          date: targetDate,
          amount: 206500,
          type: 'income',
          category: 'other',
          counterparty: 'ПАО Сбербанк Эквайринг',
          description: 'Эквайринг за смену',
          status: 'unique',
        },
        {
          venueId: venue.id,
          source: 'iiko',
          date: targetDate,
          amount: 42000,
          type: 'income',
          category: 'other',
          counterparty: 'Касса наличные',
          description: 'Выручка наличными за смену',
          status: 'unique',
        },
        // 2. Expenses: Food 41,000 + Household 8,200 + Salary 15,000 = 64,200
        {
          venueId: venue.id,
          source: 'manual',
          date: targetDate,
          amount: 41000,
          type: 'expense',
          category: 'food',
          counterparty: 'ООО МясоСнаб',
          description: 'Закупка мяса',
          status: 'unique',
        },
        {
          venueId: venue.id,
          source: 'manual',
          date: targetDate,
          amount: 8200,
          type: 'expense',
          category: 'household',
          counterparty: 'ИП Чистота',
          description: 'Бытовая химия',
          status: 'unique',
        },
        {
          venueId: venue.id,
          source: 'manual',
          date: targetDate,
          amount: 15000,
          type: 'expense',
          category: 'salary',
          counterparty: 'Повара и официанты',
          description: 'Аванс смены',
          status: 'unique',
        },
        // 3. Duplicate transaction to ensure it is ignored
        {
          venueId: venue.id,
          source: 'bank',
          date: targetDate,
          amount: 41000,
          type: 'expense',
          category: 'food',
          counterparty: 'ООО МясоСнаб',
          description: 'Дубль выписки',
          status: 'duplicate',
        },
      ],
    })

    // Upsert cash balance
    await prisma.cashBalance.create({
      data: {
        venueId: venue.id,
        monthKey: '2026-11',
        amount: 184200,
        safeBalance: 184200,
      },
    })

    // Generate Flash Report Data
    const report = await generateFlashReportData(venue.id, targetDate)

    assert.equal(report.venueName, 'Панорама')
    assert.equal(report.totalRevenue, 248500)
    assert.equal(report.cashRevenue, 42000)
    assert.equal(report.bankRevenue, 206500)
    assert.equal(report.totalExpenses, 64200)
    assert.equal(report.expensesByCategory['food'], 41000)
    assert.equal(report.expensesByCategory['household'], 8200)
    assert.equal(report.expensesByCategory['salary'], 15000)
    assert.equal(report.netProfit, 184300)
    assert.equal(Math.round(report.operatingMargin), 74)

    // Check formatted text
    const message = formatFlashReportMessage(report)
    assert.match(message, /Flash-отчет: Ресторан «Панорама»/)
    assert.match(message, /248\s?500\s?₽/)
    assert.match(message, /64\s?200\s?₽/)
    assert.match(message, /74/)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Flash Report: sendEveningFlashReports broadcasts daily reports to all active accounts', async () => {
  const user = await prisma.user.create({
    data: { email: `broadcast_${Date.now()}@finrest.ru`, name: 'Broadcast User' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Ресторан Бродкаст', ownerId: user.id },
  })
  const account = await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(888111),
      userId: user.id,
      activeVenueId: venue.id,
      firstName: 'BroadcastOwner',
    },
  })

  try {
    const sentMessages: Array<{ chatId: string; text: string }> = []
    const mockBot = {
      api: {
        sendMessage: async (chatId: string, text: string) => {
          sentMessages.push({ chatId, text })
          return { message_id: 1 }
        },
      },
    }

    const summary = await sendEveningFlashReports(mockBot, new Date())

    assert.ok(summary.sentCount >= 1)
    const matching = sentMessages.find((m) => m.chatId === account.telegramId.toString())
    assert.ok(matching)
    assert.match(matching.text, /Flash-отчет: Ресторан «Ресторан Бродкаст»/)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

