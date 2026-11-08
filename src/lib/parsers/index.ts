import * as XLSX from 'xlsx'
import type { DataSource, ExpenseCategory } from '@/types'
import { categorizeTransaction, detectTransactionType } from '@/lib/categorizer'
export { parse1CClientBank, type BankStatement1CMeta, type BankParseResult } from './1c-bank'

export interface ParsedRow {
  date: string
  amount: number
  counterparty: string
  description: string
  category: ExpenseCategory
  type: 'income' | 'expense'
}

export interface ParseResult {
  success: boolean
  rows: ParsedRow[]
  totalRows: number
  errors: string[]
  warnings: string[]
}

export function decodeTextFile(buffer: ArrayBuffer): string {
  const utf8Text = new TextDecoder('utf-8').decode(buffer)
  // If text contains 1CClientBankExchange and does not contain the replacement character, it is valid UTF-8
  if (utf8Text.includes('1CClientBankExchange') && !utf8Text.includes('\uFFFD')) {
    return utf8Text
  }
  try {
    return new TextDecoder('windows-1251').decode(buffer)
  } catch {
    return utf8Text
  }
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
  source?: DataSource
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

    const dateCol = findColumn(headers, ['дата', 'date', 'дат', 'дт', 'период'])
    const amountCol = findColumn(headers, ['сумма', 'amount', 'сум', 'стоимость', 'выручка', 'total'])
    const counterpartyCol = findColumn(headers, [
      'контрагент',
      'поставщик',
      'counterparty',
      'vendor',
      'наименование',
      'товар',
      'блюдо',
      'клиент',
      'name',
    ])
    const descCol = findColumn(headers, [
      'описание',
      'description',
      'назначение',
      'комментарий',
      'категория',
      'группа',
      'comment',
    ])
    const typeCol = findColumn(headers, ['тип', 'type', 'операция', 'направление'])

    if (dateCol === -1) {
      result.errors.push('Не найдена колонка с датой. Ожидаемые названия: Дата, Date')
    }
    if (amountCol === -1) {
      result.errors.push('Не найдена колонка с суммой. Ожидаемые названия: Сумма, Выручка, Amount')
    }

    if (result.errors.length > 0) return result

    // Check if the sheet represents sales/revenue report (e.g. iiko sales report)
    const headersJoined = headers.join(' ').toLowerCase()
    const isSalesReport =
      (source === 'iiko' && headersJoined.includes('выручка')) ||
      headersJoined.includes('выручка') ||
      headersJoined.includes('продаж') ||
      headersJoined.includes('кассовая смена')

    // Parse rows
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowValues = Object.values(row)
      const dateVal = normalizeDate(dateCol >= 0 ? rowValues[dateCol] : null)
      const amountVal = normalizeAmount(amountCol >= 0 ? rowValues[amountCol] : null)
      const counterpartyVal = counterpartyCol >= 0 ? String(rowValues[counterpartyCol] || '').trim() : ''
      const descVal = descCol >= 0 ? String(rowValues[descCol] || '').trim() : counterpartyVal
      const rawType = typeCol >= 0 ? String(rowValues[typeCol] || '').toLowerCase() : ''

      if (!dateVal) {
        result.warnings.push(`Строка ${i + 2}: не удалось распознать дату`)
        continue
      }
      if (amountVal === null) {
        result.warnings.push(`Строка ${i + 2}: не удалось распознать сумму`)
        continue
      }

      let txType: 'income' | 'expense' = 'expense'
      if (rawType.includes('доход') || rawType.includes('приход') || rawType.includes('income')) {
        txType = 'income'
      } else if (rawType.includes('расход') || rawType.includes('списание') || rawType.includes('expense')) {
        txType = 'expense'
      } else if (isSalesReport) {
        txType = 'income'
      } else {
        txType = detectTransactionType(`${counterpartyVal} ${descVal}`, amountVal, false)
      }

      const category = txType === 'income' ? 'other' : categorizeTransaction(counterpartyVal, descVal)

      result.rows.push({
        date: dateVal,
        amount: Math.abs(amountVal),
        counterparty: counterpartyVal || (txType === 'income' ? 'Выручка ресторана' : 'Не указан'),
        description: descVal || (txType === 'income' ? 'Выручка кассовой смены' : '—'),
        category,
        type: txType,
      })
    }

    result.success = result.rows.length > 0
  } catch (err) {
    result.errors.push(`Ошибка парсинга: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
  }

  return result
}
