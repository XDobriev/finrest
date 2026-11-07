'use client'

import React from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SOURCE_LABELS, CATEGORY_LABELS, type Transaction, type DeduplicationPair } from '@/types'
import { getSourceColor } from '@/lib/utils'
import { Link, Unlink2, SkipForward, CheckCircle2, XCircle } from 'lucide-react'

interface DeduplicationPairCardProps {
  pair: DeduplicationPair
  onResolve: (pairId: string, action: 'merge' | 'skip' | 'unmerge') => void
}

function TransactionCard({ tx, label }: { tx: Transaction; label: string }) {
  return (
    <div className={cn(
      'rounded-lg border p-4 flex-1',
      label === 'Запись 1' ? 'border-blue-200 bg-blue-50/50' : 'border-amber-200 bg-amber-50/50'
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          label === 'Запись 1' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
        )}>
          {label}
        </span>
        <Badge
          variant="secondary"
          className="text-xs"
          style={{ backgroundColor: `${getSourceColor(tx.source)}20`, color: getSourceColor(tx.source) }}
        >
          {SOURCE_LABELS[tx.source]}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-slate-900">{tx.counterparty}</p>
            <p className="text-xs text-slate-600 mt-0.5">{tx.description}</p>
          </div>
          <p className="text-sm font-bold font-mono tabular-nums text-slate-900">{formatCurrency(tx.amount)}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>{new Date(tx.date).toLocaleDateString('ru-RU')}</span>
          <span>•</span>
          <span>{CATEGORY_LABELS[tx.category]}</span>
        </div>
      </div>
    </div>
  )
}

export function DeduplicationPairCard({ pair, onResolve }: DeduplicationPairCardProps) {
  const scoreColor = pair.matchScore >= 85
    ? 'text-red-700 bg-red-100 border border-red-200'
    : pair.matchScore >= 70
      ? 'text-amber-900 bg-amber-100 border border-amber-200'
      : 'text-blue-800 bg-blue-100 border border-blue-200'

  const savingsAmount = Math.min(pair.leftTransaction.amount, pair.rightTransaction.amount) || pair.rightTransaction.amount

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Score and reasons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', scoreColor)}>
              {pair.matchScore}%
            </span>
            <span className="text-sm font-medium text-slate-700">совпадение</span>
          </div>
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-slate-600">ID: {pair.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Match reasons */}
        <div className="flex flex-wrap gap-1.5">
          {pair.matchReasons.map((reason, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-normal">
              {reason}
            </Badge>
          ))}
        </div>

        {/* Transaction comparison */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <TransactionCard tx={pair.leftTransaction} label="Запись 1" />
          <div className="flex items-center justify-center">
            <div className="h-px w-6 sm:hidden" />
            <div className="hidden sm:flex flex-col items-center gap-1 text-slate-500">
              <Unlink2 className="h-4 w-4" />
              <span className="text-xs font-medium">vs</span>
            </div>
          </div>
          <TransactionCard tx={pair.rightTransaction} label="Запись 2" />
        </div>

        {/* Actions */}
        {pair.status === 'pending' && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                onClick={() => onResolve(pair.id, 'merge')}
              >
                <Link className="h-3.5 w-3.5" />
                Объединить
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-slate-700"
                onClick={() => onResolve(pair.id, 'skip')}
              >
                <SkipForward className="h-3.5 w-3.5" />
                Оставить обе
              </Button>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono tabular-nums text-xs font-semibold px-2.5 py-1">
              Экономия: +{formatCurrency(savingsAmount)}
            </Badge>
          </div>
        )}

        {pair.status === 'merged' && (
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span className="text-sm text-emerald-800 font-medium">Записи объединены</span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono tabular-nums text-xs font-semibold">
                Сэкономлено: +{formatCurrency(savingsAmount)}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-slate-600 hover:text-slate-900"
              onClick={() => onResolve(pair.id, 'unmerge')}
            >
              Отменить
            </Button>
          </div>
        )}

        {pair.status === 'skipped' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <XCircle className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Оставлены раздельно</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
