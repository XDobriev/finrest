'use client'

import React, { useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useApp } from '@/context/AppContext'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS, CATEGORY_COLORS, SOURCE_LABELS, type ExpenseCategory, type DataSource } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { BarChart3, TrendingUp, PieChartIcon } from 'lucide-react'

export default function AnalyticsPage() {
  const { transactions, selectedVenueId } = useApp()
  const { dailyMetrics, categoryBreakdown, metrics } = useDashboard()

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const venueTx = transactions.filter((t) => t.venueId === selectedVenueId && t.type === 'expense' && t.status !== 'duplicate')
    const sourceMap = new Map<DataSource, number>()
    let total = 0

    venueTx.forEach((t) => {
      const current = sourceMap.get(t.source) || 0
      sourceMap.set(t.source, current + t.amount)
      total += t.amount
    })

    return Array.from(sourceMap.entries())
      .map(([source, amount]) => ({
        source,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
        label: SOURCE_LABELS[source],
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, selectedVenueId])

  // Top 5 expenses
  const topExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.venueId === selectedVenueId && t.type === 'expense' && t.status !== 'duplicate')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [transactions, selectedVenueId])

  // Stacked bar data by source per day
  const stackedBarData = useMemo(() => {
    const sources: DataSource[] = ['iiko', 'bank', 'admin', 'manual']
    const dateMap = new Map<string, Record<string, number>>()

    transactions
      .filter((t) => t.venueId === selectedVenueId && t.type === 'expense' && t.status !== 'duplicate')
      .forEach((t) => {
        const existing = dateMap.get(t.date) || {}
        existing[t.source] = (existing[t.source] || 0) + t.amount
        dateMap.set(t.date, existing)
      })

    return Array.from(dateMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, sourcesMap]) => ({
        date: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        ...sourcesMap,
      }))
  }, [transactions, selectedVenueId])

  const sourceColors: Record<DataSource, string> = {
    iiko: '#3B82F6',
    bank: '#10B981',
    admin: '#F59E0B',
    manual: '#8B5CF6',
  }

  const tooltipStyle = {
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
  }

  return (
    <div>
      <Header title="Аналитика" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Source comparison (stacked bar) */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Расходы по источникам (по дням)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
	                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatCurrency(Number(value))]} />
	                  <Bar dataKey="iiko" name="iiko" stackId="a" fill={sourceColors.iiko} />
                  <Bar dataKey="bank" name="Банк" stackId="a" fill={sourceColors.bank} />
                  <Bar dataKey="admin" name="Отчёт админа" stackId="a" fill={sourceColors.admin} />
                  <Bar dataKey="manual" name="Ручной ввод" stackId="a" fill={sourceColors.manual} />
                  <Legend verticalAlign="top" iconType="circle" iconSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category pie chart */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Структура расходов по категориям
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown.map((d) => ({
                        name: CATEGORY_LABELS[d.category],
                        value: d.amount,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryBreakdown.map((d, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[d.category]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [formatCurrency(Number(value))]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top 5 expenses */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Топ-5 крупнейших расходов
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {topExpenses.map((tx, i) => {
                  const maxAmount = topExpenses[0]?.amount || 1
                  const percent = (tx.amount / maxAmount) * 100

                  return (
                    <div key={tx.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{tx.counterparty}</p>
                            <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('ru-RU')}</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-red-500 font-mono">
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profit trend line chart */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Динамика прибыли
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailyMetrics.map((d) => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                  }))}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
