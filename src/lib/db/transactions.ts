import { prisma } from './client'
import type { Transaction, DeduplicationPair, Prisma } from '@prisma/client'

export interface GetTransactionsFilter {
  from?: string
  to?: string
  status?: string
  source?: string
  type?: 'income' | 'expense'
  category?: string
}

export async function getTransactions(
  venueId: string,
  filter?: GetTransactionsFilter
): Promise<Transaction[]> {
  const where: Prisma.TransactionWhereInput = { venueId }

  if (filter?.status) {
    where.status = filter.status
  }

  if (filter?.source) {
    where.source = filter.source
  }

  if (filter?.type) {
    where.type = filter.type
  }

  if (filter?.category) {
    where.category = filter.category
  }

  if (filter?.from || filter?.to) {
    const dateFilter: Prisma.DateTimeFilter = {}
    if (filter.from) {
      dateFilter.gte = new Date(filter.from)
    }
    if (filter.to) {
      dateFilter.lte = new Date(filter.to)
    }
    where.date = dateFilter
  }

  return prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
  })
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  return prisma.transaction.findUnique({
    where: { id },
  })
}

export async function createTransaction(data: {
  venueId: string
  source: string
  date: Date | string
  amount: number
  type: string
  category: string
  counterparty: string
  description: string
  status?: string
  duplicateOfId?: string
  originalFileId?: string
}): Promise<Transaction> {
  return prisma.transaction.create({
    data: {
      venueId: data.venueId,
      source: data.source,
      date: typeof data.date === 'string' ? new Date(data.date) : data.date,
      amount: data.amount,
      type: data.type,
      category: data.category,
      counterparty: data.counterparty,
      description: data.description,
      status: data.status ?? 'unique',
      duplicateOfId: data.duplicateOfId,
      originalFileId: data.originalFileId,
    },
  })
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    amount: number
    category: string
    counterparty: string
    description: string
    status: string
    duplicateOfId?: string | null
  }>
): Promise<Transaction> {
  return prisma.transaction.update({
    where: { id },
    data,
  })
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({
    where: { id },
  })
}

// ================= Deduplication Pairs =================

export async function getDeduplicationPairs(
  venueId: string,
  status?: string
): Promise<(DeduplicationPair & { leftTransaction: Transaction; rightTransaction: Transaction })[]> {
  return prisma.deduplicationPair.findMany({
    where: {
      venueId,
      ...(status ? { status } : {}),
    },
    include: {
      leftTransaction: true,
      rightTransaction: true,
    },
    orderBy: { matchScore: 'desc' },
  })
}

export async function resolveDeduplicationPair(
  pairId: string,
  action: 'merge' | 'skip' | 'unmerge'
): Promise<DeduplicationPair> {
  const pair = await prisma.deduplicationPair.findUnique({
    where: { id: pairId },
    include: { leftTransaction: true, rightTransaction: true },
  })

  if (!pair) {
    throw new Error(`Deduplication pair ${pairId} not found`)
  }

  if (action === 'merge') {
    // Mark right transaction as duplicate of left
    await prisma.transaction.update({
      where: { id: pair.rightTxId },
      data: { status: 'duplicate', duplicateOfId: pair.leftTxId },
    })

    return prisma.deduplicationPair.update({
      where: { id: pairId },
      data: { status: 'merged', resolvedAt: new Date() },
    })
  }

  if (action === 'unmerge') {
    await prisma.transaction.update({
      where: { id: pair.rightTxId },
      data: { status: 'unique', duplicateOfId: null },
    })

    return prisma.deduplicationPair.update({
      where: { id: pairId },
      data: { status: 'pending', resolvedAt: null },
    })
  }

  // action === 'skip'
  return prisma.deduplicationPair.update({
    where: { id: pairId },
    data: { status: 'skipped', resolvedAt: new Date() },
  })
}
