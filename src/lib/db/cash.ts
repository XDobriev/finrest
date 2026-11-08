import { prisma } from './client'
import type { CashBalance } from '@prisma/client'

export async function getCashBalances(venueId: string): Promise<Record<string, number>> {
  const records = await prisma.cashBalance.findMany({
    where: { venueId },
  })

  const result: Record<string, number> = {}
  for (const record of records) {
    result[record.monthKey] = record.amount
  }
  return result
}

export interface CashBreakdown {
  bank?: number
  safe?: number
  shift?: number
}

export async function getCashBalance(venueId: string, monthKey: string): Promise<number> {
  const record = await prisma.cashBalance.findUnique({
    where: {
      venueId_monthKey: {
        venueId,
        monthKey,
      },
    },
  })
  return record?.amount ?? 0
}

export async function getCashBalanceRecord(venueId: string, monthKey: string): Promise<CashBalance | null> {
  return prisma.cashBalance.findUnique({
    where: {
      venueId_monthKey: {
        venueId,
        monthKey,
      },
    },
  })
}

export async function upsertCashBalance(
  venueId: string,
  monthKey: string,
  amount: number,
  breakdown?: CashBreakdown
): Promise<CashBalance> {
  return prisma.cashBalance.upsert({
    where: {
      venueId_monthKey: {
        venueId,
        monthKey,
      },
    },
    update: {
      amount,
      ...(breakdown?.bank !== undefined ? { bankBalance: breakdown.bank } : {}),
      ...(breakdown?.safe !== undefined ? { safeBalance: breakdown.safe } : {}),
      ...(breakdown?.shift !== undefined ? { shiftBalance: breakdown.shift } : {}),
    },
    create: {
      venueId,
      monthKey,
      amount,
      bankBalance: breakdown?.bank ?? null,
      safeBalance: breakdown?.safe ?? null,
      shiftBalance: breakdown?.shift ?? null,
    },
  })
}
