'use client'

import { useMemo } from 'react'
import type { Transaction, DDSReportData, ExpenseCategory, DateRange, CashBalances } from '@/types'
import { CATEGORY_LABELS } from '@/types'

type PaymentGroup = { label: string; categories: ExpenseCategory[] }

const PAYMENT_GROUPS: PaymentGroup[] = [
  { label: 'Поставщикам (продукты, бар)', categories: ['food', 'bar'] },
  { label: 'Аренда и коммунальные', categories: ['rent', 'utilities'] },
  { label: 'Зарплата', categories: ['salary'] },
  { label: 'Операционные расходы', categories: ['household', 'services', 'marketing'] },
  { label: 'Прочие', categories: ['other'] },
]

export function useReportDDS(
  transactions: Transaction[],
  venueId: string,
  dateRange: DateRange,
  cashBalances: CashBalances,
): DDSReportData {
  return useMemo(() => {
    const filtered = transactions.filter(t =>
      t.venueId === venueId &&
      t.status !== 'duplicate' &&
      t.date >= dateRange.from &&
      t.date <= dateRange.to
    )

    const monthKey = dateRange.from.substring(0, 7)
    const prevMonth = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]) - 2, 1)
    const prevKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

    const openingBalance = cashBalances[venueId]?.[monthKey]
      ?? cashBalances[venueId]?.[prevKey]
      ?? 0

    const incomes = filtered.filter(t => t.type === 'income')
    const expenses = filtered.filter(t => t.type === 'expense')

    const receiptsTotal = incomes.reduce((s, t) => s + t.amount, 0)

    const paymentGroups = PAYMENT_GROUPS.map(group => {
      const groupExpenses = expenses.filter(t => group.categories.includes(t.category))
      const items = Object.values(
        groupExpenses.reduce<Record<string, { label: string; amount: number }>>((acc, t) => {
          const key = CATEGORY_LABELS[t.category]
          if (!acc[key]) acc[key] = { label: key, amount: 0 }
          acc[key].amount += t.amount
          return acc
        }, {})
      ).sort((a, b) => b.amount - a.amount)

      return {
        label: group.label,
        items,
        total: items.reduce((s, i) => s + i.amount, 0),
      }
    }).filter(g => g.total > 0)

    const paymentsTotal = paymentGroups.reduce((s, g) => s + g.total, 0)
    const netCashFlow = receiptsTotal - paymentsTotal

    return {
      openingBalance,
      receipts: {
        items: [{ label: 'Выручка', amount: receiptsTotal }],
        total: receiptsTotal,
      },
      payments: {
        groups: paymentGroups,
        total: paymentsTotal,
      },
      netCashFlow,
      closingBalance: openingBalance + netCashFlow,
    }
  }, [transactions, venueId, dateRange, cashBalances])
}
