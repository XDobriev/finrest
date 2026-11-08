import type { ExpenseCategory } from '@/types'

export type BankType = 'TBANK' | 'TOCHKA'

export interface BankStatementFilter {
  accountNumber?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string   // YYYY-MM-DD
}

export interface BankTransactionItem {
  externalId: string
  accountNumber: string
  date: Date
  amount: number
  type: 'income' | 'expense'
  counterparty: string
  counterpartyInn?: string
  counterpartyKpp?: string
  paymentPurpose: string
  category?: ExpenseCategory
}

export interface BankSyncResult {
  success: boolean
  connectionId: string
  bankType: string
  syncedCount: number
  newDuplicatesCount: number
  error?: string
}

export interface BankConnector {
  testConnection(): Promise<boolean>
  getStatement(filter?: BankStatementFilter): Promise<BankTransactionItem[]>
}
