'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useApp } from '@/context/AppContext'
import { formatCurrency, getSourceColor } from '@/lib/utils'
import { SOURCE_LABELS, CATEGORY_LABELS } from '@/types'
import { ArrowUpRight, ArrowDownRight, Search, ChevronLeft, ChevronRight, UploadCloud, RotateCcw } from 'lucide-react'

type SortField = 'date' | 'amount' | 'counterparty' | 'source'
type SortDir = 'asc' | 'desc'

export default function TransactionsPage() {
  const { transactions, selectedVenueId, dateRange, isLoading } = useApp()

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const venueTransactions = useMemo(
    () => transactions.filter((t) => {
      if (t.venueId !== selectedVenueId) return false
      if (t.date < dateRange.from || t.date > dateRange.to) return false
      return true
    }),
    [transactions, selectedVenueId, dateRange]
  )

  const filtered = useMemo(() => {
    let result = [...venueTransactions]

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.counterparty.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      )
    }

    // Filters
    if (sourceFilter !== 'all') result = result.filter((t) => t.source === sourceFilter)
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter)
    if (categoryFilter !== 'all') result = result.filter((t) => t.category === categoryFilter)

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
        case 'counterparty':
          cmp = a.counterparty.localeCompare(b.counterparty)
          break
        case 'source':
          cmp = a.source.localeCompare(b.source)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [venueTransactions, search, sourceFilter, statusFilter, categoryFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const statusLabels: Record<string, string> = {
    unique: 'Уникальная',
    duplicate: 'Дубликат',
    pending_review: 'На проверке',
  }

  return (
    <div>
      <Header title="Транзакции" onMenuToggle={() => {}} />
      <main className="p-6 space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="text-sm font-medium">
            {filtered.length} записей
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
            {venueTransactions.filter((t) => t.type === 'income').length} доходов
          </Badge>
          <Badge className="bg-red-100 text-red-800 border border-red-300">
            {venueTransactions.filter((t) => t.type === 'expense').length} расходов
          </Badge>
        </div>

        {/* Filters */}
        <Card className="rounded-lg shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] max-w-sm">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Поиск по контрагенту или сумме..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v ?? 'all'); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="iiko">iiko</SelectItem>
                  <SelectItem value="bank">Банк</SelectItem>
                  <SelectItem value="admin">Отчёт админа</SelectItem>
                  <SelectItem value="manual">Ручной ввод</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="unique">Уникальные</SelectItem>
                  <SelectItem value="duplicate">Дубликаты</SelectItem>
                  <SelectItem value="pending_review">На проверке</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? 'all'); setPage(1) }}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="rounded-lg shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10">Тип</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-100"
                      onClick={() => handleSort('date')}
                      role="button"
                      tabIndex={0}
                      aria-label="Сортировать по дате"
                    >
                      Дата {sortField === 'date' && (sortDir === 'desc' ? '↓' : '↑')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-100"
                      onClick={() => handleSort('counterparty')}
                      role="button"
                      tabIndex={0}
                      aria-label="Сортировать по контрагенту"
                    >
                      Контрагент {sortField === 'counterparty' && (sortDir === 'desc' ? '↓' : '↑')}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Описание</TableHead>
                    <TableHead className="hidden lg:table-cell">Категория</TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-100"
                      onClick={() => handleSort('amount')}
                      role="button"
                      tabIndex={0}
                      aria-label="Сортировать по сумме"
                    >
                      Сумма {sortField === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-slate-100"
                      onClick={() => handleSort('source')}
                      role="button"
                      tabIndex={0}
                      aria-label="Сортировать по источнику"
                    >
                      Источник {sortField === 'source' && (sortDir === 'desc' ? '↓' : '↑')}
                    </TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: tx.type === 'income' ? '#D1FAE5' : '#FEE2E2',
                          }}
                        >
                          {tx.type === 'income' ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-700" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {new Date(tx.date).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell className="text-sm text-slate-700 font-medium">
                        {tx.counterparty}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {CATEGORY_LABELS[tx.category]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-sm font-mono tabular-nums font-semibold ${
                          tx.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium"
                          style={{
                            backgroundColor: `${getSourceColor(tx.source)}20`,
                            color: getSourceColor(tx.source),
                          }}
                        >
                          {SOURCE_LABELS[tx.source]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            tx.status === 'unique'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : tx.status === 'duplicate'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {tx.status === 'duplicate' && '✗ '}
                          {tx.status === 'unique' && '✓ '}
                          {statusLabels[tx.status]}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}

                  {isLoading && (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell><Skeleton className="h-7 w-7 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  )}

                  {!isLoading && paginated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-slate-600">
                        <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Search className="h-6 w-6 text-slate-500" />
                          </div>
                          <p className="text-base font-semibold text-slate-900">
                            {venueTransactions.length === 0
                              ? 'Нет транзакций за выбранный период'
                              : 'Ничего не найдено'}
                          </p>
                          <p className="text-xs text-slate-600">
                            {venueTransactions.length === 0
                              ? 'Загрузите банковскую выписку или данные из iiko, чтобы увидеть операции ресторана.'
                              : 'Попробуйте сбросить параметры поиска и фильтрации.'}
                          </p>
                          {venueTransactions.length === 0 ? (
                            <Link
                              href="/upload"
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 text-xs shadow-sm transition-colors mt-2"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                              Загрузить выписку
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearch('')
                                setSourceFilter('all')
                                setStatusFilter('all')
                                setCategoryFilter('all')
                              }}
                              className="gap-1.5 text-xs text-slate-700"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Сбросить фильтры
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Страница {page} из {totalPages} ({filtered.length} записей)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Следующая страница"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
