import { prisma } from '../db/client'

export interface FlashReportData {
  venueName: string
  date: Date
  formattedDate: string
  totalRevenue: number
  cashRevenue: number
  bankRevenue: number
  totalExpenses: number
  expensesByCategory: Record<string, number>
  safeBalance: number
  netProfit: number
  operatingMargin: number
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Продукты (Food)',
  bar: 'Бар',
  salary: 'ФОТ (выплаты смены)',
  household: 'Хоз. нужды',
  utilities: 'Коммуналка',
  rent: 'Аренда',
  marketing: 'Маркетинг',
  services: 'Услуги и сервис',
  other: 'Прочее',
}

function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

/**
 * Calculates daily flash report data for a venue and specific date.
 */
export async function generateFlashReportData(
  venueId: string,
  targetDate: Date = new Date()
): Promise<FlashReportData> {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { name: true },
  })

  const venueName = venue?.name || 'Ресторан'

  // Determine start and end of target day in UTC
  const startOfDay = new Date(targetDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  // Query transactions for the date excluding duplicates
  const transactions = await prisma.transaction.findMany({
    where: {
      venueId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { not: 'duplicate' },
    },
  })

  let cashRevenue = 0
  let bankRevenue = 0
  let totalExpenses = 0
  const expensesByCategory: Record<string, number> = {}

  for (const tx of transactions) {
    if (tx.type === 'income') {
      // Cash vs Non-cash split:
      // iiko sales / cash counters treated as cash; bank / acquiring treated as bank
      const isBank =
        tx.source === 'bank' ||
        /эквайринг|безнал|терминал|сбер|тинькофф|вкб/i.test(tx.counterparty + ' ' + tx.description)

      if (isBank) {
        bankRevenue += tx.amount
      } else {
        cashRevenue += tx.amount
      }
    } else if (tx.type === 'expense') {
      totalExpenses += tx.amount
      const cat = tx.category || 'other'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + tx.amount
    }
  }

  const totalRevenue = cashRevenue + bankRevenue
  const netProfit = totalRevenue - totalExpenses
  const operatingMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Cash Safe balance from CashBalance
  const yearMonth = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}`
  const balanceRecord = await prisma.cashBalance.findUnique({
    where: {
      venueId_monthKey: {
        venueId,
        monthKey: yearMonth,
      },
    },
  })

  const safeBalance = balanceRecord?.safeBalance ?? balanceRecord?.amount ?? 0

  // Format date DD.MM.YYYY
  const day = String(targetDate.getUTCDate()).padStart(2, '0')
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
  const year = targetDate.getUTCFullYear()
  const formattedDate = `${day}.${month}.${year}`

  return {
    venueName,
    date: targetDate,
    formattedDate,
    totalRevenue,
    cashRevenue,
    bankRevenue,
    totalExpenses,
    expensesByCategory,
    safeBalance,
    netProfit,
    operatingMargin,
  }
}

/**
 * Formats flash report data into Russian Telegram Markdown message.
 */
export function formatFlashReportMessage(data: FlashReportData): string {
  const profitSign = data.netProfit >= 0 ? '+' : ''

  let expenseLines = ''
  const sortedCategories = Object.entries(data.expensesByCategory).sort(
    ([, a], [, b]) => b - a
  )

  for (const [cat, amt] of sortedCategories) {
    const label = CATEGORY_LABELS[cat] || cat
    expenseLines += `   • ${label}: ${formatRubles(amt)} ₽\n`
  }

  if (!expenseLines) {
    expenseLines = '   • Расходов за смену не зафиксировано\n'
  }

  return [
    `📊 Flash-отчет: Ресторан «${data.venueName}» (${data.formattedDate})`,
    ``,
    `💰 Выручка за день: ${formatRubles(data.totalRevenue)} ₽ (нал: ${formatRubles(data.cashRevenue)} ₽ / безнал: ${formatRubles(data.bankRevenue)} ₽)`,
    `📉 Расходы за смену: ${formatRubles(data.totalExpenses)} ₽`,
    expenseLines.trimEnd(),
    ``,
    `💵 Сейф ресторана:`,
    `   • Остаток: ${formatRubles(data.safeBalance)} ₽`,
    ``,
    `📈 Чистая операционная маржа смены: ${data.operatingMargin.toFixed(1)}% (${profitSign}${formatRubles(data.netProfit)} ₽)`,
  ].join('\n')
}

export interface FlashReportSendResult {
  telegramId: string
  venueName: string
  success: boolean
  error?: string
}

export interface FlashReportDispatchSummary {
  sentCount: number
  failedCount: number
  results: FlashReportSendResult[]
}

/**
 * Sends the daily evening flash report to all connected Telegram accounts.
 * Intended to be triggered at 23:30 via cron job or scheduled task.
 */
export async function sendEveningFlashReports(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  botInstance?: any,
  targetDate: Date = new Date()
): Promise<FlashReportDispatchSummary> {
  const activeBot = botInstance || (await import('./bot')).bot
  const accounts = await prisma.telegramAccount.findMany({
    where: {
      activeVenueId: { not: null },
    },
    include: {
      venue: true,
    },
  })

  let sentCount = 0
  let failedCount = 0
  const results: FlashReportSendResult[] = []

  for (const account of accounts) {
    if (!account.activeVenueId) continue

    try {
      const data = await generateFlashReportData(account.activeVenueId, targetDate)
      const message = formatFlashReportMessage(data)
      await activeBot.api.sendMessage(account.telegramId.toString(), message)
      sentCount++
      results.push({
        telegramId: account.telegramId.toString(),
        venueName: account.venue?.name || 'Ресторан',
        success: true,
      })
    } catch (err: unknown) {
      failedCount++
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        telegramId: account.telegramId.toString(),
        venueName: account.venue?.name || 'Ресторан',
        success: false,
        error: msg,
      })
    }
  }

  return { sentCount, failedCount, results }
}
