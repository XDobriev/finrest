import { categorizeTransaction, detectTransactionType } from '@/lib/categorizer'
import type { ParseResult } from './index'
export type { ParsedRow } from './index'

export interface BankStatement1CMeta {
  formatVersion?: string
  sender?: string
  accountNumber?: string
  dateStart?: string
  dateEnd?: string
  initialBalance?: number
  finalBalance?: number
  totalInflow?: number
  totalOutflow?: number
}

export interface BankParseResult extends ParseResult {
  meta?: BankStatement1CMeta
}

export const parse1CBankStatement = parse1CClientBank

export function parse1CClientBank(content: string, venueName?: string): BankParseResult {
  const result: BankParseResult = {
    success: false,
    rows: [],
    totalRows: 0,
    errors: [],
    warnings: [],
  }

  const lines = content.split(/\r?\n/)
  if (lines.length === 0 || !lines[0].includes('1CClientBankExchange')) {
    result.errors.push('Файл не соответствует формату 1CClientBankExchange')
    return result
  }

  const meta: BankStatement1CMeta = {}
  let currentDoc: Record<string, string> | null = null
  const venueLower = venueName ? venueName.toLowerCase().replace(/[«»"']/g, '').trim() : ''

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    const eqIdx = rawLine.indexOf('=')
    const key = eqIdx !== -1 ? rawLine.substring(0, eqIdx).trim() : rawLine
    const value = eqIdx !== -1 ? rawLine.substring(eqIdx + 1).trim() : ''

    if (key === 'ВерсияФормата') meta.formatVersion = value
    if (key === 'Отправитель') meta.sender = value
    if (key === 'РасчетныйСчет') meta.accountNumber = value
    if (key === 'ДатаНачала') meta.dateStart = parseRuDate(value) ?? undefined
    if (key === 'ДатаКонца') meta.dateEnd = parseRuDate(value) ?? undefined
    if (key === 'НачальныйОстаток') meta.initialBalance = parseFloat(value) || 0
    if (key === 'КонечныйОстаток') meta.finalBalance = parseFloat(value) || 0
    if (key === 'ВсегоПоступило') meta.totalInflow = parseFloat(value) || 0
    if (key === 'ВсегоСписано') meta.totalOutflow = parseFloat(value) || 0

    if (key === 'СекцияДокумент') {
      currentDoc = {}
      continue
    }

    if (key === 'КонецДокумента' && currentDoc) {
      result.totalRows++
      const dateStr = currentDoc['Дата'] || ''
      const normalizedDate = parseRuDate(dateStr)
      const amountStr = currentDoc['Сумма'] || '0'
      const amount = parseFloat(amountStr.replace(',', '.'))
      const payer = currentDoc['Плательщик1'] || currentDoc['Плательщик'] || 'Не указан'
      const recipient = currentDoc['Получатель1'] || currentDoc['Получатель'] || 'Не указан'
      const description = currentDoc['НазначениеПлатежа'] || '—'

      if (!normalizedDate) {
        result.warnings.push(`Документ №${currentDoc['Номер'] || result.totalRows}: не распознана дата (${dateStr})`)
        currentDoc = null
        continue
      }

      if (isNaN(amount) || amount === 0) {
        result.warnings.push(`Документ №${currentDoc['Номер'] || result.totalRows}: некорректная сумма (${amountStr})`)
        currentDoc = null
        continue
      }

      // Check if recipient is our venue (then it is Income)
      let isIncome = false
      if (venueLower) {
        const recipClean = recipient.toLowerCase().replace(/[«»"']/g, '')
        if (recipClean.includes(venueLower)) {
          isIncome = true
        }
      }

      const txType = detectTransactionType(description, amount, isIncome)
      const counterparty = txType === 'income' ? payer : recipient
      const category = txType === 'income' ? 'other' : categorizeTransaction(counterparty, description)

      result.rows.push({
        date: normalizedDate,
        amount: Math.abs(amount),
        counterparty: counterparty.trim(),
        description: description.trim(),
        category,
        type: txType,
      })

      currentDoc = null
      continue
    }

    if (currentDoc) {
      currentDoc[key] = value
    }
  }

  result.meta = meta
  result.success = result.rows.length > 0
  return result
}

function parseRuDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m}-${d}`
  }
  const isoDate = new Date(dateStr)
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split('T')[0]
  }
  return null
}
