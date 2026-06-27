'use client'

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/context/AppContext'
import { useReportPIO } from '@/hooks/useReportPIO'
import { useReportDDS } from '@/hooks/useReportDDS'
import { PIOReport } from '@/components/reports/PIOReport'
import { DDSReport } from '@/components/reports/DDSReport'
import { exportPIOToExcel } from '@/lib/excel/export-pio'
import { exportDDSToExcel } from '@/lib/excel/export-dds'
import { FileText, FileSpreadsheet } from 'lucide-react'

export default function ReportsPage() {
  const { transactions, selectedVenueId, venues, dateRange, cashBalances, setCashBalance } = useApp()

  const venue = venues.find((v) => v.id === selectedVenueId)
  const venueName = venue?.name || ''
  const period = `${new Date(dateRange.from + 'T00:00:00').toLocaleDateString('ru-RU')} — ${new Date(dateRange.to + 'T00:00:00').toLocaleDateString('ru-RU')}`

  const pioData = useReportPIO(transactions, selectedVenueId, dateRange)
  const ddsData = useReportDDS(transactions, selectedVenueId, dateRange, cashBalances)

  const monthKey = dateRange.from.substring(0, 7)

  return (
    <div>
      <Header title="Отчёты" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Финансовые отчёты — {venueName}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pio">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="pio">ПИО</TabsTrigger>
                  <TabsTrigger value="dds">ДДС</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pio">
                <div className="space-y-4">
                  <PIOReport data={pioData} venueName={venueName} period={period} />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => exportPIOToExcel(pioData, venueName, monthKey)}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Скачать ПИО (Excel)
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dds">
                <div className="space-y-4">
                  <DDSReport
                    data={ddsData}
                    venueName={venueName}
                    period={period}
                    onOpeningBalanceChange={(amount) => setCashBalance(selectedVenueId, monthKey, amount)}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => exportDDSToExcel(ddsData, venueName, monthKey)}
                      className="gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Скачать ДДС (Excel)
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
