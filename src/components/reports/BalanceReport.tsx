'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { calculateBalanceReportData } from '@/lib/reports/balance'
import { saveBalanceSnapshotAction } from '@/app/actions/balance'
import type { BalanceSnapshot, BalanceReportData } from '@/types'
import { 
  TrendingUp, 
  Coins, 
  Save, 
  CheckCircle2, 
  Layers
} from 'lucide-react'

interface BalanceReportProps {
  initialSnapshot: BalanceSnapshot
  monthlyOpex: number
  venueName: string
  period: string
  onSnapshotSaved?: (snapshot: BalanceSnapshot) => void
}

export function BalanceReport({
  initialSnapshot,
  monthlyOpex,
  venueName,
  period,
  onSnapshotSaved,
}: BalanceReportProps) {
  const [snapshot, setSnapshot] = useState<BalanceSnapshot>(initialSnapshot)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const reportData: BalanceReportData = calculateBalanceReportData({
    snapshot,
    monthlyOpex,
    venueName,
    period,
  })

  const handleFieldChange = (field: keyof BalanceSnapshot, val: number) => {
    setSnapshot((prev) => ({
      ...prev,
      [field]: val,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSavedSuccess(false)
    try {
      const res = await saveBalanceSnapshotAction({
        venueId: snapshot.venueId,
        monthKey: snapshot.monthKey,
        cashAmount: snapshot.cashAmount,
        inventoryFood: snapshot.inventoryFood,
        inventoryBar: snapshot.inventoryBar,
        accountsReceivable: snapshot.accountsReceivable,
        accountsPayable: snapshot.accountsPayable,
        payrollPayable: snapshot.payrollPayable,
        taxesPayable: snapshot.taxesPayable,
        guestPrepayments: snapshot.guestPrepayments,
        safetyReserveDays: snapshot.safetyReserveDays,
      })
      if (res.success && res.data) {
        setSnapshot(res.data)
        setSavedSuccess(true)
        onSnapshotSaved?.(res.data)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const { assets, liabilities, workingCapital, safeDividends } = reportData

  return (
    <div className="space-y-6">
      {/* Risk & Liquidity Radar (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* NWC Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Чистый оборотный капитал (NWC)
            </span>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(workingCapital.nwc)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Оборотные активы за вычетом срочных обязательств
            </p>
          </CardContent>
        </Card>

        {/* Current Ratio Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Текущая ликвидность (CR)
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {workingCapital.currentRatio > 100 ? '∞' : workingCapital.currentRatio.toFixed(2)}
              </span>
              <Badge
                className={
                  workingCapital.liquidityStatus === 'healthy'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : workingCapital.liquidityStatus === 'warning'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }
              >
                {workingCapital.liquidityLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Норма HoReCa: 0.8 – 1.2 (покрытие обязательств)
            </p>
          </CardContent>
        </Card>

        {/* Safe Dividends Card */}
        <Card className={safeDividends.isSafe ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wider">
              Лимит безопасных дивидендов
            </span>
            <Coins className={safeDividends.isSafe ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-rose-600'} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${safeDividends.isSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
              {safeDividends.isSafe ? formatCurrency(safeDividends.maxSafeDividend) : '0 ₽ (Запрещено)'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {safeDividends.isSafe
                ? `Резерв ${safeDividends.safetyReserveDays} дней (${formatCurrency(safeDividends.safetyBuffer)}) защищен`
                : `Дефицит ликвидности: ${formatCurrency(safeDividends.deficitAmount)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two-Column Balance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ASSETS */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                Оборотные Активы
              </CardTitle>
              <span className="font-semibold text-blue-700">
                {formatCurrency(assets.totalCurrentAssets)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Деньги (Кассы, р/с, сейф)</Label>
                <p className="text-xs text-slate-500">Автоматическое сальдо из ДДС</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.cashAmount}
                onChange={(e) => handleFieldChange('cashAmount', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Склад: Кухня (Продукты)</Label>
                <p className="text-xs text-slate-500">По данным ревизии кухни</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.inventoryFood}
                onChange={(e) => handleFieldChange('inventoryFood', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Склад: Бар (Алкоголь)</Label>
                <p className="text-xs text-slate-500">По данным ревизии бара</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.inventoryBar}
                onChange={(e) => handleFieldChange('inventoryBar', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Дебиторка (Агрегаторы, банкеты)</Label>
                <p className="text-xs text-slate-500">Долги Яндекс Еды, b2b заказчиков</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.accountsReceivable}
                onChange={(e) => handleFieldChange('accountsReceivable', parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: LIABILITIES */}
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600" />
                Краткосрочные Обязательства
              </CardTitle>
              <span className="font-semibold text-rose-700">
                {formatCurrency(liabilities.totalCurrentLiabilities)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Долг поставщикам продуктов</Label>
                <p className="text-xs text-slate-500">Неоплаченные накладные с отсрочкой</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.accountsPayable}
                onChange={(e) => handleFieldChange('accountsPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Задолженность по зарплате (ФОТ)</Label>
                <p className="text-xs text-slate-500">Начислено за отработанные смены</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.payrollPayable}
                onChange={(e) => handleFieldChange('payrollPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Налоги и страховые взносы</Label>
                <p className="text-xs text-slate-500">УСН, НДФЛ, взносы к уплате</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.taxesPayable}
                onChange={(e) => handleFieldChange('taxesPayable', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label className="text-sm font-medium text-slate-800">Авансы гостей и сертификаты</Label>
                <p className="text-xs text-slate-500">Депозиты за предстоящие банкеты</p>
              </div>
              <Input
                type="number"
                className="w-36 text-right font-medium"
                value={snapshot.guestPrepayments}
                onChange={(e) => handleFieldChange('guestPrepayments', parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Footer */}
      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-slate-700 whitespace-nowrap">Подушка безопасности:</Label>
            <Select
              value={String(snapshot.safetyReserveDays || 10)}
              onValueChange={(val) => {
                if (val) {
                  handleFieldChange('safetyReserveDays', parseInt(val, 10))
                }
              }}
            >
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Дней резерва" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней OPEX</SelectItem>
                <SelectItem value="10">10 дней OPEX</SelectItem>
                <SelectItem value="14">14 дней OPEX</SelectItem>
                <SelectItem value="21">21 день OPEX</SelectItem>
                <SelectItem value="30">30 дней OPEX</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-500">
              (буфер: {formatCurrency(safeDividends.safetyBuffer)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Снимок сохранён в БД
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Сохранение...' : 'Зафиксировать снимок баланса'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
