'use client'

import React, { useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { useApp } from '@/context/AppContext'
import { ClipboardList, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { CATEGORY_LABELS } from '@/types'

export default function InventoryPage() {
  const { selectedVenueId, venues, dateRange, inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useApp()

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
            <p className="text-xs text-slate-500 mt-1">{venue?.name}</p>
          </CardHeader>
          <CardContent>
            <InventoryTable
              items={venueItems}
              onAdd={addInventoryItem}
              onUpdate={updateInventoryItem}
              onDelete={deleteInventoryItem}
              venueId={selectedVenueId}
              period={period}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
