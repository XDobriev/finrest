'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { FileUploader } from '@/components/upload/FileUploader'
import { DataPreview } from '@/components/upload/DataPreview'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/context/AppContext'
import { generateId } from '@/lib/utils'
import { format } from 'date-fns'
import type { DataSource, ParsedRow } from '@/lib/parsers'
import type { ParseResult } from '@/lib/parsers'
import { Upload, CheckCircle2, History } from 'lucide-react'

const sources: DataSource[] = ['iiko', 'bank', 'admin', 'manual']

export default function UploadPage() {
  const { selectedVenueId, addTransaction, addFileUpload, fileUploads } = useApp()
  const [previews, setPreviews] = useState<Record<DataSource, ParsedRow[]>>({
    iiko: [], bank: [], admin: [], manual: [],
  })
  const [importing, setImporting] = useState(false)

  const handleParsed = (source: DataSource, result: ParseResult) => {
    if (result.success) {
      setPreviews((prev) => ({ ...prev, [source]: result.rows }))
    }
  }

  const handleImport = async () => {
    setImporting(true)
    // Simulate async import
    await new Promise((r) => setTimeout(r, 500))

    for (const source of sources) {
      const rows = previews[source]
      if (rows.length === 0) continue

      for (const row of rows) {
        addTransaction({
          venueId: selectedVenueId,
          source,
          date: row.date,
          amount: row.amount,
          type: 'expense',
          category: 'other',
          counterparty: row.counterparty,
          description: row.description,
        })
      }

      addFileUpload({
        venueId: selectedVenueId,
        source,
        fileName: `import_${source}_${format(new Date(), 'yyyyMMdd')}.xlsx`,
        fileSize: 102400,
        rowCount: rows.length,
        status: 'completed',
      })
    }

    setImporting(false)
    setPreviews({ iiko: [], bank: [], admin: [], manual: [] })
  }

  const totalRows = Object.values(previews).reduce((sum, rows) => sum + rows.length, 0)
  const venueUploads = fileUploads.filter((u) => u.venueId === selectedVenueId)

  return (
    <div>
      <Header title="Загрузка данных" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Upload Areas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sources.map((source) => (
            <FileUploader
              key={source}
              source={source}
              venueId={selectedVenueId}
              onParsed={(result) => handleParsed(source, result)}
            />
          ))}
        </div>

        {/* Previews */}
        {totalRows > 0 && (
          <div className="space-y-4">
            {sources.map(
              (source) =>
                previews[source].length > 0 && (
                  <DataPreview key={source} rows={previews[source]} />
                )
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  Итого: {totalRows} записей для импорта
                </Badge>
              </div>
              <Button onClick={handleImport} disabled={importing || totalRows === 0} className="gap-2">
                {importing ? (
                  <>Импортирование...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Импортировать все
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Upload History */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-slate-900">
                История загрузок
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {venueUploads.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                Нет загруженных файлов
              </p>
            ) : (
              <div className="space-y-2">
                {venueUploads.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{upload.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {upload.rowCount} записей • {(upload.fileSize / 1024).toFixed(0)} КБ
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {upload.source === 'iiko' ? 'iiko' : upload.source === 'bank' ? 'Банк' : upload.source === 'admin' ? 'Админ' : 'Ручной'}
                      </Badge>
                      <Badge className="bg-emerald-600">Загружен</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
