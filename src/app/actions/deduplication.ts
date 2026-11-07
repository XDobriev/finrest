'use server'

import { prisma } from '@/lib/db/client'
import {
  getDeduplicationPairs,
  resolveDeduplicationPair,
} from '@/lib/db/transactions'
import { getVenueById } from '@/lib/db/venues'
import { findDuplicates } from '@/lib/deduplication/matcher'
import type {
  DeduplicationPair as PrismaDeduplicationPair,
  Transaction as PrismaTransaction,
} from '@prisma/client'
import type {
  DeduplicationPair,
  Transaction,
  DataSource,
  ExpenseCategory,
  TransactionStatus,
} from '@/types'

type PopulatedPair = PrismaDeduplicationPair & {
  leftTransaction: PrismaTransaction
  rightTransaction: PrismaTransaction
}

function formatPair(pair: PopulatedPair): DeduplicationPair {
  return {
    id: pair.id,
    venueId: pair.venueId,
    matchScore: pair.matchScore,
    matchReasons: pair.matchReasons,
    status: pair.status as 'pending' | 'merged' | 'skipped',
    resolvedAt: pair.resolvedAt ? pair.resolvedAt.toISOString() : undefined,
    leftTransaction: {
      id: pair.leftTransaction.id,
      venueId: pair.leftTransaction.venueId,
      source: pair.leftTransaction.source as DataSource,
      date:
        pair.leftTransaction.date instanceof Date
          ? pair.leftTransaction.date.toISOString().split('T')[0]
          : String(pair.leftTransaction.date).split('T')[0],
      amount: pair.leftTransaction.amount,
      type: pair.leftTransaction.type as 'income' | 'expense',
      category: pair.leftTransaction.category as ExpenseCategory,
      counterparty: pair.leftTransaction.counterparty,
      description: pair.leftTransaction.description,
      status: pair.leftTransaction.status as TransactionStatus,
      duplicateOfId: pair.leftTransaction.duplicateOfId ?? undefined,
      createdAt:
        pair.leftTransaction.createdAt instanceof Date
          ? pair.leftTransaction.createdAt.toISOString()
          : String(pair.leftTransaction.createdAt),
    },
    rightTransaction: {
      id: pair.rightTransaction.id,
      venueId: pair.rightTransaction.venueId,
      source: pair.rightTransaction.source as DataSource,
      date:
        pair.rightTransaction.date instanceof Date
          ? pair.rightTransaction.date.toISOString().split('T')[0]
          : String(pair.rightTransaction.date).split('T')[0],
      amount: pair.rightTransaction.amount,
      type: pair.rightTransaction.type as 'income' | 'expense',
      category: pair.rightTransaction.category as ExpenseCategory,
      counterparty: pair.rightTransaction.counterparty,
      description: pair.rightTransaction.description,
      status: pair.rightTransaction.status as TransactionStatus,
      duplicateOfId: pair.rightTransaction.duplicateOfId ?? undefined,
      createdAt:
        pair.rightTransaction.createdAt instanceof Date
          ? pair.rightTransaction.createdAt.toISOString()
          : String(pair.rightTransaction.createdAt),
    },
  }
}

export async function getDeduplicationPairsAction(
  venueId: string,
  status?: string
): Promise<DeduplicationPair[]> {
  const pairs = await getDeduplicationPairs(venueId, status)
  return pairs.map(formatPair)
}

export async function resolveDeduplicationPairAction(
  pairId: string,
  action: 'merge' | 'skip' | 'unmerge'
): Promise<{ success: boolean }> {
  await resolveDeduplicationPair(pairId, action)
  return { success: true }
}

export async function runDeduplicationAction(
  venueId: string
): Promise<DeduplicationPair[]> {
  const venue = await getVenueById(venueId)
  if (!venue) throw new Error(`Venue ${venueId} not found`)

  const rawTransactions = await prisma.transaction.findMany({
    where: { venueId },
    orderBy: { date: 'asc' },
  })

  const transactions: Transaction[] = rawTransactions.map((tx) => ({
    id: tx.id,
    venueId: tx.venueId,
    source: tx.source as DataSource,
    date:
      tx.date instanceof Date
        ? tx.date.toISOString().split('T')[0]
        : String(tx.date).split('T')[0],
    amount: tx.amount,
    type: tx.type as 'income' | 'expense',
    category: tx.category as ExpenseCategory,
    counterparty: tx.counterparty,
    description: tx.description,
    status: tx.status as TransactionStatus,
    duplicateOfId: tx.duplicateOfId ?? undefined,
    createdAt: tx.createdAt.toISOString(),
  }))

  const detected = findDuplicates(
    transactions,
    venueId,
    venue.deduplicationSettings
  )

  for (const pair of detected) {
    const existing = await prisma.deduplicationPair.findFirst({
      where: {
        venueId,
        leftTxId: pair.leftTransaction.id,
        rightTxId: pair.rightTransaction.id,
      },
    })

    if (!existing) {
      await prisma.deduplicationPair.create({
        data: {
          venueId,
          leftTxId: pair.leftTransaction.id,
          rightTxId: pair.rightTransaction.id,
          matchScore: pair.matchScore,
          matchReasons: pair.matchReasons,
          status: 'pending',
        },
      })
    }
  }

  return getDeduplicationPairsAction(venueId)
}
