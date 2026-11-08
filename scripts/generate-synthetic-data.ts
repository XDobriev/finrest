import type { Transaction, DataSource, ExpenseCategory } from '../src/types'
import { generateId } from '../src/lib/utils'

export interface SyntheticOptions {
  startDate?: string
  daysSpan?: number
  duplicateRate?: number // e.g. 0.08 for 8%
  seed?: number
}

interface CounterpartyConfig {
  name: string
  category: ExpenseCategory
  minAmount: number
  maxAmount: number
  variants: string[]
}

const SUPPLIERS: CounterpartyConfig[] = [
  {
    name: 'ООО Мясоторг',
    category: 'food',
    minAmount: 15000,
    maxAmount: 120000,
    variants: ['ООО "Мясоторг"', 'МЯСОТОРГ ООО', 'Мясоторг Поставка'],
  },
  {
    name: 'ИП Ахмедов Овощи',
    category: 'food',
    minAmount: 5000,
    maxAmount: 45000,
    variants: ['ИП Ахмедов А.Г.', 'Ахмедов Овощи Даниловский', 'ИП АХМЕДОВ'],
  },
  {
    name: 'METRO Cash&Carry',
    category: 'food',
    minAmount: 10000,
    maxAmount: 85000,
    variants: ['ООО МЕТРО Кэш энд Керри', 'METRO Cash and Carry', 'МЕТРО'],
  },
  {
    name: 'ООО Рыбный Дом',
    category: 'food',
    minAmount: 18000,
    maxAmount: 95000,
    variants: ['Рыбный Дом ООО', 'ООО "РЫБНЫЙ ДОМ"', 'Рыбный дом поставки'],
  },
  {
    name: 'Simple Wine',
    category: 'bar',
    minAmount: 25000,
    maxAmount: 160000,
    variants: ['ООО Симпл Вайн', 'Simple Wine Distribution', 'СИМПЛ'],
  },
  {
    name: 'Luding Group',
    category: 'bar',
    minAmount: 20000,
    maxAmount: 140000,
    variants: ['ООО Лудинг', 'Лудинг-Трейд', 'LUDING'],
  },
  {
    name: 'ООО КлинТек Про',
    category: 'household',
    minAmount: 3000,
    maxAmount: 28000,
    variants: ['КлинТек Про', 'ООО "КлинТек"', 'Клинтек Бытовая Химия'],
  },
  {
    name: 'АО Мосэнергосбыт',
    category: 'utilities',
    minAmount: 35000,
    maxAmount: 85000,
    variants: ['Мосэнергосбыт АО', 'ПАО Мосэнерго', 'Электроэнергия Мосэнерго'],
  },
  {
    name: 'АО Мосводоканал',
    category: 'utilities',
    minAmount: 12000,
    maxAmount: 30000,
    variants: ['Мосводоканал', 'АО "Мосводоканал"'],
  },
  {
    name: 'ООО Аренда Ресторан',
    category: 'rent',
    minAmount: 250000,
    maxAmount: 450000,
    variants: ['Аренда помещений ООО', 'Аренда Ресторан', 'ООО "Аренда-Р"'],
  },
]

