'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { DeduplicationPairCard } from '@/components/deduplication/DeduplicationPair'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/context/AppContext'
import { Search, Copy, Play, CheckCircle2, Clock, Loader2, Zap, Keyboard, UploadCloud } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function DeduplicationPage() {
  const {
    selectedVenueId,
    venues,
    transactions,
    deduplicationPairs,
    resolveDeduplicationPair,
    runDeduplication,
    isLoading,
  } = useApp()

  const [filter, setFilter] = useState<'all' | 'pending' | 'merged' | 'skipped'>('pending')
  const [search, setSearch] = useState('')
  const [hasRun, setHasRun] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isBulkMerging, setIsBulkMerging] = useState(false)

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
  const perfectMatches = venuePairs.filter((p) => p.status === 'pending' && p.matchScore === 100)

  const venueTransactions = transactions.filter((t) => t.venueId === selectedVenueId)
  const inFlightRef = useRef(false)

  // Hotkeys: M to merge first pair, S to skip (with modifier key protection: ignores Cmd+S, Ctrl+S, etc.)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore key combinations with Ctrl, Meta/Cmd, Alt
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      if (isBulkMerging || isRunning || inFlightRef.current) {
        return
      }

      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      const firstPending = filteredPairs.find((p) => p.status === 'pending')
      if (!firstPending) return

      if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        e.preventDefault()
        inFlightRef.current = true
        try {
          await resolveDeduplicationPair(firstPending.id, 'merge')
        } finally {
          inFlightRef.current = false
        }
      } else if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
        e.preventDefault()
        inFlightRef.current = true
        try {
          await resolveDeduplicationPair(firstPending.id, 'skip')
        } finally {
          inFlightRef.current = false
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredPairs, resolveDeduplicationPair, isBulkMerging, isRunning])

  const handleRunDeduplication = async () => {
    if (!venue) return
    setIsRunning(true)
    try {
      await runDeduplication()
      setHasRun(true)
    } finally {
      setIsRunning(false)
    }
  }

  const handleBulkMergeAll100 = async () => {
    if (perfectMatches.length === 0) return
    setIsBulkMerging(true)
    try {
      for (const pair of perfectMatches) {
        await resolveDeduplicationPair(pair.id, 'merge')
      }
    } finally {
      setIsBulkMerging(false)
    }
  }

  return (
    <div>
      <Header title="Дедупликация" />
      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">{pendingCount}</p>
                <p className="text-xs text-slate-600">Ожидают проверки</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">{mergedCount}</p>
                <p className="text-xs text-slate-600">Объединено</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Copy className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">{totalCount}</p>
                <p className="text-xs text-slate-600">Всего пар найдено</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run deduplication & Bulk Merge */}
        <Card className="rounded-lg shadow-sm bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Анализ дубликатов</p>
                <p className="text-xs text-emerald-800">
                  Поиск дубликатов по дате (±{venue?.deduplicationSettings.dateToleranceDays} дн.), сумме (±{venue?.deduplicationSettings.amountTolerancePercent}%), контрагенту
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleBulkMergeAll100}
                disabled={perfectMatches.length === 0 || isBulkMerging}
                className="gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-medium"
              >
                {isBulkMerging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Объединить все пары со 100% совпадением ({perfectMatches.length})
              </Button>
              <Button
                variant="outline"
                onClick={handleRunDeduplication}
                disabled={isRunning}
                className="gap-2 bg-white text-slate-700 hover:bg-slate-50"
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {isRunning ? 'Поиск...' : 'Найти дубликаты'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hotkey Helper Banner */}
        <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
          <Keyboard className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            <strong>Горячие клавиши:</strong> клавиша <kbd className="px-1.5 py-0.5 font-mono text-xs font-semibold bg-white border border-slate-300 rounded shadow-xs text-slate-800">M</kbd> — объединить первую пару, клавиша <kbd className="px-1.5 py-0.5 font-mono text-xs font-semibold bg-white border border-slate-300 rounded shadow-xs text-slate-800">S</kbd> — пропустить (оставить обе)
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
            {(['all', 'pending', 'merged', 'skipped'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'pending' ? 'Ожидают' : f === 'merged' ? 'Объединены' : 'Пропущены'}
                {f === 'pending' && pendingCount > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 flex items-center justify-center text-xs bg-slate-900 text-white">
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
              aria-label="Поиск по контрагенту или описанию"
            />
          </div>
        </div>

        {/* Pairs list / Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="rounded-lg shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <Skeleton className="h-28 flex-1 rounded-lg" />
                  <Skeleton className="h-28 flex-1 rounded-lg" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-28 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPairs.length === 0 ? (
          <Card className="rounded-lg shadow-sm border-dashed">
            <CardContent className="p-10 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Copy className="h-6 w-6 text-slate-500" />
              </div>
              <p className="text-base font-semibold text-slate-900">
                {venueTransactions.length === 0
                  ? 'Нет данных для анализа дубликатов'
                  : 'Нет пар для просмотра'}
              </p>
              <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto mb-4">
                {venueTransactions.length === 0
                  ? 'Загрузите банковские выписки или отчёты iiko, чтобы запустить поиск повторяющихся транзакций.'
                  : hasRun
                  ? 'Все обнаруженные дубликаты успешно обработаны или совпадающих записей не найдено.'
                  : 'Нажмите «Найти дубликаты» для анализа транзакций на наличие повторов.'}
              </p>
              {venueTransactions.length === 0 ? (
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-sm shadow-sm transition-colors"
                >
                  <UploadCloud className="h-4 w-4" />
                  Загрузить выписку
                </Link>
              ) : !hasRun ? (
                <Button
                  onClick={handleRunDeduplication}
                  disabled={isRunning}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Search className="h-4 w-4" />
                  Найти дубликаты
                </Button>
              ) : null}
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
