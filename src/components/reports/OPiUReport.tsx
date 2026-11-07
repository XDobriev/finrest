'use client'

import React from 'react'
import Link from 'next/link'
import type { OPiUReportData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { FileText, UploadCloud } from 'lucide-react'

interface OPiUReportProps {
  data: OPiUReportData
  venueName: string
  period: string
}

function Section({ title }: { title: string }) {
  return <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-4 mb-2">{title}</h3>
}

function LineItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 pl-4 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-mono tabular-nums text-slate-900">{formatCurrency(amount)}</span>
    </div>
  )
}

function TotalLine({ label, amount, variant = 'default' }: { label: string; amount: number; variant?: 'default' | 'profit' | 'loss' }) {
  const color = variant === 'profit' ? 'text-emerald-700' : variant === 'loss' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className={`flex items-center justify-between py-2 border-t-2 border-slate-200 font-semibold ${color}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono tabular-nums">{formatCurrency(amount)}</span>
    </div>
  )
}

export function OPiUReport({ data, venueName, period }: OPiUReportProps) {
  const hasData = data.revenue.total > 0 || data.costOfGoods.total > 0 || data.operatingExpenses.total > 0

  return (
    <div className="space-y-1">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-lg font-bold text-slate-900">Отчёт о прибылях и убытках (ОПиУ / P&L)</h2>
        <p className="text-slate-600 text-sm mt-1">{venueName}</p>
        <p className="text-slate-600 text-xs">Период: {period}</p>
      </div>

      {!hasData ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">Нет данных для отчёта ОПиУ</p>
          <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">
            Загрузите банковскую выписку или данные продаж из iiko для формирования отчёта о прибылях и убытках (P&L).
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-sm shadow-sm transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            Загрузить выписку
          </Link>
        </div>
      ) : (
        <>
          <Section title="Выручка" />
          {data.revenue.items.map((i, idx) => <LineItem key={idx} label={i.label} amount={i.amount} />)}
          <TotalLine label="ИТОГО ВЫРУЧКА" amount={data.revenue.total} />

          <Section title="Себестоимость (Food Cost & Bar Cost)" />
          {data.costOfGoods.items.map((i, idx) => <LineItem key={idx} label={i.label} amount={i.amount} />)}
          <TotalLine label="ИТОГО СЕБЕСТОИМОСТЬ" amount={data.costOfGoods.total} />

          <div className="rounded-lg bg-blue-50 p-3 my-3">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-blue-800">Валовая прибыль</span>
              <span className="text-sm font-mono tabular-nums font-bold text-blue-900">{formatCurrency(data.grossProfit)}</span>
            </div>
            <p className="text-xs font-mono tabular-nums text-blue-600 mt-1">Маржа: {data.grossMargin.toFixed(1)}%</p>
          </div>

          <Section title="Операционные расходы" />
          {data.operatingExpenses.items.map((i, idx) => <LineItem key={idx} label={i.label} amount={i.amount} />)}
          <TotalLine label="ИТОГО ОПЕРАЦИОННЫЕ" amount={data.operatingExpenses.total} />

          <TotalLine label="Операционная прибыль" amount={data.operatingProfit} variant={data.operatingProfit >= 0 ? 'profit' : 'loss'} />

          {data.otherExpenses.items.length > 0 && (
            <>
              <Section title="Прочие расходы" />
              {data.otherExpenses.items.map((i, idx) => <LineItem key={idx} label={i.label} amount={i.amount} />)}
              <TotalLine label="ИТОГО ПРОЧИЕ" amount={data.otherExpenses.total} />
            </>
          )}

          <div className={`rounded-lg p-4 my-3 ${data.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className="flex justify-between">
              <span className={`text-base font-bold ${data.netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>Чистая прибыль</span>
              <span className={`text-lg font-mono tabular-nums font-bold ${data.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>{formatCurrency(data.netProfit)}</span>
            </div>
            <p className={`text-xs font-mono tabular-nums mt-1 ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Рентабельность: {data.netMargin.toFixed(1)}%
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// Backward compatibility alias
export const PIOReport = OPiUReport
