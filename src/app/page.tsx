'use client'

import React from 'react'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProfitChart } from '@/components/dashboard/ProfitChart'
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { useDashboard } from '@/hooks/useDashboard'
import { DollarSign, TrendingDown, PiggyBank, ShieldCheck } from 'lucide-react'

export default function DashboardPage() {
  const { metrics, dailyMetrics, categoryBreakdown, transactions } = useDashboard()

  return (
    <div>
      <Header title="Дашборд" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Выручка за период"
            value={metrics.totalRevenue}
            trend={metrics.revenueTrend}
            variant="default"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Расходы (после дедуп.)"
            value={metrics.totalExpensesAfterDedup}
            trend={metrics.expenseTrend}
            variant="default"
            icon={<TrendingDown className="h-5 w-5" />}
          />
          <MetricCard
            title="Чистая прибыль"
            value={metrics.netProfit}
            trend={metrics.profitTrend}
            variant={metrics.netProfit >= 0 ? 'profit' : 'loss'}
            icon={<PiggyBank className="h-5 w-5" />}
          />
          <MetricCard
            title="Экономия от дедупликации"
            value={metrics.totalExpenses - metrics.totalExpensesAfterDedup}
            trend={metrics.savingsPercent}
            variant="savings"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProfitChart data={dailyMetrics} />
          </div>
          <div className="lg:col-span-1">
            <ExpenseDonut data={categoryBreakdown} />
          </div>
        </div>

        {/* Recent Transactions */}
        <RecentTransactions transactions={transactions} />
      </main>
    </div>
  )
}
