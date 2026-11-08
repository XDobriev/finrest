'use client'

import React, { useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { useApp } from '@/context/AppContext'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { ClipboardList, FileSpreadsheet, Cloud, Sparkles, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { CATEGORY_LABELS } from '@/types'

export default function InventoryPage() {
  const {
    selectedVenueId,
    venues,
    dateRange,
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    isLoading,
  } = useApp()

  const [showManualForm, setShowManualForm] = React.useState(false)

  const venue = venues.find(v => v.id === selectedVenueId)
  const period = dateRange.from.substring(0, 7)

  const venueItems = useMemo(
    () => inventory.filter(item => item.venueId === selectedVenueId && item.period === period),
    [inventory, selectedVenueId, period]
  )

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      ['Акт инвентаризации'],
      [`Заведение: ${venue?.name}`],
      [`Период: ${period}`],
      [],
      ['Название', 'Категория', 'Ед.', 'Расчёт', 'Факт', 'Расхождение', 'Цена/ед.', 'Сумма расхождения'],
    ]

    let totalShortage = 0
    venueItems.forEach(item => {
      const shortage = item.expectedQty - item.actualQty
      const cost = shortage * item.pricePerUnit
      totalShortage += cost
      rows.push([
        item.name,
        CATEGORY_LABELS[item.category],
        item.unit,
        item.expectedQty,
        item.actualQty,
        shortage,
        item.pricePerUnit,
        cost,
      ])
    })

    rows.push([])
    rows.push(['ИТОГО', '', '', '', '', '', '', totalShortage])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Инвентаризация')
    XLSX.writeFile(wb, `inventory_${venue?.name}_${period}.xlsx`)
  }

  return (
    <div>
      <Header title="Инвентаризация" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  Инвентаризация за {period}
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2" disabled={venueItems.length === 0}>
                <FileSpreadsheet className="h-4 w-4" />
                Скачать акт
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-1">{venue?.name}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : venueItems.length === 0 && !showManualForm ? (
              <EmptyState
                icon={<ClipboardList className="h-7 w-7 text-emerald-600" />}
                title={`Акт инвентаризации за ${period} пуст`}
                description="Внесите фактические остатки кухни и бара или синхронизируйте номенклатуру из iikoCloud, чтобы рассчитать недостачи, излишки и точный Food Cost."
                tip="Расхождение = Расчетный остаток (техкарты) − Факт. Отрицательное расхождение показывает перерасход, бой или скрытые списания сырья."
                checklist={[
                  'Синхронизируйте номенклатуру из iikoCloud или внесите остатки вручную',
                  'Введите фактический остаток по результатам переучета кухни/бара',
                  'Скачайте официальный сличительный акт инвентаризации в Excel',
                ]}
                actions={
                  <>
                    <Button
                      onClick={() => setShowManualForm(true)}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9"
                    >
                      <Plus className="h-4 w-4" />
                      Внести позицию вручную
                    </Button>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-xs transition-colors"
                    >
                      <Cloud className="h-3.5 w-3.5 text-blue-600" />
                      Синхронизировать iiko
                    </Link>
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 text-xs transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Мастер онбординга
                    </Link>
                  </>
                }
              />
            ) : (
              <InventoryTable
                items={venueItems}
                onAdd={addInventoryItem}
                onUpdate={updateInventoryItem}
                onDelete={deleteInventoryItem}
                venueId={selectedVenueId}
                period={period}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
