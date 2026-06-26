'use client'

import React, { useState, useMemo } from 'react'
import { Header } from '@/components/layout/Header'
import { DeduplicationPairCard } from '@/components/deduplication/DeduplicationPair'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useApp } from '@/context/AppContext'
import { findDuplicates } from '@/lib/deduplication/matcher'
import { Search, Copy, Play, CheckCircle2, Clock, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function DeduplicationPage() {
  const {
    selectedVenueId,
    venues,
    transactions,
    deduplicationPairs,
    resolveDeduplicationPair,
  } = useApp()

  const [filter, setFilter] = useState<'all' | 'pending' | 'merged' | 'skipped'>('pending')
  const [search, setSearch] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const venue = venues.find((v) => v.id === selectedVenueId)
  const venuePairs = deduplicationPairs.filter((p) => p.venueId === selectedVenueId)

  const filteredPairs = useMemo(() => {
    let result = venuePairs

    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.leftTransaction.counterparty.toLowerCase().includes(q) ||
          p.rightTransaction.counterparty.toLowerCase().includes(q) ||
          p.leftTransaction.description.toLowerCase().includes(q) ||
          p.rightTransaction.description.toLowerCase().includes(q)
      )
    }

    return result.sort((a, b) => b.matchScore - a.matchScore)
  }, [venuePairs, filter, search])

  const pendingCount = venuePairs.filter((p) => p.status === 'pending').length
  const mergedCount = venuePairs.filter((p) => p.status === 'merged').length
  const totalCount = venuePairs.length

  const handleRunDeduplication = () => {
    if (!venue) return
    const settings = venue.deduplicationSettings
    // The algorithm already ran in context — for demo we just toggle the view
    setHasRun(true)
  }

  return (
    <div>
      <Header title="Дедупликация" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
                <p className="text-xs text-slate-500">Ожидают проверки</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{mergedCount}</p>
                <p className="text-xs text-slate-500">Объединено</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Copy className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                <p className="text-xs text-slate-500">Всего пар найдено</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run deduplication */}
        <Card className="rounded-lg shadow-sm bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Запустить дедупликацию</p>
                <p className="text-xs text-emerald-600">
                  Поиск дубликатов по дате (±{venue?.deduplicationSettings.dateToleranceDays} дн.), сумме (±{venue?.deduplicationSettings.amountTolerancePercent}%), контрагенту
                </p>
              </div>
            </div>
            <Button onClick={handleRunDeduplication} className="gap-2">
              <Search className="h-4 w-4" />
              Найти дубликаты
            </Button>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
            {(['all', 'pending', 'merged', 'skipped'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'pending' ? 'Ожидают' : f === 'merged' ? 'Объединены' : 'Пропущены'}
                {f === 'pending' && pendingCount > 0 && (
                  <Badge className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Поиск по контрагенту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Pairs list */}
        {filteredPairs.length === 0 ? (
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-8 text-center">
              <Copy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Нет пар для просмотра</p>
              <p className="text-xs text-slate-400 mt-1">
                {hasRun
                  ? 'Все пары обработаны или нет совпадений'
                  : 'Нажмите «Найти дубликаты» для запуска анализа'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPairs.map((pair) => (
              <DeduplicationPairCard
                key={pair.id}
                pair={pair}
                onResolve={resolveDeduplicationPair}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
