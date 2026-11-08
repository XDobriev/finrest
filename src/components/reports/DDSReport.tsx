'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import type { DDSReportData } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Landmark, Vault, Wallet, Scale, Check, FileText, UploadCloud } from 'lucide-react'

interface DDSReportProps {
  data: DDSReportData
  venueName: string
  period: string
  onOpeningBalanceChange?: (
    amount: number,
    breakdown?: { bank?: number; safe?: number; shift?: number }
  ) => void
}

function TotalLine({ label, amount, bold = false }: { label: string; amount: number; bold?: boolean }) {
  const isPositive = amount >= 0
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'border-t-2 border-slate-200 font-semibold' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} text-slate-900`}>{label}</span>
      <span className={`text-sm font-mono tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${isPositive ? 'text-slate-900' : 'text-red-600'}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  )
}

function getInitialRecon(bal: number) {
  if (bal !== 0) {
    const bank = Math.round(bal * 0.7)
    const safe = Math.round(bal * 0.2)
    const shift = Math.round((bal - bank - safe) * 100) / 100
    return { bank: String(bank), safe: String(safe), shift: String(shift) }
  }
  return { bank: '0', safe: '0', shift: '0' }
}

export function DDSReport({ data, venueName, period, onOpeningBalanceChange }: DDSReportProps) {
  // Local state for opening balance input to prevent resetting to 0 when typing/erasing
  const [inputValue, setInputValue] = useState<string>(
    data.openingBalance ? String(data.openingBalance) : ''
  )
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Reconciliation accounts state - initialized directly from current openingBalance
  const [bankBalance, setBankBalance] = useState<string>(() => getInitialRecon(data.openingBalance).bank)
  const [safeBalance, setSafeBalance] = useState<string>(() => getInitialRecon(data.openingBalance).safe)
  const [shiftBalance, setShiftBalance] = useState<string>(() => getInitialRecon(data.openingBalance).shift)

  // Sync input value when prop updates externally without overwriting user custom breakdown if sums match
  const [prevOpeningBalance, setPrevOpeningBalance] = useState(data.openingBalance)
  if (data.openingBalance !== prevOpeningBalance) {
    setPrevOpeningBalance(data.openingBalance)
    setInputValue(data.openingBalance ? String(data.openingBalance) : '')
    const currentReconSum =
      (parseFloat(bankBalance.replace(/\s+/g, '').replace(',', '.')) || 0) +
      (parseFloat(safeBalance.replace(/\s+/g, '').replace(',', '.')) || 0) +
      (parseFloat(shiftBalance.replace(/\s+/g, '').replace(',', '.')) || 0)

    if (Math.abs(currentReconSum - data.openingBalance) > 0.001) {
      const recon = getInitialRecon(data.openingBalance)
      setBankBalance(recon.bank)
      setSafeBalance(recon.safe)
      setShiftBalance(recon.shift)
    }
  }

  const handleCommitInput = () => {
    const trimmed = inputValue.trim()
    if (trimmed === '') {
      // If user erased the input completely, revert to saved balance without zeroing out
      setInputValue(data.openingBalance ? String(data.openingBalance) : '')
      return
    }
    const parsed = parseFloat(trimmed.replace(/\s+/g, '').replace(',', '.'))
    if (!isNaN(parsed) && onOpeningBalanceChange) {
      onOpeningBalanceChange(parsed)
    } else {
      setInputValue(data.openingBalance ? String(data.openingBalance) : '')
    }
  }

  const handleApplyReconciliation = () => {
    const b = parseFloat(bankBalance.replace(/\s+/g, '').replace(',', '.')) || 0
    const s = parseFloat(safeBalance.replace(/\s+/g, '').replace(',', '.')) || 0
    const sh = parseFloat(shiftBalance.replace(/\s+/g, '').replace(',', '.')) || 0
    const total = b + s + sh
    setInputValue(String(total))
    if (onOpeningBalanceChange) {
      onOpeningBalanceChange(total, { bank: b, safe: s, shift: sh })
    }
    setPopoverOpen(false)
  }

  const reconBank = parseFloat(bankBalance.replace(/\s+/g, '').replace(',', '.')) || 0
  const reconSafe = parseFloat(safeBalance.replace(/\s+/g, '').replace(',', '.')) || 0
  const reconShift = parseFloat(shiftBalance.replace(/\s+/g, '').replace(',', '.')) || 0
  const reconTotal = reconBank + reconSafe + reconShift

  const hasData =
    data.receipts.items.length > 0 ||
    data.payments.groups.length > 0 ||
    data.openingBalance > 0

  return (
    <div className="space-y-1">
      <div className="border-b border-border pb-3 mb-4">
        <h2 className="text-lg font-bold text-slate-900">Движение денежных средств (ДДС)</h2>
        <p className="text-slate-600 text-sm mt-1">{venueName}</p>
        <p className="text-slate-600 text-xs">Период: {period}</p>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-slate-800">
              Остаток на начало периода
            </span>
            <p className="text-xs text-slate-600 mt-0.5">
              Сумма на расчётных счетах, в сейфе и операционной кассе
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpeningBalanceChange ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={handleCommitInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="h-9 w-40 text-sm font-mono tabular-nums font-semibold bg-white"
                  placeholder="0.00"
                  aria-label="Остаток на начало периода"
                />
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-slate-700 bg-white"
                        aria-label="Сверка остатков по счетам"
                      >
                        <Scale className="h-3.5 w-3.5 text-emerald-600" />
                        Сверка счетов
                      </Button>
                    }
                  />
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="space-y-3">
                      <div className="border-b pb-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          Сверка остатков ресторана
                        </h4>
                        <p className="text-xs text-slate-600">
                          Разбивка денежных средств по местам хранения
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5 text-blue-600" />
                            Р/С Банк
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={bankBalance}
                            onChange={(e) => setBankBalance(e.target.value)}
                            className="h-8 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <Vault className="h-3.5 w-3.5 text-amber-600" />
                            Сейф ресторана
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={safeBalance}
                            onChange={(e) => setSafeBalance(e.target.value)}
                            className="h-8 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                            Касса смены
                          </label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={shiftBalance}
                            onChange={(e) => setShiftBalance(e.target.value)}
                            className="h-8 text-xs font-mono tabular-nums"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="border-t pt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">Итого сверка:</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {formatCurrency(reconTotal)}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleApplyReconciliation}
                        className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs mt-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Применить в остаток
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <span className="text-sm font-mono tabular-nums font-bold text-slate-900">
                {formatCurrency(data.openingBalance)}
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="h-6 w-6 text-slate-500" />
          </div>
          <p className="text-base font-semibold text-slate-900 mb-1">
            Нет движения средств за выбранный период
          </p>
          <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">
            Загрузите банковскую выписку или укажите начальный остаток кассы для формирования отчёта ДДС.
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
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-4 mb-2">Поступления</h3>
          {data.receipts.items.map((i, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 pl-4 border-b border-slate-100">
              <span className="text-sm text-slate-600">{i.label}</span>
              <span className="text-sm font-mono tabular-nums text-emerald-600">+{formatCurrency(i.amount)}</span>
            </div>
          ))}
          <TotalLine label="ИТОГО ПОСТУПЛЕНИЯ" amount={data.receipts.total} bold />

          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mt-4 mb-2">Выплаты</h3>
          {data.payments.groups.map((group, gIdx) => (
            <div key={gIdx} className="mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase pl-4 mb-1">{group.label}</p>
              {group.items.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 pl-8 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{i.label}</span>
                  <span className="text-sm font-mono tabular-nums text-red-600">-{formatCurrency(i.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1 pl-4 text-xs text-slate-600">
                <span>Итого {group.label.toLowerCase()}</span>
                <span className="font-mono tabular-nums">{formatCurrency(group.total)}</span>
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
              <span className="text-lg font-mono tabular-nums font-bold text-blue-900">{formatCurrency(data.closingBalance)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
