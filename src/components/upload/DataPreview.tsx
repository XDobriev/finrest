'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { ParsedRow } from '@/lib/parsers'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/types'
import { Eye, ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface DataPreviewProps {
  rows: ParsedRow[]
  maxRows?: number
}

export function DataPreview({ rows, maxRows = 10 }: DataPreviewProps) {
  const previewRows = rows.slice(0, maxRows)

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base font-semibold text-slate-900">
              Предпросмотр данных с автокатегоризацией
            </CardTitle>
          </div>
          <Badge variant="secondary">
            {previewRows.length} из {rows.length} записей
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead className="hidden md:table-cell">Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-slate-600 font-mono tabular-nums">{i + 1}</TableCell>
                  <TableCell>
                    {row.type === 'income' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs">
                        <ArrowDownRight className="h-3 w-3" />
                        Доход
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-700 gap-1 text-xs">
                        <ArrowUpRight className="h-3 w-3 text-red-600" />
                        Расход
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">
                    {new Date(row.date).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell
                    className={`text-sm font-mono tabular-nums font-semibold ${
                      row.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {row.type === 'income' ? '+' : '-'}
                    {formatCurrency(row.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[row.category] || row.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-700">{row.counterparty}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-slate-500 max-w-[200px] truncate">
                    {row.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
