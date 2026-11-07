import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePIOReport } from '../../src/lib/reports/pio'
import { calculateDDSReport } from '../../src/lib/reports/dds'
import type { Transaction, CashBalances } from '../../src/types'

const sampleTransactions: Transaction[] = [
  // Income
  {
    id: 'tx-1',
    venueId: 'v-1',
    date: '2025-06-01',
    amount: 500000,
    counterparty: 'Гости ресторана',
    description: 'Выручка за день',
    category: 'food',
    source: 'iiko',
    status: 'unique',
    type: 'income',
    createdAt: '2025-06-01T20:00:00Z',
  },
  // Cost of Goods: Food
  {
    id: 'tx-2',
    venueId: 'v-1',
    date: '2025-06-02',
    amount: 120000,
    counterparty: 'Мясной дом',
    description: 'Мясо для кухни',
    category: 'food',
    source: 'bank',
    status: 'unique',
    type: 'expense',
    createdAt: '2025-06-02T10:00:00Z',
  },
  // Cost of Goods: Bar
  {
    id: 'tx-3',
    venueId: 'v-1',
    date: '2025-06-03',
    amount: 50000,
    counterparty: 'Винный склад',
    description: 'Вино и напитки',
    category: 'bar',
    source: 'bank',
    status: 'unique',
    type: 'expense',
    createdAt: '2025-06-03T11:00:00Z',
  },
  // Operating: Salary
  {
    id: 'tx-4',
    venueId: 'v-1',
    date: '2025-06-05',
    amount: 150000,
    counterparty: 'Персонал кухни и зала',
    description: 'Зарплата 1я половина',
    category: 'salary',
    source: 'admin',
    status: 'unique',
    type: 'expense',
    createdAt: '2025-06-05T12:00:00Z',
  },
  // Operating: Rent
  {
    id: 'tx-5',
    venueId: 'v-1',
    date: '2025-06-06',
    amount: 80000,
    counterparty: 'Арендодатель',
    description: 'Аренда помещения',
    category: 'rent',
    source: 'bank',
    status: 'unique',
    type: 'expense',
    createdAt: '2025-06-06T09:00:00Z',
  },
  // Duplicate (should be ignored in reports)
  {
    id: 'tx-6',
    venueId: 'v-1',
    date: '2025-06-02',
    amount: 120000,
    counterparty: 'Мясной дом',
    description: 'Дубликат из кассы',
    category: 'food',
    source: 'admin',
    status: 'duplicate',
    type: 'expense',
    createdAt: '2025-06-02T10:30:00Z',
  },
]

test('Financial Engine: calculates P&L (ПИО) accurately', () => {
  const pio = calculatePIOReport(sampleTransactions, 'v-1', {
    from: '2025-06-01',
    to: '2025-06-30',
  })

  // Total Revenue: 500,000
  assert.equal(pio.revenue.total, 500000)

  // Cost of Goods: 120,000 (food) + 50,000 (bar) = 170,000 (duplicate ignored)
  assert.equal(pio.costOfGoods.total, 170000)

  // Gross Profit: 500,000 - 170,000 = 330,000
  assert.equal(pio.grossProfit, 330000)
  assert.equal(Math.round(pio.grossMargin), 66) // 330k / 500k = 66%

  // Operating Expenses: 150,000 (salary) + 80,000 (rent) = 230,000
  assert.equal(pio.operatingExpenses.total, 230000)

  // Operating & Net Profit: 330,000 - 230,000 = 100,000
  assert.equal(pio.operatingProfit, 100000)
  assert.equal(pio.netProfit, 100000)
  assert.equal(Math.round(pio.netMargin), 20) // 100k / 500k = 20%
})

test('Financial Engine: calculates Cash Flow (ДДС) with opening and closing balances', () => {
  const cashBalances: CashBalances = {
    'v-1': {
      '2025-06': 100000,
    },
  }

  const dds = calculateDDSReport(
    sampleTransactions,
    'v-1',
    { from: '2025-06-01', to: '2025-06-30' },
    cashBalances
  )

  // Opening balance from CashBalances
  assert.equal(dds.openingBalance, 100000)

  // Inflow: 500,000
  assert.equal(dds.receipts.total, 500000)

  // Outflow: 120k + 50k + 150k + 80k = 400,000
  assert.equal(dds.payments.total, 400000)

  // Net Cash Flow: 500k - 400k = +100,000
  assert.equal(dds.netCashFlow, 100000)

  // Closing Balance: 100,000 + 100,000 = 200,000
  assert.equal(dds.closingBalance, 200000)
})
