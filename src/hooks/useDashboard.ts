'use client'

import { useMemo } from 'react'
import { useApp } from '@/context/AppContext'
import type { DailyMetric, CategoryBreakdown, DashboardMetrics } from '@/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, type ExpenseCategory } from '@/types'

export function useDashboard() {
  const { transactions, selectedVenueId, dateRange } = useApp()

  const venueTransactions = useMemo(
    () => transactions.filter((t) => {
      if (t.venueId !== selectedVenueId) return false
      if (t.date < dateRange.from || t.date > dateRange.to) return false
      return true
    }),
    [transactions, selectedVenueId, dateRange]
  )

  const metrics = useMemo<DashboardMetrics>(() => {
    const income = venueTransactions.filter((t) => t.type === 'income')
    const allExpenses = venueTransactions.filter((t) => t.type === 'expense')
    const uniqueExpenses = allExpenses.filter((t) => t.status !== 'duplicate')

    const totalRevenue = income.reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = allExpenses.reduce((sum, t) => sum + t.amount, 0)
    const totalExpensesAfterDedup = uniqueExpenses.reduce((sum, t) => sum + t.amount, 0)
    const netProfit = totalRevenue - totalExpensesAfterDedup
    const savings = totalExpenses - totalExpensesAfterDedup
    const savingsPercent = totalExpenses > 0 ? (savings / totalExpenses) * 100 : 0

    return {
      totalRevenue,
      totalExpenses,
      totalExpensesAfterDedup,
      netProfit,
      savingsPercent,
      revenueTrend: 8.5,
      expenseTrend: -3.2,
      profitTrend: 12.1,
    }
  }, [venueTransactions])

  const dailyMetrics = useMemo<DailyMetric[]>(() => {
    const dateMap = new Map<string, DailyMetric>()

    venueTransactions.forEach((t) => {
      const existing = dateMap.get(t.date) || {
        date: t.date,
        revenue: 0,
        expenses: 0,
        profit: 0,
      }

      if (t.type === 'income' && t.status !== 'duplicate') {
        existing.revenue += t.amount
      } else if (t.type === 'expense' && t.status !== 'duplicate') {
        existing.expenses += t.amount
      }

      dateMap.set(t.date, existing)
    })

    const sorted = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return sorted.map((d) => ({
      ...d,
      profit: d.revenue - d.expenses,
    }))
  }, [venueTransactions])

  const categoryBreakdown = useMemo<CategoryBreakdown[]>(() => {
    const categoryMap = new Map<ExpenseCategory, number>()
    let total = 0

    venueTransactions
      .filter((t) => t.type === 'expense' && t.status !== 'duplicate')
      .forEach((t) => {
        const current = categoryMap.get(t.category) || 0
        categoryMap.set(t.category, current + t.amount)
        total += t.amount
      })

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [venueTransactions])

  return {
    metrics,
    dailyMetrics,
    categoryBreakdown,
    transactions: venueTransactions,
  }
}
