'use client'

import React from 'react'
import type { DDSReportData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface DDSReportProps {
  data: DDSReportData
  venueName: string
  period: string
  onOpeningBalanceChange?: (amount: number) => void
}

function TotalLine({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  const isPositive = amount >= 0
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t-2 border-slate-200 font-semibold' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} text-slate-900`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? 'font-bold' : 'font-medium'} ${isPositive ? 'text-slate-900' : 'text-red-600'}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

export function DDSReport({ data, venueName, period, onOpeningBalanceChange }: DDSReportProps) {
  return (
    <div className="space-y-1">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-lg font-bold text-slate-900">Движение денежных средств</h2>
        <p className="text-slate-500 text-sm mt-1">{venueName}</p>
        <p className="text-slate-400 text-xs">Период: {period}</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-700">Остаток на начало периода</span>
            {onOpeningBalanceChange && (
              <div className="mt-1.5">
                <Input
                  type="number"
                  value={data.openingBalance || ''}
                  onChange={(e) => onOpeningBalanceChange(parseFloat(e.target.value) || 0)}
                  className="h-8 w-48 text-sm"
                  placeholder="Введите остаток..."
                />
              </div>
            )}
          </div>
          {!onOpeningBalanceChange && (
            <span className="text-sm font-mono font-bold text-slate-900">{formatCurrency(data.openingBalance)}</span>
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-4 mb-2">Поступления</h3>
      {data.receipts.items.map((i, idx) => (
        <div key={idx} className="flex items-center justify-between py-1.5 pl-4 border-b border-slate-100">
          <span className="text-sm text-slate-600">{i.label}</span>
          <span className="text-sm font-mono text-emerald-600">+{formatCurrency(i.amount)}</span>
        </div>
      ))}
      <TotalLine label="ИТОГО ПОСТУПЛЕНИЯ" amount={data.receipts.total} bold />

      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-4 mb-2">Выплаты</h3>
      {data.payments.groups.map((group, gIdx) => (
        <div key={gIdx} className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase pl-4 mb-1">{group.label}</p>
          {group.items.map((i, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 pl-8 border-b border-slate-50">
              <span className="text-sm text-slate-600">{i.label}</span>
              <span className="text-sm font-mono text-red-500">-{formatCurrency(i.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-1 pl-4 text-xs text-slate-500">
            <span>Итого {group.label.toLowerCase()}</span>
            <span className="font-mono">{formatCurrency(group.total)}</span>
          </div>
        </div>
      ))}
      <TotalLine label="ИТОГО ВЫПЛАТЫ" amount={data.payments.total} bold />

      <div className={`rounded-lg p-3 my-3 ${data.netCashFlow >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <TotalLine label="Чистый денежный поток" amount={data.netCashFlow} bold />
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex justify-between">
          <span className="text-base font-bold text-blue-800">Остаток на конец периода</span>
          <span className="text-lg font-mono font-bold text-blue-900">{formatCurrency(data.closingBalance)}</span>
        </div>
      </div>
    </div>
  )
}
