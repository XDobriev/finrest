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
          label === 'Запись 1' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        )}>
          {label}
        </span>
        <Badge
          variant="secondary"
          className="text-[10px]"
          style={{ backgroundColor: `${getSourceColor(tx.source)}20`, color: getSourceColor(tx.source) }}
        >
          {SOURCE_LABELS[tx.source]}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-semibold text-slate-900">{tx.counterparty}</p>
            <p className="text-xs text-slate-500 mt-0.5">{tx.description}</p>
          </div>
          <p className="text-sm font-bold font-mono text-slate-900">{formatCurrency(tx.amount)}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
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
    ? 'text-red-600 bg-red-50'
    : pair.matchScore >= 70
      ? 'text-amber-600 bg-amber-50'
      : 'text-blue-600 bg-blue-50'

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5 space-y-4">
        {/* Score and reasons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', scoreColor)}>
              {pair.matchScore}%
            </span>
            <span className="text-sm font-medium text-slate-600">совпадение</span>
          </div>
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-slate-400">ID: {pair.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Match reasons */}
        <div className="flex flex-wrap gap-1.5">
          {pair.matchReasons.map((reason, i) => (
            <Badge key={i} variant="secondary" className="text-[11px] font-normal">
              {reason}
            </Badge>
          ))}
        </div>

        {/* Transaction comparison */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <TransactionCard tx={pair.leftTransaction} label="Запись 1" />
          <div className="flex items-center justify-center">
            <div className="h-px w-6 sm:hidden" />
            <div className="hidden sm:flex flex-col items-center gap-1 text-slate-400">
              <Unlink2 className="h-4 w-4" />
              <span className="text-[10px]">vs</span>
            </div>
          </div>
          <TransactionCard tx={pair.rightTransaction} label="Запись 2" />
        </div>

        {/* Actions */}
        {pair.status === 'pending' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 bg-red-600 hover:bg-red-700"
              onClick={() => onResolve(pair.id, 'merge')}
            >
              <Link className="h-3.5 w-3.5" />
              Объединить
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onResolve(pair.id, 'skip')}
            >
              <SkipForward className="h-3.5 w-3.5" />
              Оставить обе
            </Button>
          </div>
        )}

        {pair.status === 'merged' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-emerald-600 font-medium">Записи объединены</span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-xs"
              onClick={() => onResolve(pair.id, 'unmerge')}
            >
              Отменить
            </Button>
          </div>
        )}

        {pair.status === 'skipped' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <XCircle className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Оставлены раздельно</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
