import { prisma } from '../db/client'
import { TBankClient } from './tbank-client'
import { TochkaClient } from './tochka-client'
import { categorizeTransaction, detectTransactionType } from '../categorizer'
import { runDeduplicationAction } from '@/app/actions/deduplication'
import type { BankSyncResult, BankConnector } from './types'

export async function syncBankConnection(
  connectionId: string,
  options?: { daysBack?: number }
): Promise<BankSyncResult> {
  const connection = await prisma.bankConnection.findUnique({
    where: { id: connectionId },
    include: { venue: true },
  })

  if (!connection) {
    return {
      success: false,
      connectionId,
      bankType: 'UNKNOWN',
      syncedCount: 0,
      newDuplicatesCount: 0,
      error: `Банковское подключение с ID ${connectionId} не найдено`,
    }
  }

  const daysBack = options?.daysBack ?? 7
  const now = new Date()
  const fromDate = new Date(now.getTime() - daysBack * 86400000)

  let client: BankConnector
  if (connection.bankType === 'TBANK') {
    client = new TBankClient({
      token: connection.token,
      accountNumber: connection.accountNumber || undefined,
      isSandbox: connection.isSandbox,
    })
  } else if (connection.bankType === 'TOCHKA') {
    client = new TochkaClient({
      token: connection.token,
      accountNumber: connection.accountNumber || undefined,
      isSandbox: connection.isSandbox,
    })
  } else {
    return {
      success: false,
      connectionId,
      bankType: connection.bankType,
      syncedCount: 0,
      newDuplicatesCount: 0,
      error: `Неподдерживаемый тип банка: ${connection.bankType}`,
    }
  }

  try {
    const rawOps = await client.getStatement({
      accountNumber: connection.accountNumber || undefined,
      dateFrom: fromDate.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    })

    let syncedCount = 0

    for (const op of rawOps) {
      const opDate = op.date instanceof Date ? op.date : new Date(op.date)
      // Check if already in DB
      // We check venueId, source='bank', date range (+- 1 day), amount and counterparty
      const startOfDay = new Date(opDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(opDate)
      endOfDay.setHours(23, 59, 59, 999)

      const existing = await prisma.transaction.findFirst({
        where: {
          venueId: connection.venueId,
          source: 'bank',
          amount: op.amount,
          type: op.type,
          counterparty: op.counterparty,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      if (!existing) {
        const category = categorizeTransaction(op.counterparty, op.paymentPurpose)
        const detectedType = detectTransactionType(op.paymentPurpose, op.amount, false)
        const finalType = op.type || detectedType

        await prisma.transaction.create({
          data: {
            venueId: connection.venueId,
            source: 'bank',
            date: opDate,
            amount: op.amount,
            type: finalType,
            category,
            counterparty: op.counterparty,
            description: op.paymentPurpose,
            status: 'unique',
          },
        })
        syncedCount++
      }
    }

    // Run auto-deduplication after bank statement ingestion
    let newDuplicatesCount = 0
    try {
      const pairs = await runDeduplicationAction(connection.venueId)
      newDuplicatesCount = pairs.length
    } catch (err) {
      console.warn('Bank sync auto-deduplication error:', err)
    }

    // Update connection status
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        status: 'connected',
        lastErrorMessage: null,
      },
    })

    return {
      success: true,
      connectionId,
      bankType: connection.bankType,
      syncedCount,
      newDuplicatesCount,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Ошибка забора выписки'
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        status: 'error',
        lastErrorMessage: errorMsg,
      },
    }).catch(() => {})

    return {
      success: false,
      connectionId,
      bankType: connection.bankType,
      syncedCount: 0,
      newDuplicatesCount: 0,
      error: errorMsg,
    }
  }
}

export async function syncAllActiveBankConnections(): Promise<{
  ok: boolean
  syncedConnections: number
  totalSyncedTransactions: number
  results: BankSyncResult[]
}> {
  const activeConnections = await prisma.bankConnection.findMany({
    where: {
      status: { not: 'disconnected' },
    },
  })

  let totalSynced = 0
  const results: BankSyncResult[] = []

  for (const conn of activeConnections) {
    const res = await syncBankConnection(conn.id)
    results.push(res)
    if (res.success) {
      totalSynced += res.syncedCount
    }
  }

  return {
    ok: true,
    syncedConnections: results.filter((r) => r.success).length,
    totalSyncedTransactions: totalSynced,
    results,
  }
}
