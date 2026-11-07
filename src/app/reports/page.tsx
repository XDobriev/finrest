'use client'

import React from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { useReportOPiU } from '@/hooks/useReportOPiU'
import { useReportDDS } from '@/hooks/useReportDDS'
import { OPiUReport } from '@/components/reports/OPiUReport'
import { DDSReport } from '@/components/reports/DDSReport'
import { exportOPiUToExcel } from '@/lib/excel/export-opiu'
import { exportDDSToExcel } from '@/lib/excel/export-dds'
import { FileText, FileSpreadsheet } from 'lucide-react'

export default function ReportsPage() {
  const { transactions, selectedVenueId, venues, dateRange, cashBalances, setCashBalance, isLoading } = useApp()

  const venue = venues.find((v) => v.id === selectedVenueId)
  const venueName = venue?.name || 'Заведение'
  const period = `${new Date(dateRange.from + 'T00:00:00').toLocaleDateString('ru-RU')} — ${new Date(dateRange.to + 'T00:00:00').toLocaleDateString('ru-RU')}`

  const opiuData = useReportOPiU(transactions, selectedVenueId, dateRange)
  const ddsData = useReportDDS(transactions, selectedVenueId, dateRange, cashBalances)

  const monthKey = dateRange.from.substring(0, 7)

  return (
    <div>
      <Header title="Отчёты" />
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
            {isLoading ? (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <Tabs defaultValue="opiu">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="opiu">ОПиУ (P&L)</TabsTrigger>
                    <TabsTrigger value="dds">ДДС</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="opiu">
                  <div className="space-y-4">
                    <OPiUReport data={opiuData} venueName={venueName} period={period} />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => exportOPiUToExcel(opiuData, venueName, monthKey)}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Скачать ОПиУ (Excel)
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
                        className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Скачать ДДС (Excel)
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
