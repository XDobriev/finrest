'use client'

import React, { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useApp } from '@/context/AppContext'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { CATEGORY_LABELS, SOURCE_LABELS } from '@/types'
import { FileText, Download, Eye, FileSpreadsheet, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const { transactions, selectedVenueId, venues } = useApp()
  const { metrics, categoryBreakdown } = useDashboard()

  const [comment, setComment] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const venue = venues.find((v) => v.id === selectedVenueId)
  const venueTransactions = transactions.filter((t) => t.venueId === selectedVenueId)

  const handleExportExcel = () => {
    const data: Record<string, string | number>[] = venueTransactions
      .filter((t) => t.status !== 'duplicate')
      .map((t) => ({
        'Дата': new Date(t.date).toLocaleDateString('ru-RU'),
        'Тип': t.type === 'income' ? 'Доход' : 'Расход',
        'Сумма': t.amount,
        'Категория': CATEGORY_LABELS[t.category],
        'Контрагент': t.counterparty,
        'Описание': t.description,
        'Источник': SOURCE_LABELS[t.source],
      }))

    // Add summary rows
    data.push({})
    data.push({ 'Дата': 'ИТОГО', 'Сумма': metrics.totalRevenue, 'Тип': 'Выручка' })
    data.push({ 'Дата': 'ИТОГО', 'Сумма': metrics.totalExpensesAfterDedup, 'Тип': 'Расходы (после дедуп.)' })
    data.push({ 'Дата': 'ИТОГО', 'Сумма': metrics.netProfit, 'Тип': 'Чистая прибыль' })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Отчёт')

    const fileName = `finrest_report_${venue?.name || 'report'}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div>
      <Header title="Отчёты" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Report form */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Сформировать отчёт для руководства
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Заведение</Label>
                <Input value={venue?.name || ''} readOnly className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>Период</Label>
                <Input value="01.06.2025 — 10.06.2025" readOnly className="bg-slate-50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Комментарий к отчёту</Label>
              <Textarea
                placeholder="Добавьте комментарий для руководства (необязательно)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4" />
                Предпросмотр
              </Button>
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Предпросмотр отчёта</DialogTitle>
                  </DialogHeader>
                  <ReportPreviewContent
                    venueName={venue?.name || ''}
                    metrics={metrics}
                    categoryBreakdown={categoryBreakdown}
                    comment={comment}
                    transactions={venueTransactions}
                  />
                </DialogContent>
              </Dialog>

              <Button onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Скачать Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Всего транзакций</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatNumber(venueTransactions.filter((t) => t.status !== 'duplicate').length)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Дубликатов найдено</p>
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(venueTransactions.filter((t) => t.status === 'duplicate').length)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Экономия</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(metrics.totalExpenses - metrics.totalExpensesAfterDedup)}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function ReportPreviewContent({
  venueName,
  metrics,
  categoryBreakdown,
  comment,
  transactions,
}: {
  venueName: string
  metrics: { totalRevenue: number; totalExpenses: number; totalExpensesAfterDedup: number; netProfit: number; savingsPercent: number }
  categoryBreakdown: { category: string; amount: number; percent: number }[]
  comment: string
  transactions: { type: string; amount: number; status: string }[]
}) {
  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-bold text-slate-900">Финансовый отчёт</h2>
        <p className="text-slate-500 mt-1">{venueName}</p>
        <p className="text-slate-400 text-xs">Период: 01.06.2025 — 10.06.2025</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-xs text-blue-600 font-medium">Выручка</p>
          <p className="text-xl font-bold text-blue-900 mt-1">{formatCurrency(metrics.totalRevenue)}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-xs text-red-600 font-medium">Расходы (после дедуп.)</p>
          <p className="text-xl font-bold text-red-900 mt-1">{formatCurrency(metrics.totalExpensesAfterDedup)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 p-4 col-span-2">
          <p className="text-xs text-emerald-600 font-medium">Чистая прибыль</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{formatCurrency(metrics.netProfit)}</p>
          <p className="text-xs text-emerald-500 mt-1">
            Экономия от дедупликации: {formatCurrency(metrics.totalExpenses - metrics.totalExpensesAfterDedup)} ({metrics.savingsPercent.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Расходы по категориям</h3>
        <div className="space-y-1.5">
          {categoryBreakdown.map((cat) => (
            <div key={cat.category} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-slate-700">{CATEGORY_LABELS[cat.category as keyof typeof CATEGORY_LABELS]}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium text-slate-900">{formatCurrency(cat.amount)}</span>
                <span className="text-xs text-slate-400 w-12 text-right">{cat.percent.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment */}
      {comment && (
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Комментарий</p>
          <p className="text-slate-700">{comment}</p>
        </div>
      )}
    </div>
  )
}