export function generateSyntheticTransactions(
  count: number,
  venueId: string,
  options: SyntheticOptions = {}
): { transactions: Transaction[]; groundTruthPairs: Array<[string, string]> } {
  const duplicateRate = options.duplicateRate ?? 0.08
  const daysSpan = options.daysSpan ?? 90
  const startDate = options.startDate
    ? new Date(options.startDate)
    : new Date(Date.now() - daysSpan * 24 * 60 * 60 * 1000)

  const transactions: Transaction[] = []
  const groundTruthPairs: Array<[string, string]> = []

  // Pseudo-random helper for deterministic generation if needed
  let seed = options.seed ?? 12345
  function random(): number {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  function randomInt(min: number, max: number): number {
    return Math.floor(random() * (max - min + 1)) + min
  }

  const baseCount = Math.floor(count * (1 - duplicateRate / 2))

  for (let i = 0; i < baseCount; i++) {
    // Pick day
    const dayOffset = randomInt(0, daysSpan)
    const txDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
    const dateStr = txDate.toISOString().split('T')[0]

    const isIncome = random() < 0.25 // 25% revenue, 75% expense operations

    if (isIncome) {
      const source: DataSource = random() < 0.7 ? 'iiko' : 'bank'
      const amount = randomInt(60000, 350000)
      const counterparty =
        source === 'iiko'
          ? 'Касса iiko'
          : random() < 0.6
          ? 'АО Т-Банк Эквайринг'
          : 'ПАО Сбербанк Эквайринг'

      transactions.push({
        id: `tx-syn-${generateId()}`,
        venueId,
        source,
        date: dateStr,
        amount,
        type: 'income',
        category: 'other',
        counterparty,
        description: `Выручка смены от ${dateStr}`,
        status: 'unique',
        createdAt: new Date().toISOString(),
      })
    } else {
      const supplier = SUPPLIERS[randomInt(0, SUPPLIERS.length - 1)]
      const source: DataSource = random() < 0.6 ? 'bank' : random() < 0.85 ? 'iiko' : 'manual'
      const amount = randomInt(supplier.minAmount, supplier.maxAmount)

      transactions.push({
        id: `tx-syn-${generateId()}`,
        venueId,
        source,
        date: dateStr,
        amount,
        type: 'expense',
        category: supplier.category,
        counterparty: supplier.name,
        description: `Оплата по счету №${randomInt(100, 999)} за ${supplier.category}`,
        status: 'unique',
        createdAt: new Date().toISOString(),
      })
    }
  }

  // Now inject controlled duplicates into the dataset
  const targetDuplicates = count - transactions.length
  for (let k = 0; k < targetDuplicates && k < transactions.length; k++) {
    const original = transactions[k]
    const id = `tx-dup-${generateId()}`

    // Duplicate noise variations:
    // 1. Same date or ±1 day
    const dayDelta = randomInt(-1, 1)
    const origDate = new Date(original.date)
    origDate.setDate(origDate.getDate() + dayDelta)
    const dupDateStr = origDate.toISOString().split('T')[0]

    // 2. Amount: exact or ±1.5% commission (e.g. acquiring)
    let dupAmount = original.amount
    if (original.type === 'income' && random() < 0.6) {
      // Acquiring bank commission deducted
      const feePercent = 0.018 + random() * 0.005 // 1.8% to 2.3% fee
      dupAmount = Math.round(original.amount * (1 - feePercent))
    }

    // 3. Counterparty variation
    let dupCounterparty = original.counterparty
    if (original.type === 'income') {
      dupCounterparty =
        original.source === 'iiko' ? 'АО Т-Банк Эквайринг' : 'Касса iiko'
    } else {
      const supplier = SUPPLIERS.find((s) => s.name === original.counterparty)
      if (supplier && supplier.variants.length > 0) {
        dupCounterparty = supplier.variants[randomInt(0, supplier.variants.length - 1)]
      }
    }

    const dupSource: DataSource = original.source === 'iiko' ? 'bank' : 'iiko'

    const duplicateTx: Transaction = {
      id,
      venueId,
      source: dupSource,
      date: dupDateStr,
      amount: dupAmount,
      type: original.type,
      category: original.category,
      counterparty: dupCounterparty,
      description: `Дублирующая запись операции: ${original.description}`,
      status: 'unique',
      createdAt: new Date().toISOString(),
    }

    transactions.push(duplicateTx)
    groundTruthPairs.push([original.id, duplicateTx.id])
  }

  return { transactions, groundTruthPairs }
}

// CLI Execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  let count = 1000
  let venueId = 'venue-1'

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--venue=')) {
      venueId = arg.split('=')[1]
    }
  }

  console.log(`Generating ${count} synthetic transactions for venue ${venueId}...`)
  const start = performance.now()
  const result = generateSyntheticTransactions(count, venueId)
  const duration = (performance.now() - start).toFixed(2)

  console.log(
    `✅ Generated ${result.transactions.length} transactions with ${result.groundTruthPairs.length} injected duplicate pairs in ${duration}ms.`
  )
}
