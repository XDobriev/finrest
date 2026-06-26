import * as XLSX from 'xlsx'
import type { DataSource } from '@/types'

export interface ParsedRow {
  date: string
  amount: number
  counterparty: string
  description: string
  category: string
  type: 'income' | 'expense'
}

export interface ParseResult {
  success: boolean
  rows: ParsedRow[]
  totalRows: number
  errors: string[]
  warnings: string[]
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const d = new Date(date.y, date.m - 1, date.d)
      return d.toISOString().split('T')[0]
    }
  }
  if (typeof value === 'string') {
    // Try DD.MM.YYYY
    const match = value.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (match) {
      const [, d, m, y] = match
      return `${y}-${m}-${d}`
    }
    // Try ISO or other parseable format
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  return null
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }
  return null
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().trim())
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate.toLowerCase()))
    if (idx !== -1) return idx
  }
  return -1
}

export function parseExcelFile(
  buffer: ArrayBuffer,
  source: DataSource
): ParseResult {
  const result: ParseResult = {
    success: false,
    rows: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    if (!sheet) {
      result.errors.push('Файл не содержит листов с данными')
      return result
    }

    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    if (rawData.length === 0) {
      result.errors.push('Файл пуст')
      return result
    }

    result.totalRows = rawData.length

    // Detect column mapping based on source type
    const headers = Object.keys(rawData[0])

    const dateCol = findColumn(headers, ['дата', 'date', 'дат', 'дт'])
    const amountCol = findColumn(headers, ['сумма', 'amount', 'сум', 'стоимость', 'total'])
    const counterpartyCol = findColumn(headers, [
      'контрагент',
      'поставщик',
      'counterparty',
      'vendor',
      'наименование',
      'name',
      'описание',
    ])
    const descCol = findColumn(headers, [
      'описание',
      'description',
      'назначение',
      'комментарий',
      'comment',
    ])

    if (dateCol === -1) {
      result.errors.push('Не найдена колонка с датой. Ожидаемые названия: Дата, Date')
    }
    if (amountCol === -1) {
      result.errors.push('Не найдена колонка с суммой. Ожидаемые названия: Сумма, Amount')
    }

    if (result.errors.length > 0) return result

    // Parse rows
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowValues = Object.values(row)
      const dateVal = normalizeDate(dateCol >= 0 ? rowValues[dateCol] : null)
      const amountVal = normalizeAmount(amountCol >= 0 ? rowValues[amountCol] : null)
      const counterpartyVal = counterpartyCol >= 0 ? String(rowValues[counterpartyCol] || '').trim() : ''
      const descVal = descCol >= 0 ? String(rowValues[descCol] || '').trim() : counterpartyVal

      if (!dateVal) {
        result.warnings.push(`Строка ${i + 2}: не удалось распознать дату`)
        continue
      }
      if (amountVal === null) {
        result.warnings.push(`Строка ${i + 2}: не удалось распознать сумму`)
        continue
      }

      result.rows.push({
        date: dateVal,
        amount: Math.abs(amountVal),
        counterparty: counterpartyVal || 'Не указан',
        description: descVal || '—',
        category: 'other',
        type: amountVal >= 0 ? 'expense' : 'expense', // Will be determined by source
      })
    }

    result.success = result.rows.length > 0
  } catch (err) {
    result.errors.push(`Ошибка парсинга: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
  }

  return result
}
