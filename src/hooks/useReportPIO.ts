'use client'

import { useMemo } from 'react'
import type { Transaction, PIOReportData, ExpenseCategory, DateRange } from '@/types'
import { CATEGORY_LABELS } from '@/types'

const COST_OF_GOODS: ExpenseCategory[] = ['food', 'bar']
const OPERATING: ExpenseCategory[] = ['salary', 'rent', 'utilities', 'household', 'services', 'marketing']
const OTHER: ExpenseCategory[] = ['other']

function sumByCategory(txs: Transaction[], categories: ExpenseCategory[]) {
  const map = new Map<ExpenseCategory, number>()
  txs.filter(t => categories.includes(t.category))
    .forEach(t => map.set(t.category, (map.get(t.category) || 0) + t.amount))
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, label: CATEGORY_LABELS[category], amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function useReportPIO(
  transactions: Transaction[],
  venueId: string,
  dateRange: DateRange,
): PIOReportData {
  return useMemo(() => {
    const filtered = transactions.filter(t =>
      t.venueId === venueId &&
      t.status !== 'duplicate' &&
      t.date >= dateRange.from &&
      t.date <= dateRange.to
    )

    const incomes = filtered.filter(t => t.type === 'income')
    const expenses = filtered.filter(t => t.type === 'expense')

    const revenueTotal = incomes.reduce((s, t) => s + t.amount, 0)

    const cogItems = sumByCategory(expenses, COST_OF_GOODS)
    const cogTotal = cogItems.reduce((s, i) => s + i.amount, 0)
    const grossProfit = revenueTotal - cogTotal

    const opItems = sumByCategory(expenses, OPERATING)
    const opTotal = opItems.reduce((s, i) => s + i.amount, 0)
    const operatingProfit = grossProfit - opTotal

    const otherItems = sumByCategory(expenses, OTHER)
    const otherTotal = otherItems.reduce((s, i) => s + i.amount, 0)
    const netProfit = operatingProfit - otherTotal

    return {
      revenue: {
        items: [{ label: 'Выручка', amount: revenueTotal }],
        total: revenueTotal,
      },
      costOfGoods: { items: cogItems, total: cogTotal },
      grossProfit,
      grossMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
      operatingExpenses: { items: opItems, total: opTotal },
      operatingProfit,
      otherExpenses: { items: otherItems, total: otherTotal },
      netProfit,
      netMargin: revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0,
    }
  }, [transactions, venueId, dateRange])
}
