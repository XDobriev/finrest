'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ProfitChart } from '@/components/dashboard/ProfitChart'
import { ExpenseDonut } from '@/components/dashboard/ExpenseDonut'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/hooks/useDashboard'
import { useApp } from '@/context/AppContext'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/utils'
import { getOnboardingStatusAction } from '@/app/actions/onboarding'
import {
  RussianRuble,
  TrendingDown,
  PiggyBank,
  ShieldCheck,
  UtensilsCrossed,
  Users,
  UploadCloud,
  FileQuestion,
  Building2,
  Sparkles,
} from 'lucide-react'

export default function DashboardPage() {
  const { venues } = useApp()
  const { metrics, dailyMetrics, categoryBreakdown, transactions, isLoading } = useDashboard()
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)

  useEffect(() => {
    let isMounted = true
    getOnboardingStatusAction()
      .then((status) => {
        if (!isMounted) return
        if (!status.completed && !sessionStorage.getItem('finrest_dismiss_onboarding_banner')) {
          setShowOnboardingBanner(true)
          setOnboardingStep(status.step || 1)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

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

  if (!isLoading && venues.length === 0) {
    return (
      <div>
        <Header title="Дашборд" />
        <main className="p-6">
          <EmptyState
            icon={<Building2 className="h-7 w-7 text-emerald-600" />}
            title="Добро пожаловать в FinRest!"
            description="Управленческий учет, автоматическое устранение дубликатов оплат и Food Cost аналитика для ресторанов, кафе и баров."
            checklist={[
              'Создайте ваше первое заведение или ресторанную сеть',
              'Подключите интернет-банк (Т-Банк, Точка) или загрузите выписку .txt',
              'Свяжите Telegram-бота для мгновенного распознавания чеков шеф-повара',
            ]}
            tip="Мастер первого запуска за 2 минуты настроит заведение и загрузит тестовый датасет, чтобы вы сразу оценили отчеты ОПиУ, ДДС и экономию от дедупликации."
            actions={
              <>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 text-sm shadow-md transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="h-4 w-4" />
                  Пройти интерактивный онбординг
                </Link>
                <Link
                  href="/venues"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 text-sm transition-colors"
                >
                  <Building2 className="h-4 w-4 text-slate-500" />
                  Добавить заведение вручную
                </Link>
              </>
            }
          />
        </main>
      </div>
    )
  }

  return (
    <div>
      <Header title="Дашборд" />
      <main className="p-6 space-y-6">
        {showOnboardingBanner && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-950">
                    Интерактивное обучение FinRest
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                    Шаг {onboardingStep} из 4
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Завершите быструю настройку: выберите способ загрузки данных и привяжите Telegram-бота
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition"
              >
                Продолжить обучение
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowOnboardingBanner(false)
                  sessionStorage.setItem('finrest_dismiss_onboarding_banner', 'true')
                }}
                className="text-xs text-slate-500 hover:text-slate-800 h-8"
              >
                Скрыть
              </Button>
            </div>
          </div>
        )}

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
              <EmptyState
                icon={<FileQuestion className="h-7 w-7 text-slate-500" />}
                title="Нет данных за выбранный период"
                description="Загрузите банковскую выписку, синхронизируйте iikoCloud или используйте тестовые данные, чтобы увидеть финансовую аналитику ресторана."
                tip="Если вы ведете учет параллельно в iiko и банке, дедупликатор FinRest автоматически предотвратит задвоение выручки эквайринга и накладных."
                checklist={[
                  'Загрузите выписку онлайн-банка в формате 1C (.txt) в разделе «Загрузка»',
                  'Или подключите Т-Банк / Банк Точка в «Настройках» для утренней синхронизации',
                  'Или откройте мастер онбординга для быстрой загрузки демо-данных',
                ]}
                actions={
                  <>
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 text-sm shadow-xs transition-colors"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Загрузить выписку
                    </Link>
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 text-sm transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      Мастер онбординга
                    </Link>
                  </>
                }
              />
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
