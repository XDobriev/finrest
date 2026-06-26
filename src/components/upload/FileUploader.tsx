'use client'

import React, { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'
import { parseExcelFile, type ParseResult } from '@/lib/parsers'
import type { DataSource } from '@/types'
import { SOURCE_LABELS } from '@/types'

interface FileUploaderProps {
  source: DataSource
  venueId: string
  onParsed: (result: ParseResult) => void
}

export function FileUploader({ source, venueId, onParsed }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f)
      setParsing(true)
      setParseResult(null)

      const buffer = await f.arrayBuffer()
      const result = parseExcelFile(buffer, source)
      setParseResult(result)
      setParsing(false)
      onParsed(result)
    },
    [source, onParsed]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const clearFile = useCallback(() => {
    setFile(null)
    setParseResult(null)
  }, [])

  const sourceColors: Record<DataSource, string> = {
    iiko: 'border-blue-300 bg-blue-50',
    bank: 'border-emerald-300 bg-emerald-50',
    admin: 'border-amber-300 bg-amber-50',
    manual: 'border-purple-300 bg-purple-50',
  }

  const sourceIconColors: Record<DataSource, string> = {
    iiko: 'text-blue-600',
    bank: 'text-emerald-600',
    admin: 'text-amber-600',
    manual: 'text-purple-600',
  }

  return (
    <Card className={cn('rounded-lg shadow-sm overflow-hidden', sourceColors[source])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className={cn('h-5 w-5', sourceIconColors[source])} />
            <h3 className="font-semibold text-slate-900">{SOURCE_LABELS[source]}</h3>
          </div>
          {file && (
            <Button variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
              isDragging
                ? 'border-slate-400 bg-slate-100'
                : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            <Upload className="h-8 w-8 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">
              Перетащите файл сюда
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Excel (.xlsx, .xls) или CSV
            </p>
            <label className="inline-block">
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleInputChange}
              />
              <Button variant="outline" size="sm" type="button">
                Выбрать файл
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} КБ
                  </p>
                </div>
              </div>
              {parsing ? (
                <Badge variant="secondary" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Парсинг...
                </Badge>
              ) : parseResult?.success ? (
                <Badge className="gap-1 bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {parseResult.rows.length} записей
                </Badge>
              ) : parseResult ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Ошибка
                </Badge>
              ) : null}
            </div>

            {parseResult && !parseResult.success && parseResult.errors.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                {parseResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    {err}
                  </p>
                ))}
              </div>
            )}

            {parseResult && parseResult.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                <p className="text-xs font-medium text-amber-700 mb-1">Предупреждения:</p>
                {parseResult.warnings.slice(0, 5).map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
                {parseResult.warnings.length > 5 && (
                  <p className="text-xs text-amber-500">
                    ...и ещё {parseResult.warnings.length - 5}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
