'use client'

import React from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProfitChart } from '@/components/dashboard/ProfitChart'
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils'
import {
  RussianRuble,
  TrendingDown,
  PiggyBank,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  UploadCloud,
  FileQuestion,
} from 'lucide-react'

export default function DashboardPage() {
  const { metrics, dailyMetrics, categoryBreakdown, transactions, isLoading } = useDashboard()

  const foodCostStatus: 'good' | 'warning' | 'alert' | undefined =
    metrics.totalRevenue === 0
      ? undefined
      : metrics.foodCostPercent <= 32
      ? 'good'
      : metrics.foodCostPercent <= 36
      ? 'warning'
      : 'alert'

  const payrollStatus: 'good' | 'warning' | 'alert' | undefined =
    metrics.totalRevenue === 0
      ? undefined
      : metrics.payrollPercent <= 25
      ? 'good'
      : metrics.payrollPercent <= 30
      ? 'warning'
      : 'alert'

  return (
    <div>
      <Header title="Дашборд" />
      <main className="p-6 space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1 mr-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-8 w-36" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1 mr-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Skeleton className="lg:col-span-2 h-[340px] rounded-xl" />
              <Skeleton className="lg:col-span-1 h-[340px] rounded-xl" />
            </div>
            <Skeleton className="h-[280px] rounded-xl" />
          </div>
        ) : (
          <>
            {/* Primary Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Выручка за период"
                value={metrics.totalRevenue}
                trend={metrics.revenueTrend}
                variant="default"
                icon={<RussianRuble className="h-5 w-5" />}
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

            {/* Restaurant Core KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MetricCard
                title="Food Cost % (кухня и бар к выручке)"
                value={metrics.foodCostAmount}
                customValue={`${metrics.foodCostPercent.toFixed(1)}%`}
                subtitle={`Себестоимость: ${formatCurrency(metrics.foodCostAmount)}`}
                benchmark="Бенчмарк: 28–32%"
                benchmarkStatus={foodCostStatus}
                variant="default"
                icon={<UtensilsCrossed className="h-5 w-5" />}
              />
              <MetricCard
                title="ФОТ % (расходы на персонал к выручке)"
                value={metrics.payrollAmount}
                customValue={`${metrics.payrollPercent.toFixed(1)}%`}
                subtitle={`Фонд оплаты труда: ${formatCurrency(metrics.payrollAmount)}`}
                benchmark="Бенчмарк: 20–25%"
                benchmarkStatus={payrollStatus}
                variant="default"
                icon={<Users className="h-5 w-5" />}
              />
            </div>

            {transactions.length === 0 ? (
              <Card className="rounded-xl shadow-sm border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FileQuestion className="h-6 w-6 text-slate-500" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    Нет данных за выбранный период
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                    Загрузите выписку из банка или данные продаж из iiko, чтобы увидеть полную финансовую аналитику ресторана.
                  </p>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-sm shadow-sm transition-colors"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Загрузить выписку
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
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
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
