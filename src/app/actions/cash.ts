'use server'

import { getCashBalances, getCashBalanceRecord, upsertCashBalance, type CashBreakdown } from '@/lib/db/cash'

export async function getCashBalancesAction(venueId: string): Promise<Record<string, number>> {
  return getCashBalances(venueId)
}

export async function getCashBalanceDetailsAction(
  venueId: string,
  monthKey: string
): Promise<{
  amount: number
  bankBalance: number | null
  safeBalance: number | null
  shiftBalance: number | null
} | null> {
  const record = await getCashBalanceRecord(venueId, monthKey)
  if (!record) return null
  return {
    amount: record.amount,
    bankBalance: record.bankBalance,
    safeBalance: record.safeBalance,
    shiftBalance: record.shiftBalance,
  }
}

export async function setCashBalanceAction(
  venueId: string,
  monthKey: string,
  amount: number,
  breakdown?: CashBreakdown
): Promise<{ success: boolean; monthKey: string; amount: number; breakdown?: CashBreakdown }> {
  await upsertCashBalance(venueId, monthKey, amount, breakdown)
  return { success: true, monthKey, amount, breakdown }
}
