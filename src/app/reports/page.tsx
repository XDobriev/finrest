'use client'

import React, { useState, useEffect } from 'react'
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
import { BalanceReport } from '@/components/reports/BalanceReport'
import { exportOPiUToExcel } from '@/lib/excel/export-opiu'
import { exportDDSToExcel } from '@/lib/excel/export-dds'
import { exportBalanceToExcel } from '@/lib/excel/export-balance'
import { getBalanceSnapshotAction } from '@/app/actions/balance'
import { calculateBalanceReportData } from '@/lib/reports/balance'
import type { BalanceSnapshot } from '@/types'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText, FileSpreadsheet, UploadCloud, Sparkles } from 'lucide-react'

export default function ReportsPage() {
  const { transactions, selectedVenueId, venues, dateRange, cashBalances, setCashBalance, isLoading } = useApp()

  const venue = venues.find((v) => v.id === selectedVenueId)
  const venueName = venue?.name || 'Заведение'
  const period = `${new Date(dateRange.from + 'T00:00:00').toLocaleDateString('ru-RU')} — ${new Date(dateRange.to + 'T00:00:00').toLocaleDateString('ru-RU')}`

  const opiuData = useReportOPiU(transactions, selectedVenueId, dateRange)
  const ddsData = useReportDDS(transactions, selectedVenueId, dateRange, cashBalances)

  const monthKey = dateRange.from.substring(0, 7)

  const [balanceSnapshot, setBalanceSnapshot] = useState<BalanceSnapshot | null>(null)

  const isBalanceLoading =
    !balanceSnapshot ||
    balanceSnapshot.venueId !== selectedVenueId ||
    balanceSnapshot.monthKey !== monthKey

  useEffect(() => {
    if (!selectedVenueId) return
    let cancelled = false

    getBalanceSnapshotAction(selectedVenueId, monthKey)
      .then((snap) => {
        if (!cancelled) {
          setBalanceSnapshot(snap)
        }
      })
      .catch((err) => {
        console.error('Failed to load balance snapshot:', err)
      })

    return () => {
      cancelled = true
    }
  }, [selectedVenueId, monthKey])

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
            ) : transactions.filter((t) => t.venueId === selectedVenueId).length === 0 ? (
              <EmptyState
                icon={<FileText className="h-7 w-7 text-emerald-600" />}
                title="Отчёты будут рассчитаны после загрузки данных"
                description="ОПиУ (P&L), ДДС (Cash Flow) и Управленческий баланс формируются в реальном времени на основе очищенных от дубликатов транзакций."
                tip="В отчете ОПиУ выручка очищается от дублирующего эквайринга, а фудкост и ФОТ сравниваются с отраслевыми стандартами (Food Cost ≤ 32%, ФОТ ≤ 25%)."
                checklist={[
                  'Загрузите выписку банка за месяц в формате .txt',
                  'Загрузите кассовые смены iiko или подключите Telegram-бота',
                  'FinRest автоматически разнесет доходы и расходы по структуре отчетов',
                ]}
                actions={
                  <>
                    <Link
                      href="/upload"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 text-sm shadow-xs transition-colors"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Загрузить выписку
                    </Link>
                    <Link
                      href="/onboarding"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 text-sm transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      Мастер онбординга
                    </Link>
                  </>
                }
              />
            ) : (
              <Tabs defaultValue="opiu">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="opiu">ОПиУ (P&L)</TabsTrigger>
                    <TabsTrigger value="dds">ДДС</TabsTrigger>
                    <TabsTrigger value="balance">Баланс (Управленческий)</TabsTrigger>
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
                      onOpeningBalanceChange={(amount, breakdown) =>
                        setCashBalance(selectedVenueId, monthKey, amount, breakdown)
                      }
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

                <TabsContent value="balance">
                  <div className="space-y-4">
                    {isBalanceLoading || !balanceSnapshot ? (
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Skeleton className="h-28 w-full rounded-lg" />
                          <Skeleton className="h-28 w-full rounded-lg" />
                          <Skeleton className="h-28 w-full rounded-lg" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Skeleton className="h-64 w-full rounded-lg" />
                          <Skeleton className="h-64 w-full rounded-lg" />
                        </div>
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    ) : (
                      <>
                        <BalanceReport
                          key={`${balanceSnapshot.venueId}-${balanceSnapshot.monthKey}-${balanceSnapshot.updatedAt}`}
                          initialSnapshot={balanceSnapshot}
                          monthlyOpex={opiuData.operatingExpenses.total}
                          venueName={venueName}
                          period={period}
                          onSnapshotSaved={(snap) => setBalanceSnapshot(snap)}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => {
                              const reportData = calculateBalanceReportData({
                                snapshot: balanceSnapshot,
                                monthlyOpex: opiuData.operatingExpenses.total,
                                venueName,
                                period,
                              })
                              exportBalanceToExcel(reportData, venueName, monthKey)
                            }}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Скачать Баланс (Excel)
                          </Button>
                        </div>
                      </>
                    )}
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
