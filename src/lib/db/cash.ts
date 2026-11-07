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

export async function upsertCashBalance(
  venueId: string,
  monthKey: string,
  amount: number
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
    },
    create: {
      venueId,
      monthKey,
      amount,
    },
  })
}
