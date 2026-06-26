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
import { Eye } from 'lucide-react'

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
              Предпросмотр данных
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
                <TableHead>Дата</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead className="hidden md:table-cell">Описание</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-slate-400 font-mono">{i + 1}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">
                    {new Date(row.date).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell className="text-sm font-mono font-semibold text-slate-700">
                    {formatCurrency(row.amount)}
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
