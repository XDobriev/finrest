'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getSourceColor } from '@/lib/utils'
import { SOURCE_LABELS, CATEGORY_LABELS, type Transaction } from '@/types'
import { ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const sorted = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          Последние транзакции
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-slate-600 text-sm">
            Нет транзакций за выбранный период
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${getSourceColor(tx.source)}20` }}
                  >
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tx.counterparty}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-600">
                        {new Date(tx.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        {CATEGORY_LABELS[tx.category]}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold font-mono tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <FileText className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-600">
                      {SOURCE_LABELS[tx.source]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
