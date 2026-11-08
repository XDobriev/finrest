'use server'

import {
  getTransactions,
  getTransactionById,
  createTransaction,
  createTransactionsBatch,
  updateTransaction,
  deleteTransaction,
  type GetTransactionsFilter,
} from '@/lib/db/transactions'
import type { Transaction as PrismaTransaction } from '@prisma/client'
import type { Transaction, DataSource, ExpenseCategory, TransactionStatus } from '@/types'

function formatTransaction(tx: PrismaTransaction): Transaction {
  return {
    id: tx.id,
    venueId: tx.venueId,
    source: tx.source as DataSource,
    date: tx.date instanceof Date ? tx.date.toISOString().split('T')[0] : String(tx.date).split('T')[0],
    amount: tx.amount,
    type: tx.type as 'income' | 'expense',
    category: tx.category as ExpenseCategory,
    counterparty: tx.counterparty,
    description: tx.description,
    status: tx.status as TransactionStatus,
    duplicateOfId: tx.duplicateOfId ?? undefined,
    originalFileId: tx.originalFileId ?? undefined,
    createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt),
  }
}

export async function getTransactionsAction(
  venueId: string,
  filter?: GetTransactionsFilter
): Promise<Transaction[]> {
  const list = await getTransactions(venueId, filter)
  return list.map(formatTransaction)
}

export async function getTransactionByIdAction(id: string): Promise<Transaction | null> {
  const tx = await getTransactionById(id)
  return tx ? formatTransaction(tx) : null
}

export async function createTransactionAction(data: {
  venueId: string
  source: DataSource
  date: string
  amount: number
  type: 'income' | 'expense'
  category: ExpenseCategory
  counterparty: string
  description: string
  status?: TransactionStatus
  duplicateOfId?: string
  originalFileId?: string
}): Promise<Transaction> {
  const tx = await createTransaction({
    ...data,
    date: new Date(data.date),
  })
  return formatTransaction(tx)
}

export async function updateTransactionStatusAction(
  id: string,
  status: TransactionStatus,
  duplicateOfId?: string
): Promise<Transaction> {
  const tx = await updateTransaction(id, {
    status,
    duplicateOfId: duplicateOfId ?? null,
  })
  return formatTransaction(tx)
}

export async function deleteTransactionAction(id: string): Promise<{ success: boolean }> {
  await deleteTransaction(id)
  return { success: true }
}

export async function createTransactionsBatchAction(
  items: Array<{
    venueId: string
    source: DataSource
    date: string
    amount: number
    type: 'income' | 'expense'
    category: ExpenseCategory
    counterparty: string
    description: string
    status?: TransactionStatus
    duplicateOfId?: string
    originalFileId?: string
  }>
): Promise<{ success: boolean; count: number }> {
  const result = await createTransactionsBatch(items)
  return { success: true, count: result.count }
}
